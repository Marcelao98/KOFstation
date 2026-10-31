//! Erros do backend. Cada variante tem um código estável (o app traduz pela tabela de mensagens); nada de erro genérico.
use crate::contrato::ContractError;
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum KofError {
    #[error("comando desconhecido: {0}")]
    ComandoDesconhecido(String),
    #[error("não consegui criar a pasta de dados {caminho}: {fonte}")]
    PastaDeDados {
        caminho: PathBuf,
        #[source]
        fonte: std::io::Error,
    },
    #[error("não consegui ligar o log: {0}")]
    Log(String),
}

impl KofError {
    pub fn codigo(&self) -> &'static str {
        match self {
            KofError::ComandoDesconhecido(_) => "UNKNOWN_COMMAND",
            KofError::PastaDeDados { .. } => "DATA_DIR_UNAVAILABLE",
            KofError::Log(_) => "LOG_UNAVAILABLE",
        }
    }
}

impl From<&KofError> for ContractError {
    fn from(e: &KofError) -> Self {
        let details = match e {
            KofError::PastaDeDados { caminho, .. } => Some(BTreeMap::from([(
                "path".to_string(),
                serde_json::Value::String(caminho.display().to_string()),
            )])),
            KofError::ComandoDesconhecido(c) => Some(BTreeMap::from([(
                "cmd".to_string(),
                serde_json::Value::String(c.clone()),
            )])),
            KofError::Log(_) => None,
        };
        ContractError {
            code: e.codigo().to_string(),
            message: e.to_string(),
            details,
        }
    }
}
