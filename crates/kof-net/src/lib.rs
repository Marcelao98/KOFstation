//! Rede entre aparelhos do KOFstation (M13): o mesmo protocolo do antigo (`third_party/kofrede/PROTOCOLO.md`), pra
//! parear e conversar com o APK atual. O núcleo (`kofrede.c`) é o do antigo, por FFI ([`ffi`]); o serviço
//! ([`servico`], o `kofservico.c` em Rust) e a WebSocket da página ([`pagina`]) são daqui.
pub mod ffi;
pub mod pagina;
pub mod servico;

pub use servico::{Config, Servico};
