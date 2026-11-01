use kof_files::loja::{codificar, decodificar, Lojas};
use serde_json::json;

#[test]
fn chave_vira_nome_de_arquivo_e_volta() {
    for k in [
        "SUPER MARIO WORLD|524288",
        "sram.POKEMON.1048576",
        "../../etc",
        "a/b\\c",
        "ção 🎮",
        ".oculto",
    ] {
        let c = codificar(k).unwrap();
        assert!(
            !c.contains('/') && !c.contains('\\') && !c.starts_with('.') && !c.contains(".."),
            "{c}"
        );
        assert_eq!(decodificar(&c), k);
    }
    assert!(codificar("").is_err());
}

#[test]
fn por_pegar_listar_apagar() {
    let d = tempfile::tempdir().unwrap();
    let l = Lojas::nova(d.path().to_path_buf());
    l.por("saves", "sram.X.10", &json!({"hash": "ab", "quando": 5}), b"dados")
        .unwrap();
    l.por("saves", "sram.Y.10", &json!({"hash": "cd"}), b"").unwrap();
    assert_eq!(l.pegar("saves", "sram.X.10").unwrap(), b"dados");
    assert_eq!(l.pegar("saves", "sram.Y.10").unwrap(), b"");
    let todos = l.listar("saves", None).unwrap();
    assert_eq!(todos.len(), 2);
    assert_eq!(todos[0].meta["quando"], 5);
    assert_eq!(todos[0].size, 5);
    assert_eq!(l.listar("saves", Some("sram.Y")).unwrap().len(), 1);
    l.apagar("saves", "sram.X.10").unwrap();
    assert_eq!(l.pegar("saves", "sram.X.10").unwrap_err().codigo(), "NOT_FOUND");
    assert_eq!(
        l.por("shell", "x", &json!({}), b"").unwrap_err().codigo(),
        "INVALID_ARGS"
    );
}
