// Embute o app web (apps/desktop/dist) no executável. Sem o build do front (CI, cargo test), embute uma página que
// explica como gerar, pra o Rust compilar sozinho.
use std::path::PathBuf;

fn main() {
    let manifesto = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let dist = manifesto.join("../../apps/desktop/dist");
    println!("cargo:rerun-if-changed={}", dist.display());
    let pasta = if dist.join("index.html").exists() {
        dist.canonicalize().expect("dist")
    } else {
        let vazio = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR")).join("dist-vazio");
        std::fs::create_dir_all(&vazio).expect("criar dist-vazio");
        std::fs::write(
            vazio.join("index.html"),
            "<!doctype html><meta charset=utf-8><p>App web não embutido: rode <code>pnpm build</code> e compile de novo.</p>",
        )
        .expect("gravar index.html");
        vazio
    };
    println!("cargo:rustc-env=KOF_DIST={}", pasta.display());
    nativos(&manifesto);
}

/// Embute os núcleos nativos da plataforma alvo (third_party/cores/nativos/<plataforma>/, do `pnpm nucleos`). Sem
/// eles o app compila igual e o PS1 roda no wasm (a reserva). O nome extraído leva um hash do conteúdo.
fn nativos(manifesto: &std::path::Path) {
    let os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let arch = std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    let (plat, ext) = match (os.as_str(), arch.as_str()) {
        ("linux", "x86_64") => ("linux-x64", "so"),
        ("windows", "x86_64") => ("windows-x64", "dll"),
        ("linux", "aarch64") => ("linux-arm64", "so"),
        _ => ("outra", "so"),
    };
    let pasta = manifesto.join("../../third_party/cores/nativos").join(plat);
    println!("cargo:rerun-if-changed={}", pasta.display());
    let mut linhas = Vec::new();
    for (sistema, base) in [("ps1", "pcsx_rearmed_libretro")] {
        let arq = pasta.join(format!("{base}.{ext}"));
        println!("cargo:rerun-if-changed={}", arq.display());
        let Ok(dados) = std::fs::read(&arq) else { continue };
        // FNV-1a 64: só pra o nome mudar quando o núcleo muda (a integridade vem do manifesto, no `pnpm nucleos`)
        let h = dados.iter().fold(0xcbf2_9ce4_8422_2325u64, |h, b| {
            (h ^ *b as u64).wrapping_mul(0x100_0000_01b3)
        });
        linhas.push(format!(
            "    (\"{sistema}\", \"{h:016x}-{base}.{ext}\", include_bytes!({:?})),",
            arq.canonicalize().expect("núcleo nativo").display().to_string()
        ));
    }
    let codigo = format!(
        "/// (sistema, nome do arquivo extraído, bytes) dos núcleos nativos embutidos.\npub static NUCLEOS: &[(&str, &str, &[u8])] = &[\n{}\n];\n",
        linhas.join("\n")
    );
    let saida = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR")).join("nativos.rs");
    std::fs::write(saida, codigo).expect("gravar nativos.rs");
}
