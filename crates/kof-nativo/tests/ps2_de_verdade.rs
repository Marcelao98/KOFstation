//! Medição com um jogo de PS2 de verdade da máquina de quem roda (nunca vai pro repositório):
//! `KOF_JOGO=<iso> KOF_BIOS_PS2=<bios> [KOF_ESTADO=<estado cru do núcleo>]`
//! `cargo test -p kof-nativo --release --test ps2_de_verdade -- --ignored --nocapture`.
//! Mede quanto custam, no laço do processo do jogo, as coisas que a página pede: salvar e carregar estado e ler a
//! bateria (o cartão de memória), e o tempo de quadro em volta.
use kof_nativo::nucleo::{Abertura, Nucleo};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Instant;

fn ms(t: Instant) -> f64 {
    t.elapsed().as_secs_f64() * 1000.0
}

#[test]
#[ignore = "precisa de KOF_JOGO e KOF_BIOS_PS2 (só na máquina de quem testa)"]
fn custo_de_estado_e_bateria_no_ps2() {
    let jogo = PathBuf::from(std::env::var("KOF_JOGO").expect("KOF_JOGO"));
    let bios = PathBuf::from(std::env::var("KOF_BIOS_PS2").expect("KOF_BIOS_PS2"));
    let lib = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../third_party/cores/nativos/linux-x64/pcsx2_libretro.so");
    let dir = tempfile::tempdir().unwrap();
    let sistema = dir.path().join("sistema");
    std::fs::create_dir_all(sistema.join("pcsx2/bios")).unwrap();
    std::fs::copy(&bios, sistema.join("pcsx2/bios/bios.bin")).unwrap();
    let a = Abertura {
        nucleo: lib,
        jogo: Some(jogo),
        sistema,
        saves: dir.path().join("saves"),
        variaveis: BTreeMap::from([
            ("pcsx2_bios".into(), "bios.bin".into()),
            ("pcsx2_renderer".into(), "OpenGL".into()),
        ]),
        dispositivo: None,
    };
    let mut n = Nucleo::carregar(&a).expect("o LRPS2 abriu");
    let mut som = Vec::new();
    let mut rodar = |n: &mut Nucleo, q: usize| {
        let mut v = Vec::with_capacity(q);
        for _ in 0..q {
            let t = Instant::now();
            n.rodar(&mut som);
            v.push(ms(t));
        }
        v.sort_by(|a, b| a.partial_cmp(b).unwrap());
        (v[v.len() / 2], v[v.len() * 99 / 100], v[v.len() - 1])
    };
    rodar(&mut n, 600);
    if let Ok(e) = std::env::var("KOF_ESTADO") {
        let d = std::fs::read(e).unwrap();
        for i in 0..3 {
            let t = Instant::now();
            n.carregar_estado(&d).expect("carregou");
            eprintln!(
                "carregar estado #{i}: {:.0} ms ({:.1} MB)",
                ms(t),
                d.len() as f64 / 1048576.0
            );
            rodar(&mut n, 120);
        }
    }
    let (p50, p99, max) = rodar(&mut n, 600);
    eprintln!("quadro (10 s): p50 {p50:.2} · p99 {p99:.2} · máx {max:.2} ms");
    for i in 0..3 {
        let t = Instant::now();
        let e = n.salvar_estado().expect("salvou");
        eprintln!(
            "salvar estado #{i}: {:.0} ms ({:.1} MB)",
            ms(t),
            e.len() as f64 / 1048576.0
        );
        rodar(&mut n, 60);
    }
    let mut t_bat = Vec::new();
    let mut tam = 0;
    for _ in 0..10 {
        let t = Instant::now();
        tam = n.bateria().map(|b| b.len()).unwrap_or(0);
        t_bat.push(ms(t));
        rodar(&mut n, 60);
    }
    eprintln!(
        "bateria: {:.2} MB, ler leva {:.1}–{:.1} ms (a página pede a cada 1 s)",
        tam as f64 / 1048576.0,
        t_bat.iter().cloned().fold(f64::MAX, f64::min),
        t_bat.iter().cloned().fold(0.0, f64::max)
    );
    // o cartão de memória fica num buffer do núcleo e só é fechado (soma de verificação gravada) no fim: fechar o
    // núcleo tem que tocar no arquivo do cartão, e o tempo disso diz quanto o processo do jogo precisa pra sair
    let cartao = dir.path().join("sistema/pcsx2/memcards/Mcd001.ps2");
    assert!(
        cartao.is_file(),
        "o núcleo cria o cartão do slot 1 em sistema/pcsx2/memcards"
    );
    std::thread::sleep(std::time::Duration::from_millis(1100)); // o relógio do arquivo tem resolução de segundos em alguns sistemas
    let antes = std::time::SystemTime::now();
    let t = Instant::now();
    drop(n);
    eprintln!("fechar o núcleo: {:.0} ms", ms(t));
    let mudou = std::fs::metadata(&cartao).unwrap().modified().unwrap();
    assert!(
        mudou >= antes - std::time::Duration::from_millis(500),
        "ao fechar, o núcleo grava o cartão (senão o save que estava no buffer se perde)"
    );
}
