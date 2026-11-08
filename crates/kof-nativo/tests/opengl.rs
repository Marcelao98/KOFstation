//! OpenGL sem janela (N.9/P.2): um núcleo de teste que desenha na placa (SET_HW_RENDER, core 3.3, como o LRPS2) e o
//! frontend devolve a imagem certa (virada: a origem do OpenGL é embaixo), quadro a quadro, pela leitura assíncrona.
//! Sem OpenGL na máquina (CI sem driver), o teste avisa e passa: quem garante é o CI do Linux (Mesa).
mod comum;

use kof_nativo::nucleo::{Abertura, Nucleo};

#[test]
fn nucleo_que_desenha_na_placa() {
    let dir = tempfile::tempdir().unwrap();
    let lib = comum::compilar(dir.path(), "gl");
    let a = Abertura {
        nucleo: lib,
        jogo: Some(dir.path().join("x.bin")),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        ..Default::default()
    };
    let mut n = match Nucleo::carregar(&a) {
        Ok(n) => n,
        Err(e) if std::env::var("KOF_EXIGIR_GL").unwrap_or_default().is_empty() => {
            eprintln!("aviso: sem OpenGL aqui ({e}); defina KOF_EXIGIR_GL=1 pra falhar");
            return;
        }
        Err(e) => panic!("o núcleo com OpenGL não abriu: {e}"),
    };
    assert!(n.pediu_gpu());
    let mut som = Vec::new();
    let mut novos = 0;
    let inicio = std::time::Instant::now();
    for _ in 0..120 {
        if n.rodar(&mut som) {
            novos += 1;
        }
    }
    let ms = inicio.elapsed().as_secs_f64() * 1000.0 / 120.0;
    eprintln!("120 quadros pela placa: {ms:.2} ms por quadro (desenho + leitura), {novos} entregues");
    assert!(novos >= 115, "a leitura assíncrona entrega quase todo quadro ({novos})");
    let q = n.quadro();
    assert_eq!((q.largura, q.altura), (320, 240));
    let px = |x: usize, y: usize| &q.rgba[(y * 320 + x) * 4..(y * 320 + x) * 4 + 4];
    assert_eq!(&px(10, 10)[..2], &[255, 0], "em cima vermelho (virado certo)");
    assert_eq!(&px(10, 230)[..2], &[0, 255], "embaixo verde");
    // o azul é o nº do quadro: o entregue é de no máximo 2 atrás
    let azul = px(10, 10)[2] as i32;
    assert!(
        (118..=120).contains(&azul),
        "quadro {azul} de 120: no máximo 2 de atraso"
    );
}
