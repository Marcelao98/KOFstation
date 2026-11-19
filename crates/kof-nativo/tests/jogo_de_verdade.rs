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

/// Fase R (rebobinar liso no PS1): grava como o app (uma foto a cada 2 quadros) e volta como o `filho.rs` (cada passo:
/// carrega a foto e roda), contando os passos em que a imagem NÃO muda (o tranco que o olho vê) e o tempo de cada passo.
/// `KOF_ESTADO=<estado .bin cru>` começa dali (o meio de uma fase); `KOF_VOLTAR_ATE=<n>` roda até `n` quadros por passo
/// até sair imagem nova (1 = como era).
#[test]
#[ignore = "precisa de KOF_JOGO (um jogo de verdade, só na máquina de quem testa)"]
fn rebobinar_liso_com_jogo_de_verdade() {
    use kof_nativo::rebobinar::{ModoDoSom, Voltar};
    let jogo = PathBuf::from(std::env::var("KOF_JOGO").expect("KOF_JOGO"));
    let dir = tempfile::tempdir().unwrap();
    let a = Abertura {
        nucleo: nucleo_pcsx(),
        jogo: Some(jogo),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        // KOF_VARS="chave=valor,chave=valor": as opções do perfil (ex.: pcsx_rearmed_frameskip_type=auto)
        variaveis: std::env::var("KOF_VARS")
            .unwrap_or_default()
            .split(',')
            .filter_map(|kv| kv.split_once('=').map(|(k, v)| (k.to_string(), v.to_string())))
            .collect(),
        dispositivo: None,
    };
    let mut n = Nucleo::carregar(&a).expect("abriu");
    let mut som = Vec::new();
    for _ in 0..120 {
        som.clear();
        n.rodar(&mut som);
    }
    if let Ok(p) = std::env::var("KOF_ESTADO") {
        let e = std::fs::read(p).expect("estado");
        match n.carregar_estado(&e) {
            Ok(()) => println!("começou do estado ({} KB)", e.len() / 1024),
            Err(e) => println!("o estado não carregou ({e}): começa da abertura"),
        }
    }
    let ate: usize = std::env::var("KOF_VOLTAR_ATE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1);
    let mut rb = Voltar::new(n.av.timing.sample_rate, 96 << 20);
    rb.configurar(true, 5, 0, ModoDoSom::Fita);
    // ~5 s jogando (o jogo parado ainda anima: personagem, água, fundo)
    let mut novos = 0;
    for _ in 0..300 {
        som.clear();
        if n.rodar(&mut som) {
            novos += 1;
        }
        rb.som.saiu(&mut som, true);
        if rb.hora_da_foto(1) {
            n.salvar_estado_em(&mut rb.buf).expect("estado");
            rb.gravar();
        }
    }
    println!("jogando: {novos} de 300 quadros com imagem nova");
    let mut anterior = n.quadro().rgba;
    let (mut passos, mut parados, mut sem_novo, mut extras) = (0, 0, 0, 0);
    let mut tempos = Vec::new();
    let (mut som_volta, mut som_ms) = (Vec::new(), Vec::<f64>::new());
    while passos < 140 {
        let t = std::time::Instant::now();
        let Some(e) = rb.voltar().map(<[u8]>::to_vec) else {
            break;
        };
        n.voltar_estado(&e).expect("carregou");
        let mut veio = false;
        for k in 0..ate {
            som.clear();
            veio = n.rodar(&mut som);
            if k > 0 {
                extras += 1;
            }
            if veio {
                break;
            }
        }
        tempos.push(t.elapsed().as_secs_f64() * 1000.0);
        rb.som.passo(&mut som_volta);
        som_ms.push(som_volta.len() as f64 / 2.0 * 1000.0 / n.av.timing.sample_rate);
        if !veio {
            sem_novo += 1;
        }
        let q = n.quadro().rgba;
        if q == anterior {
            parados += 1;
        }
        anterior = q;
        passos += 1;
    }
    tempos.sort_by(f64::total_cmp);
    let p = |x: f64| tempos[((tempos.len() - 1) as f64 * x) as usize];
    println!(
        "voltando (até {ate} quadro/passo): {passos} passos; sem imagem nova {sem_novo}; imagem igual à do passo \
         anterior {parados} ({:.0}%); quadros extras {extras}; passo p50 {:.2} ms, p95 {:.2} ms, máx {:.2} ms",
        parados as f64 * 100.0 / passos.max(1) as f64,
        p(0.5),
        p(0.95),
        p(1.0)
    );
    let total: f64 = som_ms.iter().sum();
    println!(
        "som por passo: média {:.1} ms (o ritmo: {:.0} imagens/s), mín {:.1}, máx {:.1}; primeiros {:?}",
        total / som_ms.len().max(1) as f64,
        som_ms.len() as f64 * 1000.0 / total.max(1.0),
        som_ms.iter().cloned().fold(f64::MAX, f64::min),
        som_ms.iter().cloned().fold(0.0, f64::max),
        som_ms
            .iter()
            .take(8)
            .map(|x| (x * 10.0).round() / 10.0)
            .collect::<Vec<_>>()
    );
}
