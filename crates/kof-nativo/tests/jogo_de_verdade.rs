//! Depuração com um jogo de verdade da máquina de quem roda (nunca vai pro repositório): `KOF_JOGO=<.cue/.chd/...>`
//! `KOF_PRINTS=<pasta>` `cargo test -p kof-nativo --release --test jogo_de_verdade -- --ignored --nocapture`.
//! Roda, salva o estado, anda, carrega e confere que a imagem volta (não fica preta) e que o jogo segue andando.
use kof_nativo::nucleo::{Abertura, Nucleo, Quadro};
use std::path::PathBuf;

fn nucleo_pcsx() -> PathBuf {
    std::env::var("KOF_PCSX").map(PathBuf::from).unwrap_or_else(|_| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../third_party/cores/nativos")
            .join(kof_nativo::plataforma())
            .join("pcsx_rearmed_libretro.so")
    })
}

fn brilho(q: &Quadro) -> u64 {
    q.rgba
        .chunks(4)
        .map(|p| p[0] as u64 + p[1] as u64 + p[2] as u64)
        .sum::<u64>()
        / (q.rgba.len() as u64 / 4).max(1)
}

fn ppm(q: &Quadro, nome: &str) {
    let Ok(d) = std::env::var("KOF_PRINTS") else { return };
    let mut b = format!("P6\n{} {}\n255\n", q.largura, q.altura).into_bytes();
    for p in q.rgba.chunks(4) {
        b.extend_from_slice(&p[..3]);
    }
    std::fs::write(PathBuf::from(d).join(format!("{nome}.ppm")), b).unwrap();
}

#[test]
#[ignore = "precisa de KOF_JOGO (um jogo de verdade, só na máquina de quem testa)"]
fn estado_com_jogo_de_verdade() {
    let jogo = PathBuf::from(std::env::var("KOF_JOGO").expect("KOF_JOGO"));
    let dir = tempfile::tempdir().unwrap();
    let mut variaveis = std::collections::BTreeMap::new();
    if let Ok(drc) = std::env::var("KOF_DRC") {
        variaveis.insert("pcsx_rearmed_drc".to_string(), drc);
    }
    let a = Abertura {
        nucleo: nucleo_pcsx(),
        jogo: Some(jogo),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        variaveis,
        dispositivo: None,
    };
    let mut n = Nucleo::carregar(&a).expect("abriu");
    let mut som = Vec::new();
    let quadros: u32 = std::env::var("KOF_QUADROS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(900);
    let t = std::time::Instant::now();
    for _ in 0..quadros {
        n.rodar(&mut som);
    }
    println!("{quadros} quadros em {:?} ({} amostras de som)", t.elapsed(), som.len());
    let q0 = n.quadro();
    ppm(&q0, "0-salvo");
    let e = n.salvar_estado().expect("salvou");
    println!(
        "estado {} bytes; quadro {}x{} brilho {}",
        e.len(),
        q0.largura,
        q0.altura,
        brilho(&q0)
    );
    for ciclo in 0..3 {
        for _ in 0..300 {
            n.rodar(&mut som);
        }
        ppm(&n.quadro(), &format!("1-andou-{ciclo}"));
        n.carregar_estado(&e).expect("carregou");
        n.rodar(&mut som);
        let q = n.quadro();
        println!(
            "ciclo {ciclo}: depois de carregar {}x{} brilho {}",
            q.largura,
            q.altura,
            brilho(&q)
        );
        ppm(&q, &format!("2-carregado-{ciclo}"));
        assert_eq!(
            (q.largura, q.altura),
            (q0.largura, q0.altura),
            "a imagem volta no tamanho do estado"
        );
        assert!(
            brilho(&q).abs_diff(brilho(&q0)) <= brilho(&q0) / 4 + 2,
            "a imagem volta (não fica preta)"
        );
        let antes = q.rgba.clone();
        for _ in 0..60 {
            n.rodar(&mut som);
        }
        println!("ciclo {ciclo}: +60 quadros brilho {}", brilho(&n.quadro()));
        if brilho(&q0) > 0 {
            assert_ne!(n.quadro().rgba, antes, "o jogo segue andando depois de carregar");
        }
    }
}
