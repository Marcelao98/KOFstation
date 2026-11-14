//! O processo filho: lê a configuração (uma linha JSON no stdin), abre o núcleo e a WebSocket, responde uma linha JSON
//! no stdout (`{"porta":…}` ou `{"erro":…}`) e roda o laço até a página mandar fechar, o núcleo pedir ou o stdin fechar
//! (o pai morreu). Logs vão pro stderr: o supervisor guarda as últimas linhas (o caçador de bugs manda junto).
use crate::canal::{Canal, Pedido};
use crate::nucleo::{Abertura, Nucleo};
use crate::protocolo::{self, Aviso, Comando};
use crate::som::{Placa, Relogio, Saida};
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{BufRead, Write};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};

/// O que o supervisor manda pro filho.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub nucleo: PathBuf,
    #[serde(default)]
    pub jogo: Option<PathBuf>,
    pub sistema: PathBuf,
    pub saves: PathBuf,
    pub token: String,
    /// origem da página (`http://127.0.0.1:<porta do app>`)
    #[serde(default)]
    pub origem: Option<String>,
    #[serde(default)]
    pub variaveis: BTreeMap<String, String>,
    /// sem placa de som (testes): o relógio do sistema dita o ritmo
    #[serde(default)]
    pub sem_som: bool,
    #[serde(default)]
    pub dispositivo: Option<u32>,
}

/// Som guardado que o laço mantém. O ritmo é o do relógio (um quadro a cada 1/fps, como o `kofnativo.c` do antigo):
/// o som só ajusta o relógio de leve pra a fila ficar perto disto, e enche até aqui no começo e depois de faltar.
const ALVO_MS: f64 = 60.0;
/// Acima disto o laço espera a placa tocar (o antigo esperava em 120 ms).
const SOM_MAXIMO_MS: f64 = 120.0;
/// Quanto o relógio dos quadros pode correr/atrasar pra segurar a fila de som (0,5%: ninguém percebe).
const AJUSTE_DO_RELOGIO: f64 = 0.005;

/// Só pros testes (`sem_som` + `KOF_NATIVO_SOM_BLOCO_MS`): um relógio que só "enxerga" o consumo a cada bloco de tempo,
/// como a placa de som de verdade (ela consome em blocos). Aí o laço roda 2–3 quadros de uma vez, igual no uso real.
struct EmBlocos {
    por_dentro: Relogio,
    bloco: Duration,
    visto: std::cell::Cell<(Instant, f64)>,
}

impl Saida for EmBlocos {
    fn taxa(&self) -> u32 {
        self.por_dentro.taxa()
    }
    fn tocar(&mut self, amostras: &[i16], taxa_nucleo: f64) {
        self.por_dentro.tocar(amostras, taxa_nucleo);
        let (t, g) = self.visto.get();
        self.visto
            .set((t, g + (amostras.len() / 2) as f64 * 1000.0 / taxa_nucleo.max(1.0)));
    }
    fn guardado_ms(&self) -> f64 {
        let (t, _) = self.visto.get();
        if t.elapsed() >= self.bloco {
            self.visto.set((Instant::now(), self.por_dentro.guardado_ms()));
        }
        self.visto.get().1
    }
    fn faltas(&self) -> u64 {
        self.por_dentro.faltas()
    }
    fn volume(&mut self, v: f32) {
        self.por_dentro.volume(v);
    }
    fn pausar(&mut self, pausado: bool) {
        self.por_dentro.pausar(pausado);
    }
}

fn responder(v: serde_json::Value) {
    let mut o = std::io::stdout().lock();
    // sem stdout o pai já foi embora; o laço termina sozinho quando o stdin fechar
    let _ = writeln!(o, "{v}");
    let _ = o.flush();
}

fn falhar(e: &KofError) -> i32 {
    tracing::error!(codigo = e.codigo(), "{e}");
    responder(serde_json::json!({"erro": {"codigo": e.codigo(), "mensagem": e.to_string()}}));
    2
}

/// No Windows o `sleep` anda de ~15 em ~15 ms por padrão (o laço dorme até o próximo quadro): pede 1 ms, como o SDL
/// do antigo faz. Vale só pra este processo e acaba com ele.
#[cfg(windows)]
#[allow(unsafe_code)]
fn relogio_fino() {
    // SAFETY: chamada sem ponteiros; o par timeEndPeriod não é preciso (o processo termina junto)
    unsafe {
        windows_sys::Win32::Media::timeBeginPeriod(1);
    }
}
#[cfg(not(windows))]
fn relogio_fino() {}

/// Ponto de entrada do processo filho (o `kof-nativo` e o `kofstation --nativo`). Devolve o código de saída.
pub fn rodar() -> i32 {
    relogio_fino();
    let _ = tracing_subscriber::fmt() // já tem um (testes no mesmo processo): usa aquele
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .without_time()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("KOF_NATIVO_LOG")
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .try_init();
    let mut linha = String::new();
    let stdin = std::io::stdin();
    if let Err(e) = stdin.lock().read_line(&mut linha) {
        return falhar(&KofError::argumento("config", e.to_string()));
    }
    let cfg: Config = match serde_json::from_str(&linha) {
        Ok(c) => c,
        Err(e) => return falhar(&KofError::argumento("config", e.to_string())),
    };
    let (tx, rx) = mpsc::channel();
    // stdin fechado = o pai foi embora: fecha junto
    let tx_stdin = tx.clone();
    std::thread::spawn(move || {
        let mut resto = String::new();
        loop {
            resto.clear();
            match std::io::stdin().lock().read_line(&mut resto) {
                Ok(0) | Err(_) => break,
                Ok(_) => {}
            }
        }
        let _ = tx_stdin.send(Pedido::AppFechou); // o laço pode já ter acabado
    });
    let canal = match Canal::abrir(cfg.token.clone(), cfg.origem.clone(), tx) {
        Ok(c) => c,
        Err(e) => return falhar(&KofError::Nucleo(format!("não abri a porta local: {e}"))),
    };
    let abertura = Abertura {
        nucleo: cfg.nucleo.clone(),
        jogo: cfg.jogo.clone(),
        sistema: cfg.sistema.clone(),
        saves: cfg.saves.clone(),
        variaveis: cfg.variaveis.clone(),
        dispositivo: cfg.dispositivo,
    };
    let mut nucleo = match Nucleo::carregar(&abertura) {
        Ok(n) => n,
        Err(e) => return falhar(&e),
    };
    if nucleo.pediu_gpu() {
        if crate::gl::existe() {
            tracing::info!("o núcleo desenha pela placa (OpenGL sem janela; a imagem volta pra página)");
        } else {
            tracing::warn!("o núcleo pediu a placa de vídeo e o OpenGL não abriu: desenha por software, se souber");
        }
    }
    let mut saida: Box<dyn Saida> = if cfg.sem_som {
        match std::env::var("KOF_NATIVO_SOM_BLOCO_MS")
            .ok()
            .and_then(|v| v.parse::<f64>().ok())
        {
            Some(b) if b > 0.0 => Box::new(EmBlocos {
                por_dentro: Relogio::default(),
                bloco: Duration::from_secs_f64(b / 1000.0),
                visto: std::cell::Cell::new((Instant::now(), 0.0)),
            }),
            _ => Box::new(Relogio::default()),
        }
    } else {
        match Placa::abrir() {
            Ok(p) => Box::new(p),
            Err(e) => {
                tracing::warn!("sem placa de som ({e}): o relógio dita o ritmo");
                Box::new(Relogio::default())
            }
        }
    };
    responder(serde_json::json!({
        "porta": canal.porta,
        "nucleo": nucleo.info,
        "taxaSaida": saida.taxa(),
    }));
    let motivo = laco(&mut nucleo, saida.as_mut(), &canal, &rx);
    tracing::info!("fim: {motivo}");
    canal.avisar(&Aviso::Fim { motivo });
    std::thread::sleep(Duration::from_millis(100)); // dá tempo do aviso sair
    drop(nucleo);
    0
}

fn pronto(n: &Nucleo, taxa_saida: u32) -> Aviso {
    let g = n.av.geometry;
    Aviso::Pronto {
        nucleo: n.info.nome.clone(),
        versao: n.info.versao.clone(),
        largura: g.base_width,
        altura: g.base_height,
        proporcao: proporcao(&g),
        fps: n.av.timing.fps,
        taxa: n.av.timing.sample_rate,
        taxa_saida,
        placa: crate::gl::placa(),
    }
}

fn proporcao(g: &crate::libretro::retro_game_geometry) -> f32 {
    if g.aspect_ratio > 0.0 {
        g.aspect_ratio
    } else if g.base_height > 0 {
        g.base_width as f32 / g.base_height as f32
    } else {
        4.0 / 3.0
    }
}

fn erro_de(pedido: u32, e: &KofError) -> Aviso {
    Aviso::Erro {
        pedido: Some(pedido),
        codigo: e.codigo().into(),
        mensagem: e.to_string(),
    }
}

fn laco(n: &mut Nucleo, saida: &mut dyn Saida, canal: &Canal, rx: &mpsc::Receiver<Pedido>) -> String {
    let mut pausado = false;
    let mut turbo = 1u32;
    let mut som = Vec::<i16>::with_capacity(8192);
    let mut buf = Vec::new();
    let (mut quadros, mut amostras, mut numero) = (0u64, 0u64, 0u32);
    let mut geo = n.av.geometry;
    let mut ultimo_relatorio = Instant::now();
    // cada quadro (núcleo, leitura da placa, envio, som) e o processador de cada linha (M16)
    let mut med = crate::medidor::Medidor::new();
    // a CPU por linha é lida numa linha à parte, 1x por segundo: ler o /proc (ou tirar a foto das linhas no Windows)
    // no laço do jogo dava uma travadinha a cada segundo
    let cpu_lida = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    {
        let destino = std::sync::Arc::downgrade(&cpu_lida);
        let r = std::thread::Builder::new().name("kof-cpu".into()).spawn(move || {
            let mut cpu = crate::cpu::Cpu::new();
            loop {
                std::thread::sleep(Duration::from_secs(1));
                let Some(d) = destino.upgrade() else { break }; // o laço acabou: a linha também
                let v = cpu.ler();
                *d.lock().unwrap_or_else(|e| e.into_inner()) = v;
            }
        });
        if let Err(e) = r {
            tracing::warn!("sem a linha que mede a CPU ({e}): o F3 fica sem a CPU por linha");
        }
    }
    let leitura_agora = || crate::gl::LEITURA_US.swap(0, std::sync::atomic::Ordering::Relaxed);
    // ritmo: a hora do próximo quadro; `enchendo` = sem som guardado ainda (começo, depois de pausar ou de faltar)
    let mut proximo = Instant::now();
    let mut enchendo = true;
    let mut faltas_antes = saida.faltas();
    loop {
        loop {
            let p = match rx.try_recv() {
                Ok(p) => p,
                Err(mpsc::TryRecvError::Empty) => break,
                Err(mpsc::TryRecvError::Disconnected) => return "canal fechado".into(),
            };
            match p {
                Pedido::Conectou => canal.avisar(&pronto(n, saida.taxa())),
                Pedido::AppFechou => return "o app fechou".into(),
                Pedido::Entrada(j, e) => n.entrada(j, e),
                Pedido::CarregarEstado(pedido, d) => canal.avisar(&match n.carregar_estado(&d) {
                    Ok(()) => Aviso::Ok { pedido },
                    Err(e) => erro_de(pedido, &e),
                }),
                Pedido::GravarBateria(pedido, d) => canal.avisar(&match n.gravar_bateria(&d) {
                    Ok(()) => Aviso::Ok { pedido },
                    Err(e) => erro_de(pedido, &e),
                }),
                Pedido::Comando(c) => match c {
                    Comando::Fechar => return "a página pediu".into(),
                    Comando::Pausar => {
                        pausado = true;
                        saida.pausar(true);
                    }
                    Comando::Continuar => {
                        pausado = false;
                        saida.pausar(false);
                    }
                    Comando::Reiniciar => n.reiniciar(),
                    Comando::Volume { valor } => saida.volume(valor),
                    Comando::Turbo { fator } => turbo = fator.clamp(1, 8),
                    Comando::Variavel { chave, valor } => {
                        if let Err(e) = n.variavel(&chave, &valor) {
                            canal.avisar(&erro_de(0, &e));
                        }
                    }
                    Comando::SalvarEstado { pedido } => match n.salvar_estado() {
                        Ok(d) => canal.mandar(tungstenite::Message::binary(protocolo::bloco(
                            protocolo::ESTADO,
                            pedido,
                            &d,
                        ))),
                        Err(e) => canal.avisar(&erro_de(pedido, &e)),
                    },
                    Comando::LerBateria { pedido } => {
                        let d = n.bateria().unwrap_or_default();
                        canal.mandar(tungstenite::Message::binary(protocolo::bloco(
                            protocolo::BATERIA,
                            pedido,
                            &d,
                        )));
                    }
                },
            }
        }
        if n.pediu_fim() {
            return "o núcleo pediu pra fechar".into();
        }
        if pausado {
            std::thread::sleep(Duration::from_millis(5));
            continue;
        }
        let taxa = n.av.timing.sample_rate;
        let fps = if n.av.timing.fps > 0.0 { n.av.timing.fps } else { 60.0 };
        // Um quadro por vez, no relógio do jogo (como o antigo): rodar "enquanto o som pede" fazia rajadas de 2–3
        // quadros seguidos (a placa consome em blocos) e a tela sentia, mesmo com todos mandados.
        let guardado = saida.guardado_ms();
        if saida.faltas() != faltas_antes {
            faltas_antes = saida.faltas();
            enchendo = true; // o som acabou: enche de novo antes de voltar pro relógio
        }
        if guardado >= ALVO_MS {
            enchendo = false;
        }
        let agora = Instant::now();
        if agora > proximo + Duration::from_millis(250) {
            proximo = agora; // pausou ou travou: não tenta recuperar o atraso (o antigo fazia igual)
        }
        let ajuste = if guardado < ALVO_MS * 0.66 {
            1.0 - AJUSTE_DO_RELOGIO
        } else if guardado > ALVO_MS * 1.33 {
            1.0 + AJUSTE_DO_RELOGIO
        } else {
            1.0
        };
        let periodo = Duration::from_secs_f64(ajuste / fps);
        let mut rodou = 0;
        if guardado < SOM_MAXIMO_MS && (enchendo || agora >= proximo) {
            proximo = (if enchendo { agora } else { proximo }) + periodo;
            for i in 0..turbo {
                som.clear();
                let t = Instant::now();
                leitura_agora(); // o que sobrou fora de um quadro não conta
                let novo = n.rodar(&mut som);
                med.quadro(t.elapsed(), leitura_agora(), saida.guardado_ms(), saida.faltas());
                quadros += 1;
                // Todo quadro que o núcleo fez vai pra página na hora (não só o último do lote): a placa de som
                // consome em blocos e o laço roda 2–3 quadros seguidos; mandar só o último fazia a tela pular.
                // No turbo só o último de cada rodada vai (os outros não dá pra ver mesmo).
                if novo && i + 1 == turbo {
                    numero = numero.wrapping_add(1);
                    let t = Instant::now();
                    if let Some(()) = n.com_quadro(|q| protocolo::quadro(q, numero, &mut buf)) {
                        canal.publicar_quadro(std::mem::take(&mut buf));
                        med.envio(t.elapsed());
                    }
                }
            }
            if som.is_empty() {
                // núcleo mudo: um quadro de silêncio, pra o ritmo continuar certo
                som.resize(((taxa / fps).round() as usize).max(1) * 2, 0);
            }
            amostras += (som.len() / 2) as u64;
            saida.tocar(&som, taxa);
            rodou += 1;
        }
        let g = n.av.geometry;
        if g.base_width != geo.base_width || g.base_height != geo.base_height || g.aspect_ratio != geo.aspect_ratio {
            geo = g;
            canal.avisar(&Aviso::Geometria {
                largura: g.base_width,
                altura: g.base_height,
                proporcao: proporcao(&g),
            });
        }
        if ultimo_relatorio.elapsed() >= Duration::from_secs(1) {
            ultimo_relatorio = Instant::now();
            // as médias do segundo (o F3 de sempre) saem dos mesmos quadros que vão no `porQuadro`
            let (mut nuc, mut lei, mut env, mut q, mut e) = (0u64, 0u64, 0u64, 0u64, 0u64);
            for r in med.novos() {
                nuc += r.nucleo as u64;
                lei += r.leitura as u64;
                q += 1;
                if r.envio > 0 {
                    env += r.envio as u64;
                    e += 1;
                }
            }
            let ms = |us: u64, n: u64| (n > 0).then(|| (us as f64 / 1000.0 / n as f64 * 100.0).round() / 100.0);
            canal.avisar(&Aviso::Desempenho {
                quadros,
                amostras,
                atraso_ms: saida.guardado_ms(),
                faltas: saida.faltas(),
                nucleo_ms: ms(nuc, q),
                leitura_ms: crate::gl::existe().then(|| ms(lei, q)).flatten(),
                imagem_ms: ms(env, e),
                por_quadro: Some(med.bloco()),
                cpu: Some(cpu_lida.lock().unwrap_or_else(|e| e.into_inner()).clone()),
            });
        }
        if rodou == 0 {
            // dorme até o próximo quadro (no máximo 2 ms por vez: os comandos da página não esperam)
            let espera = proximo
                .saturating_duration_since(Instant::now())
                .clamp(Duration::from_micros(200), Duration::from_millis(2));
            std::thread::sleep(espera);
        }
    }
}
