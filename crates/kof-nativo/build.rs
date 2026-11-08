// A ponte do log (printf variádico do libretro → Rust) é C. Os testes compilam um núcleo mínimo pro alvo atual.
fn main() {
    cc::Build::new()
        .file("src/ponte.c")
        .warnings(true)
        .compile("kof_nativo_ponte");
    println!(
        "cargo:rustc-env=KOF_ALVO={}",
        std::env::var("TARGET").unwrap_or_default()
    );
    println!("cargo:rerun-if-changed=src/ponte.c");
}
