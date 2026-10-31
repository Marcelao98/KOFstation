//! Acha um navegador da família Chromium (Chrome, Chromium, Edge, Brave, Vivaldi, Opera) e abre o app nele em modo app
//! (sem barra de endereço), com perfil próprio. Mesma lista do lançador do app antigo.
use std::path::{Path, PathBuf};
use std::process::{Child, Command};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Navegador {
    /// executável comum
    Programa(PathBuf),
    /// instalado pelo Flatpak (Linux)
    Flatpak(String),
}

const NOMES_LINUX: &[&str] = &[
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "microsoft-edge-stable",
    "microsoft-edge",
    "brave-browser",
    "brave",
    "vivaldi-stable",
    "vivaldi",
    "ungoogled-chromium",
    "opera",
];
const FLATPAKS: &[&str] = &[
    "org.chromium.Chromium",
    "com.google.Chrome",
    "com.brave.Browser",
    "com.microsoft.Edge",
    "com.vivaldi.Vivaldi",
    "io.github.ungoogled_software.ungoogled_chromium",
];

fn no_path(nome: &str, path: &str) -> Option<PathBuf> {
    std::env::split_paths(path).map(|d| d.join(nome)).find(|p| p.is_file())
}

/// Procura nesta ordem: $KOF_NAVEGADOR, os programas conhecidos, os Flatpaks (Linux).
pub fn achar(var: impl Fn(&str) -> Option<String>, existe: impl Fn(&Path) -> bool) -> Option<Navegador> {
    if let Some(n) = var("KOF_NAVEGADOR").filter(|n| !n.is_empty()) {
        return Some(Navegador::Programa(PathBuf::from(n)));
    }
    if cfg!(windows) {
        let mut locais = Vec::new();
        for base in ["ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"] {
            if let Some(b) = var(base) {
                let b = PathBuf::from(b);
                locais.push(b.join("Microsoft/Edge/Application/msedge.exe"));
                locais.push(b.join("Google/Chrome/Application/chrome.exe"));
                locais.push(b.join("BraveSoftware/Brave-Browser/Application/brave.exe"));
            }
        }
        return locais.into_iter().find(|p| existe(p)).map(Navegador::Programa);
    }
    let path = var("PATH").unwrap_or_default();
    if let Some(p) = NOMES_LINUX.iter().find_map(|n| no_path(n, &path)) {
        return Some(Navegador::Programa(p));
    }
    let flatpak = no_path("flatpak", &path)?;
    let lista = Command::new(flatpak)
        .args(["list", "--app", "--columns=application"])
        .output()
        .ok()?;
    let lista = String::from_utf8_lossy(&lista.stdout);
    FLATPAKS
        .iter()
        .find(|id| lista.lines().any(|l| l.trim() == **id))
        .map(|id| Navegador::Flatpak(id.to_string()))
}

/// Argumentos do modo app. O perfil é só do KOFstation (não mexe no navegador normal da pessoa).
pub fn argumentos(url: &str, perfil: &Path) -> Vec<String> {
    vec![
        format!("--app={url}"),
        format!("--user-data-dir={}", perfil.display()),
        "--class=KOFstation".into(),
        "--no-first-run".into(),
        "--no-default-browser-check".into(),
        "--disable-background-timer-throttling".into(),
        "--autoplay-policy=no-user-gesture-required".into(),
    ]
}

pub fn abrir(n: &Navegador, url: &str, perfil: &Path) -> std::io::Result<Child> {
    match n {
        Navegador::Programa(p) => Command::new(p).args(argumentos(url, perfil)).spawn(),
        Navegador::Flatpak(id) => Command::new("flatpak")
            .arg("run")
            .arg(id)
            .args(argumentos(url, perfil))
            .spawn(),
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn kof_navegador_vence() {
        let n = achar(|k| (k == "KOF_NAVEGADOR").then(|| "/opt/meu/chrome".into()), |_| false);
        assert_eq!(n, Some(Navegador::Programa("/opt/meu/chrome".into())));
    }

    #[test]
    fn modo_app_com_perfil_proprio() {
        let a = argumentos("http://127.0.0.1:1/?t=x", Path::new("/tmp/perfil"));
        assert!(a.contains(&"--app=http://127.0.0.1:1/?t=x".to_string()));
        assert!(a.iter().any(|x| x == "--user-data-dir=/tmp/perfil"));
    }
}
