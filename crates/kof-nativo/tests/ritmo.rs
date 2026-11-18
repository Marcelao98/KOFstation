//! Ritmo (tarefa C): todo quadro que o núcleo fez tem que ser mandado pra página. Roda o núcleo mínimo por alguns
//! segundos e conta, pelo `porQuadro` (campo `envio`, 4º número de cada quadro: 0 = não foi mandado), quantos quadros
//! rodaram e quantos ficaram sem mandar. Também confere que a página recebe imagens com números seguidos.
mod comum;

use kof_nativo::protocolo::{self, Aviso};
use kof_nativo::{Pedido, ProcessoNativo};
use std::collections::BTreeMap;
use std::net::TcpStream;
use std::path::Path;
use std::time::{Duration, Instant};
use tungstenite::{Message, WebSocket};

fn programa() -> &'static Path {
    Path::new(env!("CARGO_BIN_EXE_kof-nativo"))
}

#[test]
fn todo_quadro_rodado_e_mandado() {
    let dir = tempfile::tempdir().unwrap();
    let jogo = dir.path().join("jogo.bin");
    std::fs::write(&jogo, [0x77]).unwrap();
    let ped = Pedido {
        nucleo: comum::compilar_minimo(dir.path()),
        jogo: Some(jogo),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        origem: None,
        variaveis: BTreeMap::new(),
        sem_som: true,
        dispositivo: None,
    };
    // a placa de som de verdade consome em blocos: o relógio de teste faz igual (rajadas de 2-3 quadros no laço)
    std::env::set_var("KOF_NATIVO_SOM_BLOCO_MS", "40");
    let p = ProcessoNativo::abrir(programa(), &[], &ped).expect("abriu");
    let s = TcpStream::connect(("127.0.0.1", p.porta)).unwrap();
    s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
    let req = tungstenite::client::IntoClientRequest::into_client_request(format!(
        "ws://127.0.0.1:{}/?t={}",
        p.porta, p.token
    ))
    .unwrap();
    let (mut ws, _): (WebSocket<TcpStream>, _) = tungstenite::client(req, s).map_err(|_| "aperto de mão").unwrap();

    let (mut rodados, mut sem_envio, mut imagens) = (0u64, 0u64, 0u64);
    let mut segundos = 0;
    let fim = Instant::now() + Duration::from_secs(30);
    while segundos < 6 && Instant::now() < fim {
        match ws.read().expect("mensagem") {
            Message::Binary(b) if b[0] == protocolo::QUADRO => imagens += 1,
            Message::Text(t) => {
                if let Ok(Aviso::Desempenho {
                    por_quadro: Some(pq), ..
                }) = serde_json::from_str(t.as_str())
                {
                    segundos += 1;
                    if segundos == 1 {
                        continue; // o primeiro segundo inclui a partida
                    }
                    rodados += (pq.len() / 6) as u64;
                    sem_envio += pq.chunks(6).filter(|q| q[3] == 0).count() as u64;
                }
            }
            _ => {}
        }
    }
    eprintln!("RITMO: rodados={rodados} sem_envio={sem_envio} imagens_recebidas={imagens}");
    assert!(rodados >= 200, "rodou pouco: {rodados}");
    assert_eq!(
        sem_envio, 0,
        "{sem_envio} de {rodados} quadros rodaram e não foram mandados"
    );
}
