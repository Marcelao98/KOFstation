use kof_core::log::{escrever, LinhaDaTela};

fn linha(level: &str) -> LinhaDaTela {
    serde_json::from_value(serde_json::json!({"level": level, "target": "jogo", "message": "x".repeat(20000)})).unwrap()
}

#[test]
fn nivel_desconhecido_da_codigo_estavel() {
    let e = escrever(&linha("fatal")).unwrap_err();
    assert_eq!(e.codigo(), "INVALID_LEVEL");
    assert!(escrever(&linha("error")).is_ok(), "texto enorme é cortado, não dá erro");
}

#[test]
fn campo_desconhecido_e_recusado() {
    let r: Result<LinhaDaTela, _> =
        serde_json::from_value(serde_json::json!({"level": "info", "target": "a", "message": "b", "extra": 1}));
    assert!(r.is_err());
}
