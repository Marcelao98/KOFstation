//! A pasta Kof Games (estrutura fixa, igual à do antigo): `KOFstation` (o programa), `Games/<console>`, `Novos`,
//! `Config/bios`, `Saves`. A escolha fica em `<dados>/config/raiz.json`. Se o executável mora em
//! `<algo>/KOFstation/`, e `<algo>` tem `Games` ou se chama "Kof Games", essa é a raiz (como o lançador antigo fazia).
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const PASTAS: [&str; 4] = ["Games", "Novos", "Config", "Saves"];
/// As pastas de console dentro de Games (as mesmas do `PASTA_SIS` do domain).
pub const CONSOLES: [&str; 12] = [
    "snes",
    "nes",
    "gb",
    "gbc",
    "gba",
    "megadrive",
    "mastersystem",
    "gamegear",
    "neogeo",
    "psx",
    "n64",
    "ps2",
];
const DE_DENTRO: [&str; 5] = ["kofstation", "games", "novos", "config", "saves"];

#[derive(Debug, Serialize, Deserialize, Default)]
struct Guardado {
    path: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct InfoRaiz {
    /// a raiz em uso (null = ainda não escolhida)
    pub path: Option<String>,
    /// a pasta existe e dá pra usar
    pub ok: bool,
    /// pastas da árvore que faltam (são criadas no `set` e ao varrer)
    pub missing: Vec<String>,
    /// sugestão pra primeira vez (~/Kof Games)
    pub sugestao: String,
}

fn arquivo(dados: &Path) -> PathBuf {
    dados.join("config").join("raiz.json")
}

/// A raiz pela posição do executável (instalado em Kof Games/KOFstation/).
pub fn pela_posicao(exe: &Path) -> Option<PathBuf> {
    let pasta = exe.parent()?;
    if !pasta.file_name()?.to_string_lossy().eq_ignore_ascii_case("kofstation") {
        return None;
    }
    let raiz = pasta.parent()?;
    let nome = raiz.file_name()?.to_string_lossy().to_lowercase();
    (nome == "kof games" || raiz.join("Games").is_dir()).then(|| raiz.to_path_buf())
}

pub fn atual(dados: &Path, exe: Option<&Path>) -> Option<PathBuf> {
    let g: Guardado = std::fs::read_to_string(arquivo(dados))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default();
    g.path.map(PathBuf::from).or_else(|| exe.and_then(pela_posicao))
}

pub fn info(dados: &Path, exe: Option<&Path>, casa: Option<&Path>) -> InfoRaiz {
    let sugestao = casa
        .map(|c| c.join("Kof Games").display().to_string())
        .unwrap_or_else(|| "Kof Games".into());
    match atual(dados, exe) {
        None => InfoRaiz {
            path: None,
            ok: false,
            missing: PASTAS.iter().map(|s| s.to_string()).collect(),
            sugestao,
        },
        Some(r) => InfoRaiz {
            ok: r.is_dir(),
            missing: PASTAS
                .iter()
                .filter(|p| !r.join(p).is_dir())
                .map(|s| s.to_string())
                .collect(),
            path: Some(r.display().to_string()),
            sugestao,
        },
    }
}

/// Cria o que faltar da árvore (Games/<console>, Novos, Config/bios, Saves).
pub fn garantir_arvore(r: &Path) -> Result<(), KofError> {
    let criar = |p: PathBuf| std::fs::create_dir_all(&p).map_err(|e| KofError::de_io(p.display(), e));
    for p in PASTAS {
        criar(r.join(p))?;
    }
    criar(r.join("Config").join("bios"))?;
    for c in CONSOLES {
        criar(r.join("Games").join(c))?;
    }
    Ok(())
}

/// Escolhe a raiz: tem que ser uma pasta (é criada se ainda não existe e o pai existe) e não pode ser uma de dentro.
pub fn escolher(dados: &Path, caminho: &str) -> Result<PathBuf, KofError> {
    let p = PathBuf::from(caminho.trim());
    if !p.is_absolute() {
        return Err(KofError::argumento("path", "use o caminho completo da pasta"));
    }
    let nome = p
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    if DE_DENTRO.contains(&nome.as_str()) || CONSOLES.contains(&nome.as_str()) {
        return Err(KofError::PastaDeDentro(p.display().to_string()));
    }
    if p.exists() && !p.is_dir() {
        return Err(KofError::NaoEPasta(p.display().to_string()));
    }
    if !p.exists() && !p.parent().is_some_and(|x| x.is_dir()) {
        return Err(KofError::NaoEncontrado(p.display().to_string()));
    }
    garantir_arvore(&p)?;
    let arq = arquivo(dados);
    if let Some(d) = arq.parent() {
        std::fs::create_dir_all(d).map_err(|e| KofError::de_io(d.display(), e))?;
    }
    let texto = serde_json::to_string_pretty(&Guardado {
        path: Some(p.display().to_string()),
    })
    .expect("json");
    std::fs::write(&arq, texto).map_err(|e| KofError::de_io(arq.display(), e))?;
    tracing::info!(raiz = %p.display(), "pasta Kof Games escolhida");
    Ok(p)
}
