// Compila o kofrede.c e o Monocypher do antigo (third_party/kofrede, cópia sem mudança: o SHA-256 de cada um está no
// LEIA-ME.md de lá). É o mesmo código da libkofrede.so do APK: o pareamento com o celular é o mesmo byte a byte.
use std::path::PathBuf;

fn main() {
    let raiz = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"))
        .join("../../third_party/kofrede");
    for a in [
        "kofrede.c",
        "kofrede.h",
        "terceiros/monocypher.c",
        "terceiros/monocypher.h",
    ] {
        println!("cargo:rerun-if-changed={}", raiz.join(a).display());
    }
    let mut b = cc::Build::new();
    // o kofrede.c usa os __builtin_* do gcc/clang (pro celular, sem libc); o compilador da Microsoft não tem: lá vão as
    // funções da biblioteca do C mesmo (o arquivo continua igual ao do antigo)
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        b.define("__builtin_memcpy", "memcpy")
            .define("__builtin_memset", "memset")
            .define("__builtin_strlen", "strlen")
            .flag("/FIstring.h");
    }
    b.file(raiz.join("kofrede.c"))
        .file(raiz.join("terceiros/monocypher.c"))
        .include(&raiz)
        .opt_level(2)
        .warnings(false)
        .compile("kofrede");
}
