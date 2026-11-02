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
    pub lojas: kof_files::loja::Lojas,
    /// onde está o executável (a raiz Kof Games pode vir pela posição dele)
    pub exe: Option<PathBuf>,
    /// pasta do usuário (sugestão da Kof Games)
    pub casa: Option<PathBuf>,
    /// o jogo nativo aberto (M11b)
    pub nativos: crate::nativo::Nativos,
    /// endereço da página (`http://127.0.0.1:<porta>`): a WebSocket do nativo só aceita esta origem
    pub origem: std::sync::OnceLock<String>,
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
struct ArgsLoja {
    store: String,
    #[serde(default)]
    key: Option<String>,
    #[serde(default)]
    prefix: Option<String>,
    #[serde(default)]
    meta: Option<Value>,
}

impl ArgsLoja {
    fn chave(&self) -> Result<&str, KofError> {
        self.key
            .as_deref()
            .ok_or_else(|| KofError::argumento("key", "faltou a chave"))
    }
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsCapa {
    acervo: String,
    chave: String,
    #[serde(default)]
    nomes: Vec<String>,
    /// só olha o que já está guardado (sem rede)
    #[serde(default)]
    guardada: bool,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ArgsConfig {
    doc: String,
    #[serde(default)]
    data: Option<Value>,
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
            lojas: kof_files::loja::Lojas::nova(pasta_dados.join("lojas")),
            pasta_dados,
            exe: std::env::current_exe().ok(),
            casa,
            nativos: Default::default(),
            origem: std::sync::OnceLock::new(),
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
            // sinal de vida da janela (a cada 5 s): o servidor fica no ar enquanto ele chega
            "app.vivo" => json(Value::Null),
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
            "config.read" => {
                let a: ArgsConfig = args(a)?;
                json(kof_files::config::ler(&self.pasta_dados, &a.doc)?)
            }
            "config.write" => {
                let a: ArgsConfig = args(a)?;
                let d = a.data.ok_or_else(|| KofError::argumento("data", "faltou"))?;
                kof_files::config::gravar(&self.pasta_dados, &a.doc, &d)?;
                json(Value::Null)
            }
            "store.list" => {
                let a: ArgsLoja = args(a)?;
                json(serde_json::to_value(self.lojas.listar(&a.store, a.prefix.as_deref())?).expect("json"))
            }
            "store.get" => {
                let a: ArgsLoja = args(a)?;
                Ok(Saida::Bin(self.lojas.pegar(&a.store, a.chave()?)?))
            }
            "store.meta" => {
                let a: ArgsLoja = args(a)?;
                json(self.lojas.meta(&a.store, a.chave()?)?)
            }
            "store.put" => {
                let a: ArgsLoja = args(a)?;
                let meta = a.meta.clone().unwrap_or(Value::Null);
                self.lojas.por(&a.store, a.chave()?, &meta, &corpo)?;
                json(Value::Null)
            }
            "store.delete" => {
                let a: ArgsLoja = args(a)?;
                self.lojas.apagar(&a.store, a.chave()?)?;
                json(Value::Null)
            }
            "store.space" => {
                let l: Vec<Value> = self
                    .lojas
                    .espaco()
                    .into_iter()
                    .map(|(store, bytes, items)| serde_json::json!({"store": store, "bytes": bytes, "items": items}))
                    .collect();
                json(Value::Array(l))
            }
            "cover.get" => {
                let a: ArgsCapa = args(a)?;
                let r = if a.guardada {
                    kof_files::capas::guardada(&self.pasta_dados, &a.acervo, &a.chave)?
                } else {
                    kof_files::capas::buscar(&self.pasta_dados, &a.acervo, &a.chave, &a.nomes)?
                };
                r.map(Saida::Bin)
                    .ok_or_else(|| KofError::NaoEncontrado(format!("capa {}", a.chave)))
            }
            "file.read" => {
                let a: ArgsLer = args(a)?;
                let p = kof_files::escopo::resolver(&self.escopo(&a.scope)?, &a.path)?;
                Ok(Saida::Bin(kof_files::escopo::ler(&p, a.offset, a.length)?))
            }
            "nativo.disponivel" => json(serde_json::json!({ "sistemas": crate::nativo::sistemas() })),
            "nativo.abrir" => {
                let a: crate::nativo::ArgsAbrir = args(a)?;
                let jogo = kof_files::escopo::resolver(&self.raiz()?, a.caminho())?;
                let origem = self.origem.get().cloned().unwrap_or_default();
                json(self.nativos.abrir(&self.pasta_dados, jogo, &self.lojas, origem, a)?)
            }
            "nativo.fechar" => {
                self.nativos.fechar();
                json(Value::Null)
            }
            "nativo.log" => json(self.nativos.log()),
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
