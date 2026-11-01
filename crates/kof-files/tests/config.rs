use kof_files::config::{gravar, ler};
use serde_json::json;

#[test]
fn le_grava_e_recusa_o_que_nao_entende() {
    let d = tempfile::tempdir().unwrap();
    assert_eq!(ler(d.path(), "config").unwrap(), json!({"versao": 1, "valores": {}}));
    gravar(
        d.path(),
        "config",
        &json!({"versao": 1, "valores": {"tema": "cafe", "teclas.snes": "{}"}}),
    )
    .unwrap();
    assert_eq!(ler(d.path(), "config").unwrap()["valores"]["tema"], "cafe");
    let texto = std::fs::read_to_string(d.path().join("config/config.json")).unwrap();
    assert!(texto.contains("\n  \"valores\""), "legível (indentado): {texto}");
    let e = gravar(d.path(), "config", &json!({"versao": 9, "valores": {}})).unwrap_err();
    assert_eq!(e.codigo(), "SCHEMA_TOO_NEW");
    let e = gravar(d.path(), "config", &json!({"valores": {"volume": 100}})).unwrap_err();
    assert_eq!(e.codigo(), "INVALID_ARGS");
    assert_eq!(ler(d.path(), "../x").unwrap_err().codigo(), "INVALID_ARGS");
    std::fs::write(d.path().join("config/config.json"), "{ estragado").unwrap();
    assert_eq!(ler(d.path(), "config").unwrap()["valores"], json!({}));
    assert!(d.path().join("config/config.json.estragado").is_file());
}
