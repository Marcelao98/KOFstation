//! KOFstation (casca B, D2): serve o app em 127.0.0.1 e abre num navegador Chromium em modo app. Fecha junto com a
//! janela. Uso: `kofstation` (normal) ou `kofstation --sem-navegador` (só mostra o endereço; pra testes).
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod navegador;
mod servidor;

fn main() {
    let sem_navegador = std::env::args().any(|a| a == "--sem-navegador");
    let pasta = kof_core::info::pasta_de_dados(|k| std::env::var(k).ok())
        .unwrap_or_else(|| std::env::temp_dir().join("KOFstation"));
    let _log = match kof_core::log::ligar(&pasta) {
        Ok(g) => Some(g),
        Err(e) => {
            eprintln!("aviso: sem log em arquivo ({e})");
            None
        }
    };
    let srv = match servidor::Servidor::novo(pasta.clone()) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("não consegui abrir o servidor local: {e}");
            eprintln!("KOFstation: não consegui abrir o servidor local: {e}");
            std::process::exit(1);
        }
    };
    let url = srv.url();
    tracing::info!(
        porta = srv.porta,
        versao = env!("CARGO_PKG_VERSION"),
        "KOFstation aberto"
    );
    println!("KOFstation em http://127.0.0.1:{}/", srv.porta);

    if sem_navegador {
        println!("{url}");
    } else {
        abrir_janela(&url, &pasta.join("navegador"));
    }
    srv.atender();
}

/// Abre o navegador e encerra o programa quando a janela fechar.
fn abrir_janela(url: &str, perfil: &std::path::Path) {
    let achado = navegador::achar(|k| std::env::var(k).ok(), |p| p.is_file());
    match achado.map(|n| (navegador::abrir(&n, url, perfil), n)) {
        Some((Ok(mut filho), n)) => {
            tracing::info!(?n, "navegador aberto");
            std::thread::spawn(move || {
                let fim = filho.wait();
                tracing::info!(?fim, "janela fechada: encerrando");
                std::process::exit(0);
            });
        }
        outro => {
            if let Some((Err(e), n)) = &outro {
                tracing::error!(?n, "o navegador não abriu: {e}");
            }
            tracing::warn!("nenhum Chrome/Chromium/Edge/Brave achado: abrindo no navegador padrão");
            eprintln!(
                "KOFstation: não achei Chrome, Chromium, Edge ou Brave. Abrindo no navegador padrão.\n\
                 Pra escolher um: KOF_NAVEGADOR=/caminho/do/navegador kofstation"
            );
            abrir_padrao(url);
        }
    }
}

fn abrir_padrao(url: &str) {
    let r = if cfg!(windows) {
        std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    };
    if let Err(e) = r {
        tracing::error!("nem o navegador padrão abriu: {e}");
        eprintln!("Abra este endereço num navegador: {url}");
    }
}
