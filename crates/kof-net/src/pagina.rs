//! A WebSocket da página: o mesmo JSON da API local do antigo (o kofservico falava na 127.0.0.1:8644). No app, a porta
//! é qualquer uma livre e a conexão precisa do token desta abertura e da origem da página; no modo do antigo
//! (`kof-rede`, pros testes de paridade), a porta é fixa, sem token, e site da internet é recusado como lá.
use crate::Servico;
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::Arc;
use std::time::Duration;
use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use tungstenite::Message;

/// Quem pode conectar.
#[derive(Clone, Debug)]
pub enum Acesso {
    /// o app: `?t=<token>` e a origem da página (sem origem = programa local, os testes)
    Token { token: String, origem: String },
    /// como o kofservico: sem token; origem `http…` (site da internet) é recusada
    Antigo,
}

impl Acesso {
    pub fn deixa(&self, query: Option<&str>, origem: Option<&str>) -> bool {
        match self {
            Acesso::Token { token, origem: ok } => {
                let t = query
                    .unwrap_or("")
                    .split('&')
                    .any(|p| p.strip_prefix("t=").is_some_and(|t| !token.is_empty() && t == token));
                t && origem.is_none_or(|o| o == ok)
            }
            Acesso::Antigo => !origem.is_some_and(|o| o.to_ascii_lowercase().starts_with("http")),
        }
    }
}

/// Abre a WebSocket da página em 127.0.0.1:`porta` (0 = qualquer) e devolve a porta. Uma página por vez: a nova
/// substitui a velha.
pub fn abrir(servico: Arc<Servico>, porta: u16, acesso: Acesso) -> std::io::Result<u16> {
    let ouvinte = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], porta)))?;
    let porta = ouvinte.local_addr()?.port();
    let geracao = Arc::new(AtomicU64::new(0));
    std::thread::Builder::new().name("rede-pagina".into()).spawn(move || {
        for s in ouvinte.incoming() {
            let Ok(s) = s else { continue };
            let (sv, ac, g) = (servico.clone(), acesso.clone(), geracao.clone());
            let r = std::thread::Builder::new()
                .name("rede-pagina-con".into())
                .spawn(move || atender(s, &sv, &ac, &g));
            if let Err(e) = r {
                tracing::error!(target: "rede", "sem linha pra página: {e}");
            }
        }
    })?;
    Ok(porta)
}

#[allow(clippy::result_large_err)] // o erro do aperto de mão é a resposta HTTP do tungstenite
fn atender(s: TcpStream, servico: &Arc<Servico>, acesso: &Acesso, geracao: &AtomicU64) {
    let _ = s.set_nodelay(true); // só latência
    let ws = tungstenite::accept_hdr(s, |req: &Request, resp: Response| {
        let origem = req.headers().get("origin").and_then(|o| o.to_str().ok());
        if acesso.deixa(req.uri().query(), origem) {
            Ok(resp)
        } else {
            tracing::warn!(target: "rede", ?origem, "página recusada: token ou origem inválidos");
            let mut r = ErrorResponse::new(Some("token ou origem inválidos".into()));
            *r.status_mut() = tungstenite::http::StatusCode::FORBIDDEN;
            Err(r)
        }
    });
    let mut ws = match ws {
        Ok(w) => w,
        Err(e) => {
            tracing::debug!(target: "rede", "aperto de mão da página falhou: {e}");
            return;
        }
    };
    let minha = geracao.fetch_add(1, Ordering::SeqCst) + 1;
    let (tx, rx) = mpsc::channel::<String>();
    servico.ligar_pagina(Box::new(move |t| tx.send(t.to_string()).is_ok()));
    // lê com prazo curto pra também mandar o que chegou dos aparelhos (o controle do celular não pode esperar)
    let _ = ws.get_mut().set_read_timeout(Some(Duration::from_millis(4)));
    loop {
        if geracao.load(Ordering::SeqCst) != minha {
            break; // outra página conectou
        }
        let mut erro = false;
        while let Ok(t) = rx.try_recv() {
            if ws.write(Message::text(t)).is_err() {
                erro = true;
                break;
            }
        }
        if erro || ws.flush().is_err() {
            break;
        }
        match ws.read() {
            Ok(Message::Text(t)) => servico.pedido(t.as_str()),
            Ok(Message::Binary(b)) => servico.pedido(&String::from_utf8_lossy(&b)),
            Ok(Message::Close(_)) => break,
            Ok(_) => {}
            Err(tungstenite::Error::Io(e))
                if matches!(e.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut) => {}
            Err(_) => break,
        }
    }
    tracing::debug!(target: "rede", "página desconectou");
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn quem_pode_conectar() {
        let a = Acesso::Token {
            token: "abc".into(),
            origem: "http://127.0.0.1:5000".into(),
        };
        assert!(a.deixa(Some("t=abc"), Some("http://127.0.0.1:5000")));
        assert!(a.deixa(Some("x=1&t=abc"), None));
        assert!(!a.deixa(Some("t=abd"), None));
        assert!(!a.deixa(None, None));
        assert!(!a.deixa(Some("t=abc"), Some("https://site.com")));
        assert!(Acesso::Antigo.deixa(None, Some("null")));
        assert!(Acesso::Antigo.deixa(None, None));
        assert!(!Acesso::Antigo.deixa(None, Some("https://site.com")));
    }
}
