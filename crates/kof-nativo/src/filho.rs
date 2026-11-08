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

/// Som guardado que o laço mantém (o mesmo alvo do Worker do wasm).
const ALVO_MS: f64 = 60.0;

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

/// Ponto de entrada do processo filho (o `kof-nativo` e o `kofstation --nativo`). Devolve o código de saída.
pub fn rodar() -> i32 {
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
        Box::new(Relogio::default())
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
    let mut cpu = crate::cpu::Cpu::new();
    let leitura_agora = || crate::gl::LEITURA_US.swap(0, std::sync::atomic::Ordering::Relaxed);
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
        let mut novo = false;
        let mut rodou = 0;
        while saida.guardado_ms() < ALVO_MS && rodou < 8 {
            for _ in 0..turbo {
                som.clear();
                let t = Instant::now();
                leitura_agora(); // o que sobrou fora de um quadro não conta
                novo |= n.rodar(&mut som);
                med.quadro(t.elapsed(), leitura_agora(), saida.guardado_ms(), saida.faltas());
                quadros += 1;
            }
            if som.is_empty() {
                // núcleo mudo: um quadro de silêncio, pra o ritmo continuar certo
                som.resize(((taxa / fps).round() as usize).max(1) * 2, 0);
            }
            amostras += (som.len() / 2) as u64;
            saida.tocar(&som, taxa);
            rodou += 1;
        }
        if novo {
            numero = numero.wrapping_add(1);
            let t = Instant::now();
            if let Some(()) = n.com_quadro(|q| protocolo::quadro(q, numero, &mut buf)) {
                canal.publicar_quadro(std::mem::take(&mut buf));
                med.envio(t.elapsed());
            }
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
                cpu: Some(cpu.ler()),
            });
        }
        if rodou == 0 {
            let espera = (saida.guardado_ms() - ALVO_MS).clamp(0.5, 4.0);
            std::thread::sleep(Duration::from_secs_f64(espera / 1000.0));
        }
    }
}
