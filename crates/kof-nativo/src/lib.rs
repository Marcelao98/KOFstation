//! Núcleos libretro nativos (`.so`/`.dll`) fora do navegador (M11b, D32).
//!
//! O núcleo roda num **processo filho** (`filho`), um por jogo: se ele quebrar, só o filho morre. O `kofstation` abre e
//! vigia pelo `supervisor`. O som sai pela placa (`som`, ditando o ritmo); a imagem vai pra página por uma WebSocket
//! local com token (`canal`, formato em `protocolo`), e a página desenha com os mesmos filtros e molduras; os botões
//! voltam pelo mesmo canal.
pub mod canal;
pub mod filho;
pub mod gl;
pub mod libretro;
pub mod nucleo;
pub mod protocolo;
pub mod som;
pub mod supervisor;

pub use nucleo::{Entrada, Quadro};
pub use supervisor::{Pedido, ProcessoNativo};

/// Pasta dos núcleos nativos desta plataforma (`third_party/cores/nativos/<plataforma>/`, igual ao manifesto).
pub fn plataforma() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "windows-x64",
        ("linux", "x86_64") => "linux-x64",
        ("linux", "aarch64") => "linux-arm64",
        _ => "outra",
    }
}
