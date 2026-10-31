//! Os mesmos exemplos JSON que o TypeScript testa (packages/contracts/fixtures).
use kof_core::{AppInfo, ContractError, KofError, CONTRACT_VERSION};
use std::path::PathBuf;

fn fixture(nome: &str) -> serde_json::Value {
    let p = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("../../packages/contracts/fixtures/{nome}.json"));
    serde_json::from_str(&std::fs::read_to_string(&p).expect("fixture")).expect("json")
}

#[test]
fn app_info_ida_e_volta() {
    let v = fixture("app.info");
    let info: AppInfo = serde_json::from_value(v.clone()).expect("app.info do TS cabe no Rust");
    assert_eq!(info.contract_version, CONTRACT_VERSION);
    assert_eq!(serde_json::to_value(&info).unwrap(), v, "o Rust devolve o mesmo JSON");
}

#[test]
fn erro_ida_e_volta() {
    let v = fixture("erro");
    let e: ContractError = serde_json::from_value(v.clone()).expect("erro do TS cabe no Rust");
    assert_eq!(serde_json::to_value(&e).unwrap(), v);
}

#[test]
fn campo_a_mais_ou_trocado_e_recusado() {
    let mut v = fixture("app.info");
    v["dataDirectory"] = v["dataDir"].take();
    v.as_object_mut().unwrap().remove("dataDir");
    assert!(serde_json::from_value::<AppInfo>(v).is_err());
}

#[test]
fn erro_do_backend_vira_codigo_estavel() {
    let e = KofError::ComandoDesconhecido("foo.bar".into());
    let c = ContractError::from(&e);
    assert_eq!(c.code, "UNKNOWN_COMMAND");
    assert!(c.message.contains("foo.bar"));
    assert!(c.code.chars().all(|ch| ch.is_ascii_uppercase() || ch == '_'));
}
