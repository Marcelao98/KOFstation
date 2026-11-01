//! Os comandos do contrato (docs/API_CONTRACTS.md). Cada um tem nome e escopo; nada de shell nem de caminho solto.
//! Separado do servidor HTTP pra dar pra testar sem rede.
use kof_core::KofError;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::path::PathBuf;

/// O que um comando devolve: JSON ou bytes (arquivo, save, estado).
pub enum Saida {
    Json(Value),
    #[allow(dead_code)] // os comandos binários (file.read, saves) chegam no M3.2
    Bin(Vec<u8>),
}

pub struct Estado {
    pub pasta_dados: PathBuf,
}

pub fn args<T: DeserializeOwned>(v: Value) -> Result<T, KofError> {
    serde_json::from_value(v).map_err(|e| KofError::argumento("args", e.to_string()))
}

impl Estado {
    pub fn novo(pasta_dados: PathBuf) -> Self {
        Self { pasta_dados }
    }

    /// `corpo`: os bytes que vieram junto (comandos que gravam binário); vazio nos outros.
    pub fn chamar(&self, cmd: &str, a: Value, _corpo: Vec<u8>) -> Result<Saida, KofError> {
        let json = |v: Value| Ok(Saida::Json(v));
        match cmd {
            "app.info" => json(serde_json::to_value(kof_core::info::app_info(&self.pasta_dados)).expect("info")),
            "log.write" => {
                kof_core::log::escrever(&args(a)?)?;
                json(Value::Null)
            }
            outro => Err(KofError::ComandoDesconhecido(outro.to_string())),
        }
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn log_write_e_comando_desconhecido() {
        let e = Estado::novo(std::env::temp_dir());
        let r = e.chamar(
            "log.write",
            serde_json::json!({"level": "error", "target": "tela", "message": "oi"}),
            vec![],
        );
        assert!(matches!(r, Ok(Saida::Json(Value::Null))));
        let r = e.chamar(
            "log.write",
            serde_json::json!({"level": "x", "target": "t", "message": "m"}),
            vec![],
        );
        assert_eq!(r.err().map(|e| e.codigo()), Some("INVALID_LEVEL"));
        let r = e.chamar("shell.run", serde_json::json!({}), vec![]);
        assert_eq!(r.err().map(|e| e.codigo()), Some("UNKNOWN_COMMAND"));
    }
}
