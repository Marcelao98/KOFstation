//! Casca B do spike: o backend serve a página em 127.0.0.1 (com COOP/COEP, sem file://) e responde comandos em
//! /api/<cmd> só com o token aleatório desta abertura e de origem 127.0.0.1. Uso: kof-spike-local <pasta> [navegador]
use kof_core::{ContractError, KofError};
use std::path::{Path, PathBuf};
use tiny_http::{Header, Method, Response, Server};

fn cabecalho(k: &str, v: &str) -> Header {
    Header::from_bytes(k.as_bytes(), v.as_bytes()).expect("cabeçalho válido")
}

fn tipo(p: &Path) -> &'static str {
    match p.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "wasm" => "application/wasm",
        "json" => "application/json",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

fn main() {
    let mut args = std::env::args().skip(1);
    let raiz = PathBuf::from(args.next().expect("uso: kof-spike-local <pasta> [navegador]"));
    let navegador = args.next();
    let mut b = [0u8; 16];
    getrandom::fill(&mut b).expect("aleatório do sistema");
    let token: String = b.iter().map(|x| format!("{x:02x}")).collect();
    let srv = Server::http("127.0.0.1:0").expect("porta livre");
    let porta = srv.server_addr().to_ip().expect("ip").port();
    let url = format!("http://127.0.0.1:{porta}/?t={token}");
    println!("{url}");
    if let Some(n) = navegador {
        let perfil = std::env::temp_dir().join("kof-spike-perfil");
        let _ = std::process::Command::new(n)
            .arg(format!("--app={url}"))
            .arg(format!("--user-data-dir={}", perfil.display()))
            .spawn();
    }
    let origem_ok = format!("http://127.0.0.1:{porta}");
    let pasta_dados = std::env::temp_dir().join("kof-spike-dados");
    for req in srv.incoming_requests() {
        let caminho = req.url().split('?').next().unwrap_or("/").to_string();
        let base = |r: Response<std::io::Cursor<Vec<u8>>>| {
            r.with_header(cabecalho("Cross-Origin-Opener-Policy", "same-origin"))
                .with_header(cabecalho("Cross-Origin-Embedder-Policy", "require-corp"))
                .with_header(cabecalho("Cross-Origin-Resource-Policy", "same-origin"))
                .with_header(cabecalho("Cache-Control", "no-store"))
        };
        if let Some(cmd) = caminho.strip_prefix("/api/") {
            let tk = req.headers().iter().find(|h| h.field.equiv("X-Kof-Token")).map(|h| h.value.as_str());
            let origem = req.headers().iter().find(|h| h.field.equiv("Origin")).map(|h| h.value.as_str());
            let json = |status: u16, v: serde_json::Value| {
                base(Response::from_string(v.to_string()).with_status_code(status))
                    .with_header(cabecalho("Content-Type", "application/json"))
            };
            let resp = if *req.method() != Method::Post {
                json(405, serde_json::json!({"code": "METHOD_NOT_ALLOWED", "message": "use POST"}))
            } else if tk != Some(token.as_str()) || origem.is_some_and(|o| o != origem_ok) {
                json(403, serde_json::json!({"code": "FORBIDDEN", "message": "token ou origem inválidos"}))
            } else {
                match cmd {
                    "app.info" => json(200, serde_json::to_value(kof_core::info::app_info(&pasta_dados)).unwrap()),
                    outro => {
                        let e = KofError::ComandoDesconhecido(outro.to_string());
                        json(400, serde_json::to_value(ContractError::from(&e)).unwrap())
                    }
                }
            };
            let _ = req.respond(resp);
            continue;
        }
        let rel = if caminho == "/" { "index.html".to_string() } else { caminho.trim_start_matches('/').to_string() };
        let arq = raiz.join(&rel);
        let dentro = arq
            .canonicalize()
            .ok()
            .zip(raiz.canonicalize().ok())
            .is_some_and(|(a, r)| a.starts_with(r));
        let resp = match (dentro, std::fs::read(&arq)) {
            (true, Ok(dados)) => base(Response::from_data(dados)).with_header(cabecalho("Content-Type", tipo(&arq))),
            _ => base(Response::from_string("não encontrado").with_status_code(404)),
        };
        let _ = req.respond(resp);
    }
}
