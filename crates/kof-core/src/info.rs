//! `app.info`: quem é este backend e onde ele guarda os dados.
use crate::contrato::{AppInfo, Os, CONTRACT_VERSION};
use std::path::PathBuf;

/// Pasta de dados do app (fora da Kof Games): `$XDG_DATA_HOME/KOFstation` ou `~/.local/share/KOFstation` no Linux,
/// `%LOCALAPPDATA%\KOFstation` no Windows. As variáveis vêm por parâmetro pra dar pra testar.
pub fn pasta_de_dados(var: impl Fn(&str) -> Option<String>) -> Option<PathBuf> {
    if cfg!(windows) {
        return var("LOCALAPPDATA").map(|p| PathBuf::from(p).join("KOFstation"));
    }
    if let Some(x) = var("XDG_DATA_HOME").filter(|x| !x.is_empty()) {
        return Some(PathBuf::from(x).join("KOFstation"));
    }
    var("HOME").map(|h| PathBuf::from(h).join(".local/share/KOFstation"))
}

pub fn os_atual() -> Os {
    match std::env::consts::OS {
        "linux" => Os::Linux,
        "windows" => Os::Windows,
        "macos" => Os::Macos,
        "android" => Os::Android,
        _ => Os::Other,
    }
}

pub fn app_info(pasta: &std::path::Path) -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        contract_version: CONTRACT_VERSION,
        os: os_atual(),
        arch: std::env::consts::ARCH.to_string(),
        data_dir: pasta.display().to_string(),
    }
}
