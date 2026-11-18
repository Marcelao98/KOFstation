//! Rebobinar nos núcleos nativos (fase R): o mesmo do `packages/engine/src/rebobinador.ts` + `som-rebob.ts`, mas
//! **dentro do processo do jogo** (o estado de alguns MB nunca passa pela página). A página só manda "segura"/"solta" e
//! as regras do modo; o filho continua mandando os quadros como sempre e avisa a situação (`Aviso::Rebob`).
//!
//! - `Rebobinador`: guarda o estado mais novo inteiro e, de cada foto, só os pedaços de 16 KB que mudaram (o valor de
//!   antes). Voltar = desfazer a foto de cima e carregar a cabeça.
//! - `SomDoRebobinar`: o som que saiu, um trecho por foto; voltando, cada trecho toca invertido, a 2×, com fade de
//!   entrada e o filtro de "fita"; ao soltar, crossfade com o som normal (idêntico depois dele).
//! - `som`: as contas puras, iguais às do `packages/domain/src/som-rebobinar.ts` (mesmos vetores de teste:
//!   `packages/contracts/fixtures/som-rebobinar.json`).
//! - `Voltar`: as regras (limite, recarga, segurar e soltar), igual ao `rb` do `worker.ts`.
use std::collections::VecDeque;

/// As contas do som (packages/domain/src/som-rebobinar.ts, linha por linha). Estéreo intercalado em f32 (-1..1).
pub mod som {
    pub const ENTRADA_MS: f64 = 80.0;
    pub const SAIDA_MS: f64 = 80.0;
    pub const FITA_HZ: f64 = 3500.0;
    pub const VELOCIDADE: usize = 2;

    pub fn quadros_em(ms: f64, taxa: f64) -> usize {
        ((ms * taxa / 1000.0).round() as usize).max(1)
    }

    pub fn inverter(e: &[f32]) -> Vec<f32> {
        let n = e.len() / 2;
        let mut r = vec![0.0; n * 2];
        for i in 0..n {
            let j = n - 1 - i;
            r[i * 2] = e[j * 2];
            r[i * 2 + 1] = e[j * 2 + 1];
        }
        r
    }

    /// Acelera por um fator inteiro (média de cada janela) ou fracionário (interpolação linear).
    pub fn acelerar(e: &[f32], fator: f64) -> Vec<f32> {
        let n = e.len() / 2;
        if fator <= 1.0 || n == 0 {
            return e.to_vec();
        }
        let m = (n as f64 / fator).floor() as usize;
        let mut r = vec![0.0f32; m * 2];
        if fator.fract() == 0.0 {
            let f = fator as usize;
            for i in 0..m {
                let (mut a, mut b) = (0.0f64, 0.0f64);
                for k in 0..f {
                    a += e[(i * f + k) * 2] as f64;
                    b += e[(i * f + k) * 2 + 1] as f64;
                }
                r[i * 2] = (a / f as f64) as f32;
                r[i * 2 + 1] = (b / f as f64) as f32;
            }
            return r;
        }
        for i in 0..m {
            let p = i as f64 * fator;
            let a = p.floor() as usize;
            let f = (p - a as f64) as f32;
            let b = (a + 1).min(n - 1);
            for c in 0..2 {
                let x0 = e[a * 2 + c];
                let x1 = e[b * 2 + c];
                r[i * 2 + c] = x0 + (x1 - x0) * f;
            }
        }
        r
    }

    pub fn ganho_entrada(i: usize, total: usize) -> f64 {
        if i >= total {
            1.0
        } else if i == 0 {
            0.0
        } else {
            0.5 - 0.5 * (std::f64::consts::PI * i as f64 / total as f64).cos()
        }
    }

    pub fn aplicar_entrada(e: &mut [f32], inicio: usize, total: usize) {
        let n = e.len() / 2;
        for i in 0..n {
            if inicio + i >= total {
                break;
            }
            let g = ganho_entrada(inicio + i, total) as f32;
            e[i * 2] *= g;
            e[i * 2 + 1] *= g;
        }
    }

    pub fn coef_fita(hz: f64, taxa: f64) -> f64 {
        1.0 - (-2.0 * std::f64::consts::PI * hz / taxa).exp()
    }

    /// Passa-baixa de um polo, no lugar; `memoria` continua de um trecho pro outro.
    pub fn filtrar_fita(e: &mut [f32], a: f64, memoria: &mut [f64; 2]) {
        let [mut l, mut r] = *memoria;
        for q in e.chunks_exact_mut(2) {
            l += a * (q[0] as f64 - l);
            r += a * (q[1] as f64 - r);
            q[0] = l as f32;
            q[1] = r as f32;
        }
        *memoria = [l, r];
    }

    pub fn ganhos_cruzados(i: usize, total: usize) -> (f64, f64) {
        let t = if i >= total { 1.0 } else { i as f64 / total as f64 };
        let x = std::f64::consts::FRAC_PI_2 * t;
        (x.cos(), x.sin())
    }

    /// Crossfade no lugar: `novo` recebe por cima o `velho` sumindo; depois de `total`, `novo` fica intocado.
    pub fn cruzar(novo: &mut [f32], velho: &[f32], inicio: usize, total: usize) {
        let n = novo.len() / 2;
        for i in 0..n {
            let k = inicio + i;
            if k >= total {
                break;
            }
            let (gv, gn) = ganhos_cruzados(k, total);
            for c in 0..2 {
                let v = velho.get(k * 2 + c).copied().unwrap_or(0.0) as f64;
                novo[i * 2 + c] = (novo[i * 2 + c] as f64 * gn + v * gv) as f32;
            }
        }
    }

    /// Como `trechoPraTras` do TypeScript: inverter → acelerar → fita (sem o fade).
    pub fn trecho_pra_tras(som_da_foto: &[f32], a: f64, memoria: &mut [f64; 2], velocidade: f64) -> Vec<f32> {
        let mut r = acelerar(&inverter(som_da_foto), velocidade);
        filtrar_fita(&mut r, a, memoria);
        r
    }
}

const PEDACO: usize = 16 * 1024;

struct Foto {
    pedacos: Vec<(usize, Box<[u8]>)>,
    tam: usize,
}

/// As fotos do estado (o `rebobinador.ts`, em bytes).
pub struct Rebobinador {
    cabeca: Vec<u8>,
    fotos: VecDeque<Foto>,
    bytes: usize,
    limite_bytes: usize,
    max_fotos: usize,
}

impl Rebobinador {
    pub fn new(limite_bytes: usize, max_fotos: usize) -> Self {
        Rebobinador {
            cabeca: Vec::new(),
            fotos: VecDeque::new(),
            bytes: 0,
            limite_bytes,
            max_fotos,
        }
    }

    pub fn quantas(&self) -> usize {
        self.fotos.len()
    }

    pub fn ocupado(&self) -> usize {
        self.bytes
    }

    /// Grava a foto do `estado`; true = entrou uma foto (a 1ª só vira a cabeça).
    pub fn gravar(&mut self, estado: &[u8]) -> bool {
        if self.cabeca.len() != estado.len() {
            self.cabeca.clear();
            self.cabeca.extend_from_slice(estado);
            self.fotos.clear();
            self.bytes = 0;
            return false;
        }
        let mut pedacos = Vec::new();
        let mut tam = 0;
        for (i, (h, w)) in self.cabeca.chunks_mut(PEDACO).zip(estado.chunks(PEDACO)).enumerate() {
            if h != w {
                pedacos.push((i * PEDACO, Box::<[u8]>::from(&*h)));
                h.copy_from_slice(w);
                tam += h.len() + 16;
            }
        }
        self.fotos.push_back(Foto { pedacos, tam });
        self.bytes += tam;
        while (self.bytes > self.limite_bytes || self.fotos.len() > self.max_fotos.max(1)) && self.fotos.len() > 1 {
            if let Some(f) = self.fotos.pop_front() {
                self.bytes -= f.tam;
            }
        }
        true
    }

    /// Desfaz a foto de cima. Devolve o estado pra carregar e se ainda tinha foto (false = já é a mais velha).
    pub fn voltar(&mut self) -> Option<(&[u8], bool)> {
        if self.cabeca.is_empty() {
            return None;
        }
        let tinha = match self.fotos.pop_back() {
            Some(f) => {
                for (ini, p) in f.pedacos {
                    self.cabeca[ini..ini + p.len()].copy_from_slice(&p);
                }
                self.bytes -= f.tam;
                true
            }
            None => false,
        };
        Some((&self.cabeca, tinha))
    }

    pub fn limpar(&mut self) {
        self.cabeca.clear();
        self.fotos.clear();
        self.bytes = 0;
    }
}

/// Som ao rebobinar: 📼 fita (ao contrário) ou 🔇 mudo.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModoDoSom {
    Fita,
    Mudo,
}

impl ModoDoSom {
    pub fn de(texto: &str) -> Self {
        if texto == "mudo" {
            ModoDoSom::Mudo
        } else {
            ModoDoSom::Fita
        }
    }
}

/// O som que volta junto (o `som-rebob.ts` da engine). Trabalha na taxa do núcleo, em f32.
pub struct SomDoRebobinar {
    pub modo: ModoDoSom,
    pendente: Vec<f32>,
    pilha: VecDeque<Vec<f32>>,
    memoria: [f64; 2],
    ultimo: [f32; 2],
    entrada: usize,
    voltando: bool,
    cauda: Option<Vec<f32>>,
    cauda_pos: usize,
    a: f64,
    entrada_total: usize,
    saida_total: usize,
}

fn para_f32(s: &[i16]) -> Vec<f32> {
    s.iter().map(|&x| x as f32 / 32768.0).collect()
}

fn para_i16(s: &[f32], destino: &mut Vec<i16>) {
    destino.clear();
    destino.extend(s.iter().map(|&x| (x * 32768.0).round().clamp(-32768.0, 32767.0) as i16));
}

impl SomDoRebobinar {
    pub fn new(taxa: f64) -> Self {
        let taxa = if taxa > 0.0 { taxa } else { 44100.0 };
        SomDoRebobinar {
            modo: ModoDoSom::Fita,
            pendente: Vec::new(),
            pilha: VecDeque::new(),
            memoria: [0.0; 2],
            ultimo: [0.0; 2],
            entrada: 0,
            voltando: false,
            cauda: None,
            cauda_pos: 0,
            a: som::coef_fita(som::FITA_HZ, taxa),
            entrada_total: som::quadros_em(som::ENTRADA_MS, taxa),
            saida_total: som::quadros_em(som::SAIDA_MS, taxa),
        }
    }

    pub fn trechos(&self) -> usize {
        self.pilha.len()
    }

    /// O som normal do quadro (i16 do núcleo): faz o crossfade no lugar, se acabou de soltar, e guarda quando `guardar`.
    pub fn saiu(&mut self, s: &mut Vec<i16>, guardar: bool) {
        let n = s.len() / 2;
        if n == 0 {
            return;
        }
        if let Some(c) = &self.cauda {
            let mut f = para_f32(s);
            som::cruzar(&mut f, c, self.cauda_pos, self.saida_total);
            self.cauda_pos += n;
            if self.cauda_pos >= self.saida_total {
                self.cauda = None;
            }
            para_i16(&f, s);
        }
        self.ultimo = [s[(n - 1) * 2] as f32 / 32768.0, s[(n - 1) * 2 + 1] as f32 / 32768.0];
        if guardar && self.modo == ModoDoSom::Fita {
            self.pendente.extend(s.iter().map(|&x| x as f32 / 32768.0));
        }
    }

    pub fn foto_gravada(&mut self, quantas: usize) {
        self.pilha.push_back(std::mem::take(&mut self.pendente));
        while self.pilha.len() > quantas {
            self.pilha.pop_front();
        }
    }

    /// Uma foto voltou: escreve em `destino` o som que toca agora (vazio = mudo).
    pub fn passo(&mut self, destino: &mut Vec<i16>) {
        destino.clear();
        let t = self.pilha.pop_back();
        if self.modo == ModoDoSom::Mudo {
            self.pendente.clear();
            return;
        }
        let mut seg = t.unwrap_or_default();
        if !self.voltando {
            seg.append(&mut self.pendente);
            self.memoria = [self.ultimo[0] as f64, self.ultimo[1] as f64];
            self.entrada = 0;
            self.voltando = true;
            self.cauda = None;
        }
        let mut memoria = self.memoria;
        let r = self.tratar(&seg, &mut memoria);
        self.memoria = memoria;
        if r.len() >= 2 {
            self.ultimo = [r[r.len() - 2], r[r.len() - 1]];
        }
        para_i16(&r, destino);
    }

    pub fn soltar(&mut self) {
        if !self.voltando {
            return;
        }
        self.voltando = false;
        if self.modo == ModoDoSom::Mudo {
            return;
        }
        let precisa = self.saida_total * som::VELOCIDADE;
        let mut partes = Vec::new();
        let mut tem = 0;
        for p in self.pilha.iter().rev() {
            if tem >= precisa {
                break;
            }
            partes.push(p);
            tem += p.len() / 2;
        }
        let mut junto = Vec::with_capacity(tem * 2);
        for p in partes.into_iter().rev() {
            junto.extend_from_slice(p);
        }
        let mut memoria = self.memoria;
        self.cauda = Some(self.tratar(&junto, &mut memoria));
        self.cauda_pos = 0;
    }

    pub fn limpar(&mut self) {
        self.pendente.clear();
        self.pilha.clear();
    }

    fn tratar(&mut self, seg: &[f32], memoria: &mut [f64; 2]) -> Vec<f32> {
        let mut r = som::acelerar(&som::inverter(seg), som::VELOCIDADE as f64);
        som::aplicar_entrada(&mut r, self.entrada, self.entrada_total);
        self.entrada += r.len() / 2;
        som::filtrar_fita(&mut r, self.a, memoria);
        r
    }
}

/// Como está o rebobinar (o `SituacaoRebob` da página).
#[derive(Clone, Debug, PartialEq)]
pub struct Situacao {
    pub ligado: bool,
    pub rebobinando: bool,
    pub segundos: f64,
    pub limite: u32,
    pub recarga: u32,
    pub recarga_total: u32,
}

/// As regras e o estado do voltar no tempo (o `rb` do worker.ts).
pub struct Voltar {
    pub ligado: bool,
    pub limite: u32,
    pub recarga_x: u32,
    /// fotos a cada quantos quadros
    pub cada: u32,
    /// limite de memória das fotos
    pub limite_bytes: usize,
    pub querendo: bool,
    pub r: Option<Rebobinador>,
    pub som: SomDoRebobinar,
    rebobinou: u32,
    recarga: u32,
    recarga_total: u32,
    desde_foto: u32,
    avisado: Option<(bool, bool, u64, u32)>,
    /// o estado é salvo aqui (sem alocar a cada foto)
    pub buf: Vec<u8>,
}

impl Voltar {
    pub fn new(taxa: f64, limite_bytes: usize) -> Self {
        Voltar {
            ligado: false,
            limite: 0,
            recarga_x: 0,
            cada: 2,
            limite_bytes,
            querendo: false,
            r: None,
            som: SomDoRebobinar::new(taxa),
            rebobinou: 0,
            recarga: 0,
            recarga_total: 1,
            desde_foto: 0,
            avisado: None,
            buf: Vec::new(),
        }
    }

    /// Fotos por segundo de jogo (60 / `cada`).
    fn por_segundo(&self) -> f64 {
        60.0 / self.cada.max(1) as f64
    }

    /// Regras novas (do modo de jogo). Só o som mudou: o que está guardado continua.
    pub fn configurar(&mut self, ligado: bool, limite: u32, recarga_x: u32, som: ModoDoSom) {
        let mesmo = self.ligado == ligado && self.limite == limite && self.recarga_x == recarga_x;
        self.ligado = ligado;
        self.limite = limite;
        self.recarga_x = recarga_x;
        self.som.modo = som;
        if !mesmo {
            self.zerar();
        }
    }

    /// Recomeçou (estado carregado, reinício, regras novas).
    pub fn zerar(&mut self) {
        let max = (self.limite as f64 * self.por_segundo()).round() as usize;
        self.r = (self.ligado && self.limite > 0).then(|| Rebobinador::new(self.limite_bytes, max));
        self.desde_foto = 0;
        self.recarga = 0;
        self.rebobinou = 0;
        self.som.limpar();
        self.avisado = None;
    }

    /// Dá pra voltar agora? (segurando, ligado, sem recarga e com foto; ou já voltando)
    pub fn quer_voltar(&self) -> bool {
        self.querendo
            && self
                .r
                .as_ref()
                .is_some_and(|r| self.rebobinou > 0 || (self.recarga == 0 && r.quantas() > 0))
    }

    pub fn rebobinando(&self) -> bool {
        self.rebobinou > 0
    }

    pub fn guardando(&self) -> bool {
        self.r.is_some()
    }

    /// Depois de `vezes` quadros normais: hora da foto? (quem chama salva o estado em `buf` e chama `gravar`)
    pub fn hora_da_foto(&mut self, vezes: u32) -> bool {
        self.desde_foto += vezes;
        if self.recarga > 0 {
            self.recarga = self.recarga.saturating_sub(vezes);
        }
        self.r.is_some() && self.desde_foto >= self.cada
    }

    /// Grava o estado que está em `buf`.
    pub fn gravar(&mut self) {
        self.desde_foto = 0;
        let Some(r) = self.r.as_mut() else { return };
        if r.gravar(&self.buf) || r.quantas() == 0 {
            self.som.foto_gravada(r.quantas());
        }
    }

    /// Uma foto pra trás: devolve o estado a carregar (None = acabou o tempo).
    pub fn voltar(&mut self) -> Option<&[u8]> {
        let r = self.r.as_mut()?;
        let (estado, tinha) = r.voltar()?;
        if !tinha {
            return None;
        }
        self.rebobinou += 1;
        Some(estado)
    }

    /// Soltou (ou acabou o tempo).
    pub fn terminar(&mut self) {
        self.som.soltar();
        if self.rebobinou > 0 && self.recarga_x > 0 {
            if let Some(r) = self.r.as_mut() {
                r.limpar(); // usou: zera e recarrega (Só alegria: continua)
            }
            self.som.limpar();
            self.recarga = self.limite * self.recarga_x * 60;
            self.recarga_total = self.recarga;
        }
        self.rebobinou = 0;
        self.desde_foto = 0;
    }

    pub fn situacao(&self) -> Situacao {
        let quantas = self.r.as_ref().map_or(0, |r| r.quantas());
        Situacao {
            ligado: self.r.is_some(),
            rebobinando: self.rebobinou > 0,
            segundos: (quantas as f64 / self.por_segundo() * 10.0).round() / 10.0,
            limite: self.limite,
            recarga: self.recarga,
            recarga_total: self.recarga_total.max(1),
        }
    }

    /// A situação, só quando mudou o que a página mostra (como o `avisarRebob` do worker).
    pub fn mudou(&mut self) -> Option<Situacao> {
        let s = self.situacao();
        let chave = (
            s.ligado,
            s.rebobinando,
            if s.rebobinando { (s.segundos * 10.0) as u64 } else { 0 },
            s.recarga.div_ceil(60),
        );
        if self.avisado == Some(chave) {
            return None;
        }
        self.avisado = Some(chave);
        Some(s)
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn rebobinador_volta_os_estados_na_ordem() {
        let mut r = Rebobinador::new(1 << 20, 100);
        let estado = |k: u8| {
            let mut v = vec![0u8; PEDACO * 3 + 100];
            v[5] = k;
            v[PEDACO * 2 + 7] = k.wrapping_mul(3);
            v
        };
        assert!(!r.gravar(&estado(0)));
        for k in 1..=5 {
            assert!(r.gravar(&estado(k)));
        }
        assert_eq!(r.quantas(), 5);
        for k in (0..5).rev() {
            let (e, tinha) = r.voltar().unwrap();
            assert!(tinha);
            assert_eq!(e, &estado(k)[..]);
        }
        let (_, tinha) = r.voltar().unwrap();
        assert!(!tinha);
    }

    #[test]
    fn rebobinador_respeita_o_limite_de_fotos() {
        let mut r = Rebobinador::new(1 << 20, 3);
        let mut v = vec![0u8; 100];
        for k in 0..10 {
            v[0] = k;
            r.gravar(&v);
        }
        assert_eq!(r.quantas(), 3);
    }

    #[test]
    fn soltar_e_depois_do_crossfade_o_som_e_o_normal() {
        let mut s = SomDoRebobinar::new(48000.0);
        let quadro = |k: usize| -> Vec<i16> {
            (0..1600)
                .map(|i| (((k * 800 + i / 2) as f32 * 0.05).sin() * 9000.0) as i16)
                .collect()
        };
        for k in 0..40 {
            let mut q = quadro(k);
            s.saiu(&mut q, true);
            if k % 2 == 1 {
                s.foto_gravada(k / 2 + 1);
            }
        }
        let mut out = Vec::new();
        for _ in 0..5 {
            s.passo(&mut out);
            assert_eq!(out.len(), 1600, "2 quadros a 2× = 1 quadro de som");
        }
        assert!(out.iter().any(|&x| x.abs() > 500), "voltando sai som");
        s.soltar();
        let total = som::quadros_em(som::SAIDA_MS, 48000.0).div_ceil(800);
        for k in 0..total + 2 {
            let normal = quadro(1000 + k);
            let mut q = normal.clone();
            s.saiu(&mut q, true);
            if k >= total {
                assert_eq!(q, normal);
            }
        }
    }
}
