//! A WebSocket local entre o processo nativo e a página: só `127.0.0.1`, token na URL (`?t=`) e, quando o navegador
//! manda `Origin`, ele tem que ser o do app. Uma página por vez: conectou outra (recarregou), a anterior cai.
use crate::nucleo::Entrada;
use crate::protocolo::{self, Aviso, Binario, Comando};
use std::collections::VecDeque;
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tungstenite::{Message, WebSocket};

/// O que a página pediu, na ordem em que chegou (o laço do núcleo consome).
#[derive(Debug)]
pub enum Pedido {
    Conectou,
    /// o stdin fechou: o app foi embora
    AppFechou,
    Comando(Comando),
    Entrada(usize, Entrada),
    CarregarEstado(u32, Vec<u8>),
    GravarBateria(u32, Vec<u8>),
}

/// Quadros publicados que a conexão ainda não mandou. Passou disso, a página está lenta: os mais velhos saem
/// (mostrar atrasado é pior que pular).
const MAX_NA_FILA: usize = 6;

#[derive(Default)]
struct Ultimo {
    /// o mais novo (volta quando uma página nova conecta)
    bytes: Arc<Vec<u8>>,
    fila: VecDeque<Arc<Vec<u8>>>,
    /// quadros tirados da fila sem mandar porque a página não acompanhou
    descartados: u64,
}

/// Parte compartilhada entre o laço do núcleo e a linha da conexão.
pub struct Canal {
    quadro: Mutex<Ultimo>,
    saida: Mutex<VecDeque<Message>>,
    geracao: AtomicU64,
    pub porta: u16,
}

/// Confere a URL e a origem da conexão (separado pra testar sem rede).
pub fn autorizado(uri_query: Option<&str>, origem: Option<&str>, token: &str, origem_ok: Option<&str>) -> bool {
    let token_ok = uri_query
        .unwrap_or("")
        .split('&')
        .any(|p| p.strip_prefix("t=").is_some_and(|t| !token.is_empty() && t == token));
    let origem_bate = match (origem, origem_ok) {
        (None, _) => true, // programa local sem navegador (os testes, o kofstation)
        (Some(o), Some(ok)) => o == ok,
        (Some(_), None) => false,
    };
    token_ok && origem_bate
}

fn recusar() -> ErrorResponse {
    let mut r = ErrorResponse::new(Some("token ou origem inválidos".into()));
    *r.status_mut() = tungstenite::http::StatusCode::FORBIDDEN;
    r
}

impl Canal {
    /// Abre a porta e começa a aceitar conexões numa linha própria.
    pub fn abrir(token: String, origem: Option<String>, pedidos: Sender<Pedido>) -> std::io::Result<Arc<Canal>> {
        let ouvinte = TcpListener::bind("127.0.0.1:0")?;
        let porta = ouvinte.local_addr()?.port();
        let canal = Arc::new(Canal {
            quadro: Mutex::new(Ultimo::default()),
            saida: Mutex::new(VecDeque::new()),
            geracao: AtomicU64::new(0),
            porta,
        });
        let c = canal.clone();
        std::thread::Builder::new().name("canal".into()).spawn(move || {
            for s in ouvinte.incoming() {
                let s = match s {
                    Ok(s) => s,
                    Err(e) => {
                        tracing::warn!("conexão não aceita: {e}");
                        continue;
                    }
                };
                let (c, tk, og, tx) = (c.clone(), token.clone(), origem.clone(), pedidos.clone());
                // o aperto de mão fica na linha da conexão: uma conexão lenta não segura as outras
                let r = std::thread::Builder::new()
                    .name("conexao".into())
                    .spawn(move || c.atender(s, &tk, og.as_deref(), tx));
                if let Err(e) = r {
                    tracing::error!("sem linha pra conexão: {e}");
                }
            }
        })?;
        Ok(canal)
    }

    /// Põe o quadro na fila de envio, na ordem em que o núcleo fez (a conexão manda todos). Se a página não acompanha
    /// e a fila passa de `MAX_NA_FILA`, os mais velhos saem.
    pub fn publicar_quadro(&self, bytes: Vec<u8>) {
        let mut u = self.quadro.lock().unwrap_or_else(|e| e.into_inner());
        let b = Arc::new(bytes);
        u.bytes = b.clone();
        u.fila.push_back(b);
        while u.fila.len() > MAX_NA_FILA {
            u.fila.pop_front();
            u.descartados += 1;
        }
    }

    /// Quadros que a fila jogou fora por a página estar lenta (pro diagnóstico).
    pub fn descartados(&self) -> u64 {
        self.quadro.lock().unwrap_or_else(|e| e.into_inner()).descartados
    }

    /// Faz a próxima conexão (ou a atual) receber o último quadro de novo.
    pub fn reenviar_quadro(&self) {
        let mut u = self.quadro.lock().unwrap_or_else(|e| e.into_inner());
        u.fila.clear();
        if !u.bytes.is_empty() {
            let b = u.bytes.clone();
            u.fila.push_back(b);
        }
    }

    pub fn avisar(&self, a: &Aviso) {
        match serde_json::to_string(a) {
            Ok(t) => self.mandar(Message::text(t)),
            Err(e) => tracing::error!("aviso não serializou: {e}"),
        }
    }

    pub fn mandar(&self, m: Message) {
        let mut s = self.saida.lock().unwrap_or_else(|e| e.into_inner());
        if s.len() > 64 {
            s.pop_front(); // ninguém lendo: não acumula pra sempre
        }
        s.push_back(m);
    }

    #[allow(clippy::result_large_err)] // o tipo do erro é o do tungstenite (resposta HTTP)
    fn atender(&self, s: TcpStream, token: &str, origem_ok: Option<&str>, tx: Sender<Pedido>) {
        let _ = s.set_nodelay(true); // sem Nagle é só desempenho; falhar não impede de jogar
        let ws = tungstenite::accept_hdr(s, |req: &Request, resp: Response| {
            let origem = req.headers().get("origin").and_then(|o| o.to_str().ok());
            if autorizado(req.uri().query(), origem, token, origem_ok) {
                Ok(resp)
            } else {
                tracing::warn!(?origem, "conexão recusada: token ou origem inválidos");
                Err(recusar())
            }
        });
        let mut ws = match ws {
            Ok(w) => w,
            Err(e) => {
                tracing::debug!("aperto de mão falhou: {e}");
                return;
            }
        };
        let minha = self.geracao.fetch_add(1, Ordering::SeqCst) + 1;
        if let Err(e) = ws.get_mut().set_read_timeout(Some(Duration::from_millis(2))) {
            tracing::error!("conexão sem prazo de leitura: {e}");
            return;
        }
        if tx.send(Pedido::Conectou).is_err() {
            return;
        }
        self.reenviar_quadro();
        tracing::info!("página conectada");
        let motivo = self.laco(&mut ws, minha, &tx);
        tracing::info!("página desconectada: {motivo}");
        let _ = ws.close(None); // a conexão já pode estar morta: fechar é cortesia
        let _ = ws.flush();
    }

    fn laco(&self, ws: &mut WebSocket<TcpStream>, minha: u64, tx: &Sender<Pedido>) -> String {
        loop {
            if self.geracao.load(Ordering::SeqCst) != minha {
                return "outra página conectou".into();
            }
            match ws.read() {
                Ok(Message::Text(t)) => match serde_json::from_str::<Comando>(t.as_str()) {
                    Ok(c) => {
                        if tx.send(Pedido::Comando(c)).is_err() {
                            return "o núcleo fechou".into();
                        }
                    }
                    Err(e) => self.avisar(&Aviso::Erro {
                        pedido: None,
                        codigo: "INVALID_ARGS".into(),
                        mensagem: format!("comando inválido: {e}"),
                    }),
                },
                Ok(Message::Binary(b)) => {
                    let p = match protocolo::ler_binario(&b) {
                        Ok(Binario::Botoes { jogador, entrada }) => Some(Pedido::Entrada(jogador, entrada)),
                        Ok(Binario::CarregarEstado { pedido, dados }) => {
                            Some(Pedido::CarregarEstado(pedido, dados.to_vec()))
                        }
                        Ok(Binario::GravarBateria { pedido, dados }) => {
                            Some(Pedido::GravarBateria(pedido, dados.to_vec()))
                        }
                        Err(e) => {
                            self.avisar(&Aviso::Erro {
                                pedido: None,
                                codigo: "INVALID_ARGS".into(),
                                mensagem: e,
                            });
                            None
                        }
                    };
                    if let Some(p) = p {
                        if tx.send(p).is_err() {
                            return "o núcleo fechou".into();
                        }
                    }
                }
                Ok(Message::Close(_)) => return "a página fechou".into(),
                Ok(_) => {}
                Err(tungstenite::Error::Io(e))
                    if matches!(e.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut) => {}
                Err(e) => return e.to_string(),
            }
            let pendentes: Vec<Message> = {
                // a geração é conferida com a fila presa: o "pronto" de uma página nova nunca vai pra antiga
                let mut s = self.saida.lock().unwrap_or_else(|e| e.into_inner());
                if self.geracao.load(Ordering::SeqCst) != minha {
                    return "outra página conectou".into();
                }
                s.drain(..).collect()
            };
            for m in pendentes {
                if let Err(e) = ws.send(m) {
                    return e.to_string();
                }
            }
            let novos: Vec<Arc<Vec<u8>>> = {
                let mut u = self.quadro.lock().unwrap_or_else(|e| e.into_inner());
                u.fila.drain(..).collect()
            };
            for b in novos {
                if let Err(e) = ws.send(Message::binary(b.as_ref().clone())) {
                    return e.to_string();
                }
            }
        }
    }
}

#[cfg(test)]
mod testes {
    use super::autorizado;

    #[test]
    fn token_e_origem() {
        let ok = Some("http://127.0.0.1:5000");
        assert!(autorizado(Some("t=abc"), None, "abc", ok));
        assert!(autorizado(Some("x=1&t=abc"), Some("http://127.0.0.1:5000"), "abc", ok));
        assert!(!autorizado(None, None, "abc", ok));
        assert!(!autorizado(Some("t=abd"), None, "abc", ok));
        assert!(!autorizado(Some("t="), None, "", ok));
        assert!(!autorizado(Some("t=abc"), Some("http://mal.com"), "abc", ok));
        assert!(!autorizado(Some("t=abc"), Some("http://127.0.0.1:5000"), "abc", None));
    }
}
