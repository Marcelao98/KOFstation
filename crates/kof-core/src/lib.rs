//! Núcleo do backend do KOFstation: tipos do contrato com o app (`docs/API_CONTRACTS.md`), erros e logs.
//! Não depende de Tauri nem de servidor: a casca (decidida no passo F4b) só chama estas funções.

pub mod contrato;
pub mod erro;
pub mod info;
pub mod log;

pub use contrato::{AppInfo, ContractError, CONTRACT_VERSION};
pub use erro::KofError;
