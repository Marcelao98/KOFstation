//! A rede entre aparelhos (M13) dentro do `kofstation`: o serviço do `kof-net` abre junto com o app (como o kofservico
//! abria junto com o lançador do antigo), pra o celular achar e conectar mesmo antes de alguém abrir a tela Aparelhos.
//! A página conversa por uma WebSocket local (porta qualquer, token desta abertura, só a origem da página): o
//! `rede.ligar` diz onde.
use kof_core::KofError;
use kof_net::pagina::{self, Acesso};
use kof_net::{Config, Servico};
use std::path::Path;
use std::sync::{Arc, OnceLock};

/// O serviço aberto, a porta da WebSocket da página e o token; ou o motivo de não ter aberto.
type Aberta = Result<(Arc<Servico>, u16, String), String>;

pub struct Rede {
    /// (serviço, porta da WebSocket, token) ou o motivo de não ter aberto
    aberta: OnceLock<Aberta>,
}

impl Rede {
    pub fn nova() -> Self {
        Self {
            aberta: OnceLock::new(),
        }
    }

    /// Abre o serviço (uma vez). `origem` = a da página (`http://127.0.0.1:<porta>`).
    pub fn abrir(&self, pasta_dados: &Path, origem: &str) -> &Aberta {
        self.aberta.get_or_init(|| {
            if std::env::var_os("KOF_SEM_REDE").is_some() {
                return Err("rede desligada (KOF_SEM_REDE)".into());
            }
            let s = Servico::abrir(Config::nova(pasta_dados.join("rede"))).map_err(|e| e.to_string())?;
            let mut b = [0u8; 16];
            getrandom::fill(&mut b).map_err(|e| format!("sem números aleatórios: {e}"))?;
            let token: String = b.iter().map(|x| format!("{x:02x}")).collect();
            let acesso = Acesso::Token {
                token: token.clone(),
                origem: origem.to_string(),
            };
            let porta =
                pagina::abrir(s.clone(), 0, acesso).map_err(|e| format!("a WebSocket da rede não abriu: {e}"))?;
            tracing::info!(target: "rede", id = s.id(), tcp = s.porta_tcp(), "rede entre aparelhos aberta");
            Ok((s, porta, token))
        })
    }

    /// O que o `rede.ligar` devolve.
    pub fn ligar(&self, pasta_dados: &Path, origem: &str) -> Result<serde_json::Value, KofError> {
        match self.abrir(pasta_dados, origem) {
            Ok((s, porta, token)) => {
                Ok(serde_json::json!({"porta": porta, "token": token, "id": s.id(), "tcp": s.porta_tcp()}))
            }
            Err(e) => Err(KofError::Rede(format!("a rede entre aparelhos não abriu: {e}"))),
        }
    }
}
