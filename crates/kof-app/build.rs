// Embute o app web (apps/desktop/dist) no executável, MENOS os núcleos (dist/nucleos): eles ficam na pasta nucleos/ ao
// lado do executável, como no antigo (D33). Sem o build do front (CI, cargo test), embute uma página que explica como
// gerar, pra o Rust compilar sozinho.
use std::path::{Path, PathBuf};

fn copiar_sem_nucleos(de: &Path, para: &Path) {
    std::fs::create_dir_all(para).expect("criar pasta do app");
    for e in std::fs::read_dir(de).expect("ler dist").flatten() {
        let (origem, destino) = (e.path(), para.join(e.file_name()));
        if origem.is_dir() {
            if de.join("index.html").exists() && e.file_name() == "nucleos" {
                continue; // a raiz do dist: os núcleos ficam fora do executável
            }
            copiar_sem_nucleos(&origem, &destino);
        } else {
            std::fs::copy(&origem, &destino).expect("copiar arquivo do app");
        }
    }
}

fn main() {
    let manifesto = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let dist = manifesto.join("../../apps/desktop/dist");
    println!("cargo:rerun-if-changed={}", dist.display());
    let saida = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR")).join("app");
    let _ = std::fs::remove_dir_all(&saida); // de uma compilação anterior: refaz do zero
    if dist.join("index.html").exists() {
        copiar_sem_nucleos(&dist, &saida);
    } else {
        std::fs::create_dir_all(&saida).expect("criar pasta do app");
        std::fs::write(
            saida.join("index.html"),
            "<!doctype html><meta charset=utf-8><p>App web não embutido: rode <code>pnpm build</code> e compile de novo.</p>",
        )
        .expect("gravar index.html");
    }
    println!("cargo:rustc-env=KOF_DIST={}", saida.display());
}
