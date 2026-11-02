//! Ponta a ponta: o supervisor abre o processo filho com o núcleo mínimo; a "página" (um cliente WebSocket) recebe
//! quadros e o relatório de som, manda botões e comandos; sem token (ou com origem errada) a conexão é recusada; se o
//! núcleo quebrar, só o filho morre e o log dele fica guardado.
mod comum;

use kof_nativo::protocolo::{self, Aviso, Comando};
use kof_nativo::{Entrada, Pedido, ProcessoNativo};
use std::collections::BTreeMap;
use std::net::TcpStream;
use std::path::Path;
use std::time::{Duration, Instant};
use tungstenite::{Message, WebSocket};

const ORIGEM: &str = "http://127.0.0.1:4321";

fn programa() -> &'static Path {
    Path::new(env!("CARGO_BIN_EXE_kof-nativo"))
}

fn pedido(dir: &Path, variaveis: &[(&str, &str)]) -> Pedido {
    let jogo = dir.join("jogo.bin");
    std::fs::write(&jogo, [0x77]).unwrap();
    Pedido {
        nucleo: comum::compilar_minimo(dir),
        jogo: Some(jogo),
        sistema: dir.into(),
        saves: dir.into(),
        origem: Some(ORIGEM.into()),
        variaveis: variaveis
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect::<BTreeMap<_, _>>(),
        sem_som: true,
    }
}

fn conectar(porta: u16, consulta: &str, origem: Option<&str>) -> Result<WebSocket<TcpStream>, tungstenite::Error> {
    let s = TcpStream::connect(("127.0.0.1", porta)).unwrap();
    s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
    let mut req =
        tungstenite::client::IntoClientRequest::into_client_request(format!("ws://127.0.0.1:{porta}/{consulta}"))
            .unwrap();
    if let Some(o) = origem {
        req.headers_mut().insert("Origin", o.parse().unwrap());
    }
    tungstenite::client(req, s).map(|(ws, _)| ws).map_err(|e| match e {
        tungstenite::HandshakeError::Failure(e) => e,
        tungstenite::HandshakeError::Interrupted(_) => panic!("aperto de mão interrompido"),
    })
}

fn recusada(r: Result<WebSocket<TcpStream>, tungstenite::Error>) -> bool {
    matches!(r, Err(tungstenite::Error::Http(resp)) if resp.status() == 403)
}

/// Lê até achar o que `f` aceita (ou estourar o prazo).
fn esperar<T>(ws: &mut WebSocket<TcpStream>, mut f: impl FnMut(&Message) -> Option<T>) -> T {
    let fim = Instant::now() + Duration::from_secs(10);
    while Instant::now() < fim {
        let m = ws.read().expect("mensagem");
        if let Some(t) = f(&m) {
            return t;
        }
    }
    panic!("não chegou a mensagem esperada");
}

fn aviso(m: &Message) -> Option<Aviso> {
    match m {
        Message::Text(t) => serde_json::from_str(t.as_str()).ok(),
        _ => None,
    }
}

fn mandar(ws: &mut WebSocket<TcpStream>, c: &Comando) {
    ws.send(Message::text(serde_json::to_string(c).unwrap())).unwrap();
}

#[test]
fn quadro_som_botoes_e_token() {
    let dir = tempfile::tempdir().unwrap();
    let mut p = ProcessoNativo::abrir(programa(), &[], &pedido(dir.path(), &[("minimo_cor", "verde")])).expect("abriu");
    assert_eq!(p.resposta["nucleo"]["nome"], "minimo");
    let porta = p.porta;

    assert!(recusada(conectar(porta, "", None)), "sem token");
    assert!(recusada(conectar(porta, "?t=errado", None)), "token errado");
    assert!(
        recusada(conectar(porta, &format!("?t={}", p.token), Some("http://mal.exemplo"))),
        "origem errada"
    );

    let mut ws = conectar(porta, &format!("?t={}", p.token), Some(ORIGEM)).expect("conectou com token");
    let pronto = esperar(&mut ws, aviso);
    assert!(
        matches!(pronto, Aviso::Pronto { largura: 320, altura: 240, taxa, .. } if taxa == 44100.0),
        "{pronto:?}"
    );

    // quadro: verde (opção), pixel 0 = conteúdo no azul
    let q = esperar(&mut ws, |m| match m {
        Message::Binary(b) if b[0] == protocolo::QUADRO => Some(b.to_vec()),
        _ => None,
    });
    assert_eq!(u16::from_le_bytes([q[4], q[5]]), 320);
    assert_eq!(u16::from_le_bytes([q[6], q[7]]), 240);
    assert_eq!(q.len(), 12 + 320 * 240 * 4);
    assert_eq!(&q[12..16], &[0, 0, 0x77, 255]);
    assert_eq!(&q[20..24], &[0, 255, 0, 255]);

    // botões da página chegam no núcleo
    ws.send(Message::binary(protocolo::botoes(
        0,
        Entrada {
            botoes: 0x0180,
            eixos: [0; 4],
        },
    )))
    .unwrap();
    esperar(&mut ws, |m| match m {
        Message::Binary(b) if b[0] == protocolo::QUADRO && b[12..16] == [0x80, 0x01, 0x77, 255] => Some(()),
        _ => None,
    });

    // som: ~60 quadros por segundo no relógio, 735 amostras cada
    let (quadros, amostras) = esperar(&mut ws, |m| match aviso(m) {
        Some(Aviso::Desempenho { quadros, amostras, .. }) => Some((quadros, amostras)),
        _ => None,
    });
    assert_eq!(amostras, quadros * 735);
    let (q2, _) = esperar(&mut ws, |m| match aviso(m) {
        Some(Aviso::Desempenho { quadros, amostras, .. }) => Some((quadros, amostras)),
        _ => None,
    });
    let por_segundo = q2 - quadros;
    assert!((50..=70).contains(&por_segundo), "{por_segundo} quadros/s");

    // estado e bateria
    mandar(&mut ws, &Comando::SalvarEstado { pedido: 9 });
    let estado = esperar(&mut ws, |m| match m {
        Message::Binary(b) if b[0] == protocolo::ESTADO => Some(b.to_vec()),
        _ => None,
    });
    assert_eq!(u32::from_le_bytes(estado[4..8].try_into().unwrap()), 9);
    assert_eq!(estado.len(), 12 + 4);
    ws.send(Message::binary(protocolo::bloco(
        protocolo::CARREGAR_ESTADO,
        10,
        &estado[12..],
    )))
    .unwrap();
    esperar(&mut ws, |m| {
        matches!(aviso(m), Some(Aviso::Ok { pedido: 10 })).then_some(())
    });
    ws.send(Message::binary(protocolo::bloco(protocolo::CARREGAR_ESTADO, 11, &[1])))
        .unwrap();
    let e = esperar(&mut ws, |m| match aviso(m) {
        Some(Aviso::Erro {
            pedido: Some(11),
            codigo,
            ..
        }) => Some(codigo),
        _ => None,
    });
    assert_eq!(e, "CORE_FAILED");
    mandar(&mut ws, &Comando::LerBateria { pedido: 12 });
    let b = esperar(&mut ws, |m| match m {
        Message::Binary(b) if b[0] == protocolo::BATERIA => Some(b.to_vec()),
        _ => None,
    });
    assert_eq!(&b[12..], b"KOF\0\0\0\0\0");

    // pausa: o núcleo para (o estado, que é o número do quadro, não muda); continuar volta a andar
    let quadro_do_estado = |ws: &mut WebSocket<TcpStream>, pedido: u32| {
        mandar(ws, &Comando::SalvarEstado { pedido });
        esperar(ws, |m| match m {
            Message::Binary(b) if b[0] == protocolo::ESTADO && b[4..8] == pedido.to_le_bytes() => {
                Some(u32::from_le_bytes(b[12..16].try_into().unwrap()))
            }
            _ => None,
        })
    };
    mandar(&mut ws, &Comando::Pausar);
    let q1 = quadro_do_estado(&mut ws, 20);
    std::thread::sleep(Duration::from_millis(300));
    assert_eq!(quadro_do_estado(&mut ws, 21), q1, "pausado não anda");
    mandar(&mut ws, &Comando::Continuar);
    std::thread::sleep(Duration::from_millis(300));
    assert!(quadro_do_estado(&mut ws, 22) > q1 + 5, "continuou");

    // comando que não existe vira erro, não derruba
    ws.send(Message::text(r#"{"cmd":"apagarTudo"}"#)).unwrap();
    esperar(&mut ws, |m| {
        matches!(aviso(m), Some(Aviso::Erro { pedido: None, .. })).then_some(())
    });

    // outra página conecta: a anterior cai, a nova recebe "pronto" de novo
    let mut ws2 = conectar(porta, &format!("?t={}", p.token), None).expect("segunda página");
    esperar(&mut ws2, |m| {
        matches!(aviso(m), Some(Aviso::Pronto { .. })).then_some(())
    });

    mandar(&mut ws2, &Comando::Fechar);
    let motivo = esperar(&mut ws2, |m| match aviso(m) {
        Some(Aviso::Fim { motivo }) => Some(motivo),
        _ => None,
    });
    assert_eq!(motivo, "a página pediu");
    let fim = Instant::now() + Duration::from_secs(5);
    while p.saiu().is_none() && Instant::now() < fim {
        std::thread::sleep(Duration::from_millis(20));
    }
    assert!(p.saiu().is_some_and(|s| s.success()));
    assert!(
        p.log().iter().any(|l| l.contains("minimo iniciou 42 ok")),
        "{:?}",
        p.log()
    );
}

#[test]
fn nucleo_que_quebra_derruba_so_o_filho() {
    let dir = tempfile::tempdir().unwrap();
    let mut p =
        ProcessoNativo::abrir(programa(), &[], &pedido(dir.path(), &[("minimo_quebrar", "sim")])).expect("abriu");
    let fim = Instant::now() + Duration::from_secs(5);
    while p.saiu().is_none() && Instant::now() < fim {
        std::thread::sleep(Duration::from_millis(20));
    }
    let s = p.saiu().expect("o filho tinha que ter caído");
    assert!(!s.success());
    assert!(p.log().iter().any(|l| l.contains("minimo iniciou")));
}

#[test]
fn nucleo_que_nao_existe_da_erro_com_codigo() {
    let dir = tempfile::tempdir().unwrap();
    let mut ped = pedido(dir.path(), &[]);
    ped.nucleo = dir.path().join("nao-existe.so");
    let e = ProcessoNativo::abrir(programa(), &[], &ped)
        .err()
        .expect("tinha que falhar");
    assert_eq!(e.codigo(), "CORE_FAILED");
    assert!(e.to_string().contains("nao-existe"), "{e}");
}

#[test]
fn fechar_pelo_supervisor() {
    let dir = tempfile::tempdir().unwrap();
    let p = ProcessoNativo::abrir(programa(), &[], &pedido(dir.path(), &[])).expect("abriu");
    let s = p.fechar().expect("fechou");
    assert!(s.success(), "o filho sai sozinho quando o stdin fecha: {s}");
}
