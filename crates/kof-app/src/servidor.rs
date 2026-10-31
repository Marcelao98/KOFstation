//! Serve o app web embutido em 127.0.0.1 e responde os comandos em /api/<cmd>.
//! Segurança (D8/D11): só 127.0.0.1, token aleatório por abertura no cabeçalho `X-Kof-Token`, e `Origin` (quando vem)
//! tem que ser o próprio endereço. COOP/COEP ligam o isolamento (SharedArrayBuffer) sem flag do navegador.
use include_dir::{include_dir, Dir};
use kof_core::{ContractError, KofError};
use std::path::PathBuf;
use tiny_http::{Header, Method, Request, Response, Server};

static APP: Dir<'_> = include_dir!("$KOF_DIST");

type Resp = Response<std::io::Cursor<Vec<u8>>>;

fn cabecalho(k: &str, v: &str) -> Header {
    Header::from_bytes(k.as_bytes(), v.as_bytes()).expect("cabeçalho válido")
}

fn tipo(caminho: &str) -> &'static str {
    match caminho.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "wasm" => "application/wasm",
        "json" => "application/json",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn isolado(r: Resp) -> Resp {
    r.with_header(cabecalho("Cross-Origin-Opener-Policy", "same-origin"))
        .with_header(cabecalho("Cross-Origin-Embedder-Policy", "require-corp"))
        .with_header(cabecalho("Cross-Origin-Resource-Policy", "same-origin"))
        .with_header(cabecalho("X-Content-Type-Options", "nosniff"))
}

fn json(status: u16, v: &serde_json::Value) -> Resp {
    isolado(Response::from_string(v.to_string()).with_status_code(status))
        .with_header(cabecalho("Content-Type", "application/json"))
        .with_header(cabecalho("Cache-Control", "no-store"))
}

fn erro(status: u16, e: &KofError) -> Resp {
    json(
        status,
        &serde_json::to_value(ContractError::from(e)).expect("erro serializável"),
    )
}

pub struct Servidor {
    srv: Server,
    pub token: String,
    pub porta: u16,
    pasta_dados: PathBuf,
}

impl Servidor {
    pub fn novo(pasta_dados: PathBuf) -> std::io::Result<Self> {
        let mut b = [0u8; 16];
        getrandom::fill(&mut b).map_err(|e| std::io::Error::other(e.to_string()))?;
        let token = b.iter().map(|x| format!("{x:02x}")).collect();
        let srv = Server::http("127.0.0.1:0").map_err(|e| std::io::Error::other(e.to_string()))?;
        let porta = srv
            .server_addr()
            .to_ip()
            .map(|a| a.port())
            .ok_or_else(|| std::io::Error::other("sem porta"))?;
        Ok(Self {
            srv,
            token,
            porta,
            pasta_dados,
        })
    }

    pub fn url(&self) -> String {
        format!("http://127.0.0.1:{}/?t={}", self.porta, self.token)
    }

    /// Atende pra sempre (o processo termina quando o navegador fecha).
    pub fn atender(&self) {
        for req in self.srv.incoming_requests() {
            let resp = self.responder(&req);
            if let Err(e) = req.respond(resp) {
                tracing::debug!("resposta não entregue: {e}");
            }
        }
    }

    fn responder(&self, req: &Request) -> Resp {
        let caminho = req.url().split('?').next().unwrap_or("/").to_string();
        if let Some(cmd) = caminho.strip_prefix("/api/") {
            return self.api(req, cmd);
        }
        let rel = caminho.trim_start_matches('/');
        let arq = APP.get_file(rel).or_else(|| APP.get_file("index.html")); // telas sem arquivo: o app
        match arq {
            Some(f) => isolado(Response::from_data(f.contents().to_vec())).with_header(cabecalho(
                "Content-Type",
                tipo(if APP.get_file(rel).is_some() { rel } else { "index.html" }),
            )),
            None => isolado(Response::from_string("não encontrado").with_status_code(404)),
        }
    }

    fn api(&self, req: &Request, cmd: &str) -> Resp {
        let h = |nome: &'static str| -> Option<String> {
            req.headers()
                .iter()
                .find(|x| x.field.equiv(nome))
                .map(|x| x.value.as_str().to_string())
        };
        let origem_ok = format!("http://127.0.0.1:{}", self.porta);
        if *req.method() != Method::Post {
            return json(
                405,
                &serde_json::json!({"code": "METHOD_NOT_ALLOWED", "message": "use POST"}),
            );
        }
        if h("X-Kof-Token").as_deref() != Some(self.token.as_str()) || h("Origin").is_some_and(|o| o != origem_ok) {
            tracing::warn!(cmd, "pedido recusado: token ou origem inválidos");
            return json(
                403,
                &serde_json::json!({"code": "FORBIDDEN", "message": "token ou origem inválidos"}),
            );
        }
        match cmd {
            "app.info" => json(
                200,
                &serde_json::to_value(kof_core::info::app_info(&self.pasta_dados)).expect("info"),
            ),
            outro => erro(400, &KofError::ComandoDesconhecido(outro.to_string())),
        }
    }
}
