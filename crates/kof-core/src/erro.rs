//! Erros do backend. Cada variante tem um código estável (o app traduz pela tabela de mensagens); nada de erro genérico.
use crate::contrato::ContractError;
use serde_json::Value;
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
    #[error("argumento inválido em {campo}: {motivo}")]
    Argumento { campo: String, motivo: String },
    #[error("nível de log inválido: {0} (use error, warn, info ou debug)")]
    NivelInvalido(String),
    #[error("caminho fora do escopo: {0}")]
    ForaDoEscopo(String),
    #[error("não encontrado: {0}")]
    NaoEncontrado(String),
    #[error("a pasta Kof Games ainda não foi escolhida ou sumiu: {0}")]
    RaizFaltando(String),
    #[error("essa é uma pasta de dentro da Kof Games (escolha a de cima): {0}")]
    PastaDeDentro(String),
    #[error("isso não é uma pasta: {0}")]
    NaoEPasta(String),
    #[error("sem permissão: {0}")]
    SemPermissao(String),
    #[error("já existe: {0}")]
    Conflito(String),
    #[error("disco cheio ao gravar {0}")]
    DiscoCheio(String),
    #[error("documento de configuração mais novo que este app ({0})")]
    EsquemaNovo(String),
    #[error("erro de rede: {0}")]
    Rede(String),
    #[error("o núcleo nativo falhou: {0}")]
    Nucleo(String),
    #[error("erro de arquivo em {caminho}: {fonte}")]
    Io {
        caminho: String,
        #[source]
        fonte: std::io::Error,
    },
}

impl KofError {
    pub fn codigo(&self) -> &'static str {
        match self {
            KofError::ComandoDesconhecido(_) => "UNKNOWN_COMMAND",
            KofError::PastaDeDados { .. } => "DATA_DIR_UNAVAILABLE",
            KofError::Log(_) => "LOG_UNAVAILABLE",
            KofError::Argumento { .. } => "INVALID_ARGS",
            KofError::NivelInvalido(_) => "INVALID_LEVEL",
            KofError::ForaDoEscopo(_) => "PATH_OUTSIDE_SCOPE",
            KofError::NaoEncontrado(_) => "NOT_FOUND",
            KofError::RaizFaltando(_) => "ROOT_MISSING",
            KofError::NaoEPasta(_) => "NOT_A_DIRECTORY",
            KofError::PastaDeDentro(_) => "INNER_FOLDER",
            KofError::SemPermissao(_) => "PERMISSION_DENIED",
            KofError::Conflito(_) => "CONFLICT",
            KofError::DiscoCheio(_) => "DISK_FULL",
            KofError::EsquemaNovo(_) => "SCHEMA_TOO_NEW",
            KofError::Rede(_) => "NETWORK",
            KofError::Nucleo(_) => "CORE_FAILED",
            KofError::Io { .. } => "IO_ERROR",
        }
    }

    /// Erro de E/S com o código certo (não achou, sem permissão, disco cheio, o resto).
    pub fn de_io(caminho: impl std::fmt::Display, fonte: std::io::Error) -> KofError {
        let c = caminho.to_string();
        match fonte.kind() {
            std::io::ErrorKind::NotFound => KofError::NaoEncontrado(c),
            std::io::ErrorKind::PermissionDenied => KofError::SemPermissao(c),
            std::io::ErrorKind::StorageFull => KofError::DiscoCheio(c),
            _ => KofError::Io { caminho: c, fonte },
        }
    }

    pub fn argumento(campo: &str, motivo: impl Into<String>) -> KofError {
        KofError::Argumento {
            campo: campo.to_string(),
            motivo: motivo.into(),
        }
    }
}

impl From<&KofError> for ContractError {
    fn from(e: &KofError) -> Self {
        let um = |k: &str, v: String| Some(BTreeMap::from([(k.to_string(), Value::String(v))]));
        let details = match e {
            KofError::PastaDeDados { caminho, .. } => um("path", caminho.display().to_string()),
            KofError::ComandoDesconhecido(c) => um("cmd", c.clone()),
            KofError::Argumento { campo, .. } => um("field", campo.clone()),
            KofError::ForaDoEscopo(p)
            | KofError::NaoEncontrado(p)
            | KofError::RaizFaltando(p)
            | KofError::NaoEPasta(p)
            | KofError::PastaDeDentro(p)
            | KofError::SemPermissao(p)
            | KofError::Conflito(p)
            | KofError::DiscoCheio(p) => um("path", p.clone()),
            KofError::Io { caminho, .. } => um("path", caminho.clone()),
            _ => None,
        };
        ContractError {
            code: e.codigo().to_string(),
            message: e.to_string(),
            details,
        }
    }
}
