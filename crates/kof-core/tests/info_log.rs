use kof_core::info::{app_info, pasta_de_dados};
use std::path::PathBuf;

#[test]
fn pasta_de_dados_segue_o_sistema() {
    let var = |k: &str| match k {
        "HOME" => Some("/home/marcelo".to_string()),
        "LOCALAPPDATA" => Some("C:\\Users\\m\\AppData\\Local".to_string()),
        _ => None,
    };
    let p = pasta_de_dados(var).unwrap();
    if cfg!(windows) {
        assert!(p.ends_with("KOFstation"));
    } else {
        assert_eq!(p, PathBuf::from("/home/marcelo/.local/share/KOFstation"));
        let xdg = pasta_de_dados(|k| (k == "XDG_DATA_HOME").then(|| "/dados".to_string())).unwrap();
        assert_eq!(xdg, PathBuf::from("/dados/KOFstation"));
    }
}

#[test]
fn info_tem_a_versao_do_contrato() {
    let i = app_info(std::path::Path::new("/tmp/kof"));
    assert_eq!(i.contract_version, 1);
    assert!(!i.version.is_empty());
}

#[test]
fn log_grava_em_arquivo() {
    let dir = tempfile::tempdir().unwrap();
    let guarda = kof_core::log::ligar(dir.path()).expect("log liga");
    tracing::info!(etapa = "F4a.3", "olá do KOFstation");
    drop(guarda);
    let logs: Vec<_> = std::fs::read_dir(dir.path().join("logs")).unwrap().flatten().collect();
    assert_eq!(logs.len(), 1);
    let texto = std::fs::read_to_string(logs[0].path()).unwrap();
    assert!(
        texto.contains("olá do KOFstation") && texto.contains("F4a.3"),
        "{texto}"
    );
}
