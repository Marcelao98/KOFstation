//! Medidor quadro a quadro (M16.1, docs/DIAGNOSTICO.md): um registro por quadro num histórico circular fixo (600
//! quadros = 10 s a 60 fps, nada alocado por quadro). A cada segundo o laço tira os quadros novos no formato que viaja
//! no aviso `desempenho` (`porQuadro`, o mesmo do `packages/domain/src/desempenho.ts`): 6 números por quadro, em µs,
//! `[t, núcleo, leitura, envio, som na fila, faltas]`.
use std::time::{Duration, Instant};

pub const HISTORICO: usize = 600;
pub const CAMPOS: usize = 6;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Registro {
    /// quando o quadro terminou, desde o começo do medidor (µs)
    pub t: u64,
    /// o núcleo rodando o quadro, com a leitura da placa
    pub nucleo: u32,
    /// a parte do núcleo lendo a imagem da placa de vídeo
    pub leitura: u32,
    /// preparar e mandar a imagem pra página (só no quadro que foi mandado)
    pub envio: u32,
    pub som_fila: u32,
    /// vezes que o som acabou desde o quadro anterior
    pub faltas: u32,
}

pub struct Medidor {
    inicio: Instant,
    hist: [Registro; HISTORICO],
    /// quadros já anotados (o próximo vai em `total % HISTORICO`)
    total: u64,
    /// `total` quando o último bloco saiu
    entregues: u64,
    faltas_antes: u64,
}

impl Default for Medidor {
    fn default() -> Self {
        Self::new()
    }
}

fn us(d: Duration) -> u32 {
    d.as_micros().min(u32::MAX as u128) as u32
}

impl Medidor {
    pub fn new() -> Self {
        Medidor {
            inicio: Instant::now(),
            hist: [Registro::default(); HISTORICO],
            total: 0,
            entregues: 0,
            faltas_antes: 0,
        }
    }

    /// Um quadro rodou: quanto o núcleo levou (e, dentro disso, a leitura da placa), o som guardado agora e o total de
    /// faltas de som da saída (o medidor guarda a diferença).
    pub fn quadro(&mut self, nucleo: Duration, leitura_us: u64, som_fila_ms: f64, faltas_total: u64) {
        let faltas = faltas_total.saturating_sub(self.faltas_antes);
        self.faltas_antes = faltas_total;
        let i = (self.total % HISTORICO as u64) as usize;
        self.hist[i] = Registro {
            t: self.inicio.elapsed().as_micros() as u64,
            nucleo: us(nucleo),
            leitura: leitura_us.min(u32::MAX as u64) as u32,
            envio: 0,
            som_fila: (som_fila_ms.max(0.0) * 1000.0).min(u32::MAX as f64) as u32,
            faltas: faltas.min(u32::MAX as u64) as u32,
        };
        self.total += 1;
    }

    /// A imagem do último quadro foi mandada pra página e levou `d` (pelo menos 1 µs: 0 quer dizer "não mandou").
    pub fn envio(&mut self, d: Duration) {
        if self.total == 0 {
            return;
        }
        let i = ((self.total - 1) % HISTORICO as u64) as usize;
        self.hist[i].envio = us(d).max(1);
    }

    /// Os quadros desde o último bloco, do mais velho pro mais novo (no máximo o histórico inteiro: se ficou mais de
    /// 10 s sem pedir, os mais velhos já saíram).
    pub fn novos(&self) -> impl Iterator<Item = &Registro> {
        let n = (self.total - self.entregues).min(HISTORICO as u64);
        (self.total - n..self.total).map(move |k| &self.hist[(k % HISTORICO as u64) as usize])
    }

    /// O bloco do segundo no formato que viaja; marca os quadros como entregues. Aloca uma vez por segundo.
    pub fn bloco(&mut self) -> Vec<u64> {
        let mut v = Vec::with_capacity(((self.total - self.entregues).min(HISTORICO as u64) as usize) * CAMPOS);
        for r in self.novos() {
            v.extend_from_slice(&[
                r.t,
                r.nucleo as u64,
                r.leitura as u64,
                r.envio as u64,
                r.som_fila as u64,
                r.faltas as u64,
            ]);
        }
        self.entregues = self.total;
        v
    }

    /// Os últimos quadros (até 600), do mais velho pro mais novo.
    pub fn historico(&self) -> impl Iterator<Item = &Registro> {
        let n = self.total.min(HISTORICO as u64);
        (self.total - n..self.total).map(move |k| &self.hist[(k % HISTORICO as u64) as usize])
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn anota_e_entrega_por_bloco() {
        let mut m = Medidor::new();
        m.quadro(Duration::from_micros(8000), 1000, 60.0, 0);
        m.quadro(Duration::from_micros(9000), 0, 59.5, 2);
        m.envio(Duration::from_micros(500));
        let b = m.bloco();
        assert_eq!(b.len(), 2 * CAMPOS);
        assert_eq!(&b[1..6], &[8000, 1000, 0, 60000, 0]);
        assert_eq!(&b[7..12], &[9000, 0, 500, 59500, 2]);
        assert!(b[6] >= b[0], "o tempo anda pra frente");
        assert!(m.bloco().is_empty(), "o bloco seguinte só tem quadros novos");
        m.quadro(Duration::from_micros(1), 0, 0.0, 2);
        let b = m.bloco();
        assert_eq!(b[5], 0, "faltas é a diferença, não o total");
        m.envio(Duration::ZERO);
        assert_eq!(
            m.historico().last().map(|r| r.envio),
            Some(1),
            "envio mínimo 1 µs: 0 = não mandou"
        );
    }

    #[test]
    fn historico_circular_guarda_os_ultimos_600() {
        let mut m = Medidor::new();
        for i in 0..1000u64 {
            m.quadro(Duration::from_micros(i), 0, 0.0, 0);
        }
        let h: Vec<u32> = m.historico().map(|r| r.nucleo).collect();
        assert_eq!(h.len(), HISTORICO);
        assert_eq!(h[0], 400);
        assert_eq!(h[HISTORICO - 1], 999);
        assert_eq!(
            m.bloco().len(),
            HISTORICO * CAMPOS,
            "mais de 10 s sem pedir: só os últimos 600"
        );
    }
}
