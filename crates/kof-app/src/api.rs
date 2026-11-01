//! Os comandos do contrato (docs/API_CONTRACTS.md). Cada um tem nome e escopo; nada de shell nem de caminho solto.
//! Separado do servidor HTTP pra dar pra testar sem rede.
use kof_core::KofError;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::path::PathBuf;

/// O que um comando devolve: JSON ou bytes (arquivo, save, estado).
pub enum Saida {
    Json(Value),
    Bin(Vec<u8>),
}

pub struct Estado {
    pub pasta_dados: PathBuf,
    /// onde está o executável (a raiz Kof Games pode vir pela posição dele)
    pub exe: Option<PathBuf>,
    /// pasta do usuário (sugestão da Kof Games)
    pub casa: Option<PathBuf>,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsRaiz {
    path: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsVarrer {
    exts: Vec<String>,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsCrc {
    items: Vec<kof_files::biblioteca::PedidoCrc>,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsAplicar {
    moves: Vec<kof_files::organizar::Movimento>,
    #[serde(default)]
    limpar: Vec<String>,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsGuardar {
    pasta: String,
    nome: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsLer {
    scope: String,
    path: String,
    #[serde(default)]
    offset: u64,
    #[serde(default)]
    length: Option<u64>,
}

pub fn args<T: DeserializeOwned>(v: Value) -> Result<T, KofError> {
    serde_json::from_value(v).map_err(|e| KofError::argumento("args", e.to_string()))
}

impl Estado {
    pub fn novo(pasta_dados: PathBuf) -> Self {
        let casa = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from);
        Self {
            pasta_dados,
            exe: std::env::current_exe().ok(),
            casa,
        }
    }

    fn raiz(&self) -> Result<PathBuf, KofError> {
        let r = kof_files::raiz::atual(&self.pasta_dados, self.exe.as_deref())
            .ok_or_else(|| KofError::RaizFaltando("(não escolhida)".into()))?;
        if !r.is_dir() {
            return Err(KofError::RaizFaltando(r.display().to_string()));
        }
        Ok(r)
    }

    /// A base de um escopo do contrato.
    fn escopo(&self, nome: &str) -> Result<PathBuf, KofError> {
        match nome {
            "kof-games" => self.raiz(),
            outro => Err(KofError::argumento("scope", format!("escopo desconhecido: {outro}"))),
        }
    }

    fn info_raiz(&self) -> Value {
        serde_json::to_value(kof_files::raiz::info(
            &self.pasta_dados,
            self.exe.as_deref(),
            self.casa.as_deref(),
        ))
        .expect("json")
    }

    /// `corpo`: os bytes que vieram junto (comandos que gravam binário); vazio nos outros.
    pub fn chamar(&self, cmd: &str, a: Value, corpo: Vec<u8>) -> Result<Saida, KofError> {
        let json = |v: Value| Ok(Saida::Json(v));
        match cmd {
            "app.info" => json(serde_json::to_value(kof_core::info::app_info(&self.pasta_dados)).expect("info")),
            "log.write" => {
                kof_core::log::escrever(&args(a)?)?;
                json(Value::Null)
            }
            "library.root.get" => json(self.info_raiz()),
            "library.root.set" => {
                let a: ArgsRaiz = args(a)?;
                kof_files::raiz::escolher(&self.pasta_dados, &a.path)?;
                json(self.info_raiz())
            }
            "library.scan" => {
                let a: ArgsVarrer = args(a)?;
                let r = self.raiz()?;
                kof_files::raiz::garantir_arvore(&r)?;
                let exts = a.exts.into_iter().map(|e| e.to_lowercase()).collect();
                let files = kof_files::biblioteca::varrer(&r, &exts)?;
                json(serde_json::json!({ "root": r.display().to_string(), "files": files }))
            }
            "library.crc" => {
                let a: ArgsCrc = args(a)?;
                let c = kof_files::biblioteca::crcs(&self.pasta_dados, &self.raiz()?, &a.items)?;
                json(serde_json::json!({ "crcs": c }))
            }
            "library.inventory" => {
                let r = self.raiz()?;
                kof_files::raiz::garantir_arvore(&r)?;
                json(serde_json::to_value(kof_files::organizar::inventario(&r)?).expect("json"))
            }
            "library.organize.apply" => {
                let a: ArgsAplicar = args(a)?;
                let r = kof_files::organizar::aplicar(&self.raiz()?, &a.moves, &a.limpar);
                json(serde_json::to_value(r).expect("json"))
            }
            "library.import" => {
                let a: ArgsGuardar = args(a)?;
                let r = kof_files::organizar::guardar(&self.raiz()?, &a.pasta, &a.nome, &corpo)?;
                json(serde_json::json!({ "stored": r }))
            }
            "file.read" => {
                let a: ArgsLer = args(a)?;
                let p = kof_files::escopo::resolver(&self.escopo(&a.scope)?, &a.path)?;
                Ok(Saida::Bin(kof_files::escopo::ler(&p, a.offset, a.length)?))
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
            "file.read",
            serde_json::json!({"scope": "sistema", "path": "x"}),
            vec![],
        );
        assert_eq!(r.err().map(|e| e.codigo()), Some("INVALID_ARGS"));
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
