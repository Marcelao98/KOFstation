//! Compila o núcleo mínimo (`tests/nucleo/minimo.c`) numa biblioteca dinâmica pro alvo atual.
use std::path::{Path, PathBuf};

#[allow(dead_code)] // cada arquivo de teste usa uma parte
pub fn compilar_minimo(pasta: &Path) -> PathBuf {
    compilar(pasta, "minimo")
}

/// Compila `tests/nucleo/<nome>.c` numa biblioteca dinâmica.
pub fn compilar(pasta: &Path, nome: &str) -> PathBuf {
    let fonte = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("tests/nucleo/{nome}.c"));
    let alvo = env!("KOF_ALVO");
    let cc = cc::Build::new()
        .target(alvo)
        .host(alvo)
        .opt_level(0)
        .out_dir(pasta)
        .cargo_metadata(false)
        .get_compiler();
    let saida = pasta.join(format!("{nome}.{}", if cfg!(windows) { "dll" } else { "so" }));
    let mut cmd = cc.to_command();
    if cc.is_like_msvc() {
        cmd.arg("/LD").arg(&fonte).arg(format!("/Fe:{}", saida.display()));
        cmd.current_dir(pasta);
    } else {
        cmd.args(["-shared", "-fPIC", "-fvisibility=hidden", "-o"])
            .arg(&saida)
            .arg(&fonte);
    }
    let r = cmd.output().expect("compilador C");
    assert!(
        r.status.success(),
        "o núcleo mínimo não compilou:\n{}\n{}",
        String::from_utf8_lossy(&r.stdout),
        String::from_utf8_lossy(&r.stderr)
    );
    saida
}
