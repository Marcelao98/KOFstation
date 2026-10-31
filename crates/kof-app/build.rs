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
}
