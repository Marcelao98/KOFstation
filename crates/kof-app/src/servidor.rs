//! Serve o app web embutido em 127.0.0.1 e responde os comandos em /api/<cmd>.
//! Segurança (D8/D11): só 127.0.0.1, token aleatório por abertura no cabeçalho `X-Kof-Token`, e `Origin` (quando vem)
//! tem que ser o próprio endereço. COOP/COEP ligam o isolamento (SharedArrayBuffer) sem flag do navegador.
use crate::api::{Estado, Saida};
use include_dir::{include_dir, Dir};
use kof_core::{ContractError, KofError};
use std::io::Read;
use std::path::PathBuf;
use tiny_http::{Header, Method, Request, Response, Server};

/// Maior corpo aceito num pedido (um savestate de PS1 tem ~5 MB; com folga).
const MAX_CORPO: u64 = 256 << 20;

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

fn binario(dados: Vec<u8>) -> Resp {
    isolado(Response::from_data(dados))
        .with_header(cabecalho("Content-Type", "application/octet-stream"))
        .with_header(cabecalho("Cache-Control", "no-store"))
}

/// Status HTTP de cada código (o app olha o código, o status é só pra quem lê o log do navegador).
fn status_de(e: &KofError) -> u16 {
    match e.codigo() {
        "NOT_FOUND" | "ROOT_MISSING" => 404,
        "CONFLICT" => 409,
        "PERMISSION_DENIED" | "PATH_OUTSIDE_SCOPE" => 403,
        "IO_ERROR" | "DISK_FULL" | "NETWORK" | "DATA_DIR_UNAVAILABLE" | "LOG_UNAVAILABLE" => 500,
        _ => 400,
    }
}

fn erro(status: u16, e: &KofError) -> Resp {
    json(
        status,
        &serde_json::to_value(ContractError::from(e)).expect("erro serializável"),
    )
}

/// Quando a página falou com o servidor pela última vez (ms desde que abriu). O `main` usa pra saber se ainda tem janela.
pub static ULTIMO_SINAL: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

pub fn agora_ms() -> u64 {
    static INICIO: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();
    INICIO.get_or_init(std::time::Instant::now).elapsed().as_millis() as u64
}

pub struct Servidor {
    srv: Server,
    pub token: String,
    pub porta: u16,
    estado: Estado,
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
        let estado = Estado::novo(pasta_dados);
        let _ = estado.origem.set(format!("http://127.0.0.1:{porta}")); // recém-criado: sempre vazio
        Ok(Self {
            srv,
            token,
            porta,
            estado,
        })
    }

    pub fn url(&self) -> String {
        format!("http://127.0.0.1:{}/?t={}", self.porta, self.token)
    }

    /// Atende pra sempre (o processo termina quando o navegador fecha).
    pub fn atender(&self) {
        // uma linha por pedido: baixar uma capa (rede) não pode segurar o save do jogo que chega junto
        std::thread::scope(|s| {
            for mut req in self.srv.incoming_requests() {
                s.spawn(move || {
                    let resp = self.responder(&mut req);
                    if let Err(e) = req.respond(resp) {
                        tracing::debug!("resposta não entregue: {e}");
                    }
                });
            }
        });
    }

    fn responder(&self, req: &mut Request) -> Resp {
        let caminho = req.url().split('?').next().unwrap_or("/").to_string();
        if let Some(cmd) = caminho.strip_prefix("/api/") {
            return self.api(req, cmd);
        }
        let rel = caminho.trim_start_matches('/');
        // núcleos: da pasta nucleos/ ao lado do executável (D33), não de dentro dele
        if let Some(nome) = rel.strip_prefix("nucleos/") {
            return match crate::pastas::nucleo_wasm(nome).map(std::fs::read) {
                Some(Ok(d)) => isolado(Response::from_data(d)).with_header(cabecalho("Content-Type", tipo(nome))),
                Some(Err(e)) => {
                    tracing::error!(nome, "não consegui ler o núcleo: {e}");
                    isolado(Response::from_string("erro ao ler o núcleo").with_status_code(500))
                }
                None => {
                    tracing::warn!(nome, "núcleo não achado na pasta nucleos/");
                    isolado(Response::from_string("núcleo não encontrado").with_status_code(404))
                }
            };
        }
        let arq = APP.get_file(rel).or_else(|| APP.get_file("index.html")); // telas sem arquivo: o app
        match arq {
            Some(f) => isolado(Response::from_data(f.contents().to_vec())).with_header(cabecalho(
                "Content-Type",
                tipo(if APP.get_file(rel).is_some() { rel } else { "index.html" }),
            )),
            None => isolado(Response::from_string("não encontrado").with_status_code(404)),
        }
    }

    fn api(&self, req: &mut Request, cmd: &str) -> Resp {
        let h = |nome: &'static str| -> Option<String> {
            req.headers()
                .iter()
                .find(|x| x.field.equiv(nome))
                .map(|x| x.value.as_str().to_string())
        };
        let origem_ok = format!("http://127.0.0.1:{}", self.porta);
        ULTIMO_SINAL.store(agora_ms().max(1), std::sync::atomic::Ordering::Relaxed);
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
        let binario_veio = h("Content-Type").is_some_and(|t| t.starts_with("application/octet-stream"));
        let args_cab = h("X-Kof-Args");
        let mut corpo = Vec::new();
        if let Err(e) = req.as_reader().take(MAX_CORPO).read_to_end(&mut corpo) {
            return erro(400, &KofError::argumento("corpo", e.to_string()));
        }
        // binário: os argumentos vêm no cabeçalho X-Kof-Args (JSON em percent-encoding); senão, o corpo é o JSON
        let texto_args = if binario_veio {
            args_cab.map(|a| decodificar(&a)).unwrap_or_else(|| "{}".into())
        } else {
            String::from_utf8_lossy(&corpo).into_owned()
        };
        let args: serde_json::Value = if texto_args.trim().is_empty() {
            serde_json::json!({})
        } else {
            match serde_json::from_str(&texto_args) {
                Ok(v) => v,
                Err(e) => return erro(400, &KofError::argumento("args", e.to_string())),
            }
        };
        if !binario_veio {
            corpo.clear();
        }
        match self.estado.chamar(cmd, args, corpo) {
            Ok(Saida::Json(v)) => json(200, &v),
            Ok(Saida::Bin(b)) => binario(b),
            Err(e) => {
                if e.codigo() != "NOT_FOUND" {
                    tracing::warn!(cmd, codigo = e.codigo(), "{e}");
                }
                erro(status_de(&e), &e)
            }
        }
    }
}

/// Desfaz o percent-encoding (encodeURIComponent) do cabeçalho de argumentos.
fn decodificar(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}
