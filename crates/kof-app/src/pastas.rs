//! Onde ficam os núcleos (D33), igual ao app antigo: ao lado do executável,
//!
//! ```text
//! KOFstation/
//!   kofstation (ou KOFstation.exe)
//!   nucleos/   núcleos em WebAssembly e dados (trilha, base de jogos), um arquivo por núcleo, com o hash no nome
//!              (lista.json diz qual arquivo é de qual núcleo)
//!   nativo/    núcleos nativos (PCSX-ReARMed .so/.dll)
//!   versao.txt
//! ```
//!
//! O executável fica pequeno e dá pra trocar um núcleo sem baixar o app inteiro (a base do atualizador, M15.1).
//! Rodando do código (`cargo run`, `rodar.sh`), sem essas pastas do lado, usa as do repositório.
use std::path::{Path, PathBuf};

/// A pasta do executável.
pub fn do_executavel() -> Option<PathBuf> {
    std::env::current_exe().ok()?.parent().map(Path::to_path_buf)
}

/// A raiz do repositório (onde o executável foi compilado), pra rodar do código sem empacotar.
fn repositorio() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

/// Só um nome de arquivo (sem pasta, sem `..`): o que vem da URL nunca sai da pasta.
pub fn nome_simples(n: &str) -> Option<&str> {
    let ok = !n.is_empty() && !n.contains(['/', '\\', ':', '\0']) && n != "." && n != ".." && !n.starts_with('.');
    ok.then_some(n)
}

/// O arquivo de um núcleo em WebAssembly pedido pela página como `nucleos/<nome>` (ex.: `snes9x.js`).
pub fn nucleo_wasm(nome: &str) -> Option<PathBuf> {
    nucleo_wasm_em(do_executavel().as_deref(), &repositorio(), nome)
}

pub fn nucleo_wasm_em(exe: Option<&Path>, repo: &Path, nome: &str) -> Option<PathBuf> {
    let nome = nome_simples(nome)?;
    if let Some(d) = exe.map(|e| e.join("nucleos")).filter(|d| d.is_dir()) {
        // pacote: lista.json { "snes9x.js": "snes9x-e10af616.js", ... }
        let lista = std::fs::read(d.join("lista.json"))
            .ok()
            .and_then(|b| serde_json::from_slice::<std::collections::BTreeMap<String, String>>(&b).ok());
        let arq = lista
            .as_ref()
            .and_then(|l| l.get(nome))
            .and_then(|a| nome_simples(a))
            .unwrap_or(nome);
        let p = d.join(arq);
        return p.is_file().then_some(p);
    }
    let p = repo.join("apps/desktop/public/nucleos").join(nome);
    p.is_file().then_some(p)
}

/// A plataforma desta compilação, como nas pastas do manifesto.
pub fn plataforma() -> &'static str {
    kof_nativo::plataforma()
}

/// O núcleo nativo de um sistema (hoje só o PS1), se existir.
pub fn nucleo_nativo(sistema: &str) -> Option<PathBuf> {
    nucleo_nativo_em(do_executavel().as_deref(), &repositorio(), sistema)
}

pub fn nucleo_nativo_em(exe: Option<&Path>, repo: &Path, sistema: &str) -> Option<PathBuf> {
    let base = match sistema {
        "ps1" => "pcsx_rearmed_libretro",
        _ => return None,
    };
    let arq = format!("{base}.{}", if cfg!(windows) { "dll" } else { "so" });
    if let Some(p) = exe.map(|e| e.join("nativo").join(&arq)).filter(|p| p.is_file()) {
        return Some(p);
    }
    let p = repo.join("third_party/cores/nativos").join(plataforma()).join(&arq);
    p.is_file().then_some(p)
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn nucleos_da_pasta_do_pacote_pela_lista_e_do_repositorio_sem_ela() {
        let d = tempfile::tempdir().unwrap();
        let exe = d.path().join("app");
        let repo = d.path().join("repo");
        std::fs::create_dir_all(exe.join("nucleos")).unwrap();
        std::fs::create_dir_all(repo.join("apps/desktop/public/nucleos")).unwrap();
        std::fs::write(exe.join("nucleos/snes9x-abc12345.js"), "x").unwrap();
        std::fs::write(exe.join("nucleos/lista.json"), r#"{"snes9x.js":"snes9x-abc12345.js"}"#).unwrap();
        std::fs::write(repo.join("apps/desktop/public/nucleos/gambatte.js"), "y").unwrap();
        assert_eq!(
            nucleo_wasm_em(Some(&exe), &repo, "snes9x.js"),
            Some(exe.join("nucleos/snes9x-abc12345.js"))
        );
        // pacote presente: não cai pro repositório
        assert_eq!(nucleo_wasm_em(Some(&exe), &repo, "gambatte.js"), None);
        // sem pacote: o do repositório
        assert_eq!(
            nucleo_wasm_em(Some(&repo), &repo, "gambatte.js"),
            Some(repo.join("apps/desktop/public/nucleos/gambatte.js"))
        );
        for ruim in ["../segredo", "a/b", "..", ".lista", "c:x"] {
            assert_eq!(nucleo_wasm_em(Some(&exe), &repo, ruim), None, "{ruim}");
        }
    }

    #[test]
    fn nativo_ao_lado_do_executavel() {
        let d = tempfile::tempdir().unwrap();
        let ext = if cfg!(windows) { "dll" } else { "so" };
        std::fs::create_dir_all(d.path().join("nativo")).unwrap();
        std::fs::write(d.path().join(format!("nativo/pcsx_rearmed_libretro.{ext}")), "z").unwrap();
        assert!(nucleo_nativo_em(Some(d.path()), d.path(), "ps1").is_some());
        assert!(nucleo_nativo_em(Some(d.path()), d.path(), "ps2").is_none());
    }
}
