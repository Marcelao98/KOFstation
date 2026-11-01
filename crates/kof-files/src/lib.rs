//! Tudo que mexe em arquivo do usuário. Cada caminho que chega do app é relativo a um escopo conhecido
//! (docs/API_CONTRACTS.md §2) e passa por [`escopo::resolver`]; nada de caminho absoluto vindo da tela.
pub mod biblioteca;
pub mod escopo;
pub mod loja;
pub mod organizar;
pub mod raiz;
pub mod zip;
