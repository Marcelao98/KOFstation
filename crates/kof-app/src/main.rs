//! KOFstation (casca B, D2): serve o app em 127.0.0.1 e abre num navegador Chromium em modo app. Fecha junto com a
//! janela. Uso: `kofstation` (normal) ou `kofstation --sem-navegador` (só mostra o endereço; pra testes).
//! `kofstation --instalar` / `--desinstalar` põe e tira do menu de aplicativos (Linux).
//! `kofstation --nativo` é o processo filho de um núcleo nativo (M11b): o próprio app abre, ninguém roda à mão.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod api;
mod atualizacao;
mod instalar;
mod nativo;
mod navegador;
mod pastas;
mod servidor;

fn main() {
    if std::env::args().nth(1).as_deref() == Some("--nativo") {
        std::process::exit(kof_nativo::filho::rodar());
    }
    match std::env::args().nth(1).as_deref() {
        Some("--instalar") => std::process::exit(instalar::rodar(false)),
        Some("--desinstalar") => std::process::exit(instalar::rodar(true)),
        _ => {}
    }
    servidor::agora_ms(); // o relógio do sinal de vida começa agora
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
    // a versão baixada da última vez entra agora, antes de abrir qualquer coisa (M15.1)
    if atualizacao::aplicar_na_abertura() {
        tracing::info!("executável trocado pela atualização: o novo já abriu");
        return;
    }
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
/// Abre o navegador e encerra o programa quando a janela fechar.
///
/// Se já tem um navegador aberto com o perfil do KOFstation (a primeira janela, ou o Chrome que ficou rodando em
/// segundo plano), o processo novo entrega o endereço pra ele e sai na hora. Por isso o processo que termina não é
/// prova de que a janela fechou: quem decide é o sinal de vida da página (`app.vivo` a cada 5 s).
fn abrir_janela(url: &str, perfil: &std::path::Path) {
    let achado = navegador::achar(|k| std::env::var(k).ok(), |p| p.is_file());
    match achado.map(|n| (navegador::abrir(&n, url, perfil), n)) {
        Some((Ok(mut filho), n)) => {
            tracing::info!(?n, "navegador aberto");
            std::thread::spawn(move || {
                let inicio = servidor::agora_ms();
                let fim = filho.wait();
                let durou = servidor::agora_ms() - inicio;
                if durou > 15_000 {
                    tracing::info!(?fim, "janela fechada: encerrando");
                    std::process::exit(0);
                }
                tracing::info!(
                    ?fim,
                    durou,
                    "o navegador entregou a janela pra um já aberto: vigiando pelo sinal de vida"
                );
                vigiar_sinal();
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
            std::thread::spawn(vigiar_sinal);
        }
    }
}

/// Encerra quando a página para de dar sinal de vida: 30 s sem nenhum pedido (e, antes do primeiro, 2 min pra abrir).
fn vigiar_sinal() {
    use std::sync::atomic::Ordering;
    loop {
        std::thread::sleep(std::time::Duration::from_secs(5));
        let ultimo = servidor::ULTIMO_SINAL.load(Ordering::Relaxed);
        let agora = servidor::agora_ms();
        let limite = if ultimo == 0 { 120_000 } else { 30_000 };
        if agora.saturating_sub(ultimo) > limite {
            tracing::info!("a janela não dá sinal de vida há {} s: encerrando", limite / 1000);
            std::process::exit(0);
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
