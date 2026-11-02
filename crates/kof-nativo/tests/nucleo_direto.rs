//! O frontend libretro no próprio processo do teste: imagem, som (amostra por amostra), opções, estado, bateria e o
//! log formatado pela ponte em C. Um teste só neste arquivo: o núcleo é global (um por processo).
mod comum;

use kof_nativo::nucleo::{Abertura, Entrada, Nucleo};
use std::collections::BTreeMap;

#[test]
fn frontend_no_processo() {
    let dir = tempfile::tempdir().unwrap();
    let lib = comum::compilar_minimo(dir.path());
    let jogo = dir.path().join("jogo.bin");
    std::fs::write(&jogo, [0x5a, 1, 2, 3]).unwrap();
    let a = Abertura {
        nucleo: lib.clone(),
        jogo: Some(jogo),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        variaveis: BTreeMap::from([("minimo_cor".into(), "azul".into())]),
        dispositivo: None,
    };
    let mut n = Nucleo::carregar(&a).expect("abriu");
    assert!(Nucleo::carregar(&a).is_err(), "um núcleo por processo");
    assert_eq!(n.info.nome, "minimo");
    assert_eq!((n.av.geometry.base_width, n.av.timing.sample_rate), (320, 44100.0));

    let mut som = Vec::new();
    assert!(n.rodar(&mut som));
    assert_eq!(som.len(), 735 * 2);
    for i in 0..735 {
        assert_eq!((som[i * 2], som[i * 2 + 1]), (i as i16, -(i as i16)));
    }
    let q = n.quadro();
    assert_eq!((q.largura, q.altura, q.rgba.len()), (320, 240, 320 * 240 * 4));
    assert_eq!(&q.rgba[8..12], &[0, 0, 255, 255], "cor da opção (azul)");
    assert_eq!(
        &q.rgba[0..4],
        &[0, 0, 0x5a, 255],
        "1º byte do conteúdo no azul do pixel 0"
    );

    n.entrada(
        0,
        Entrada {
            botoes: 0x0301,
            eixos: [0; 4],
        },
    );
    n.variavel("minimo_cor", "verde").unwrap();
    som.clear();
    n.rodar(&mut som);
    assert_eq!(som[0], 735);
    let q = n.quadro();
    assert_eq!(&q.rgba[0..4], &[0x01, 0x03, 0x5a, 255], "botões no pixel 0");
    assert_eq!(&q.rgba[8..12], &[0, 255, 0, 255], "opção mudada com o jogo rodando");
    assert_eq!(q.rgba[6], 2, "quadro 2 no azul do pixel 1");

    let e = n.salvar_estado().unwrap();
    n.rodar(&mut som);
    n.rodar(&mut som);
    n.carregar_estado(&e).unwrap();
    n.rodar(&mut som);
    assert_eq!(n.quadro().rgba[6], 3, "voltou pro quadro 2 e andou um");
    assert!(n.carregar_estado(&[1, 2]).is_err());

    assert_eq!(n.bateria().unwrap(), b"KOF\0\0\0\0\0");
    n.gravar_bateria(b"save1234").unwrap();
    assert_eq!(n.bateria().unwrap(), b"save1234");
    drop(n);
    // fechado, abre de novo
    let n = Nucleo::carregar(&a).expect("reabriu");
    drop(n);
}
