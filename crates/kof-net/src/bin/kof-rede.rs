//! O serviço de rede sozinho, com as mesmas opções do `kofservico` do antigo, pros testes de paridade (o
//! `rede/teste/servicos.cjs` do antigo roda contra este) e pra testar com o celular sem abrir o app:
//!   kof-rede [--pasta DIR] [--nome NOME] [--porta 8650] [--udp 8650] [--ws 8644] [--achar 255.255.255.255]
use kof_net::pagina::{self, Acesso};
use kof_net::{Config, Servico};

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let pasta = std::env::var("XDG_DATA_HOME")
        .ok()
        .filter(|x| !x.is_empty())
        .map(std::path::PathBuf::from)
        .or_else(|| {
            std::env::var("HOME")
                .ok()
                .map(|h| std::path::PathBuf::from(h).join(".local/share"))
        })
        .unwrap_or_else(|| ".".into())
        .join("KOFstation/rede");
    let mut cfg = Config::nova(pasta);
    let mut ws = 8644u16;
    let mut i = 1;
    while i + 1 < a.len() {
        let v = &a[i + 1];
        match a[i].as_str() {
            "--pasta" => cfg.pasta = v.into(),
            "--nome" => cfg.nome = Some(v.clone()),
            "--porta" => cfg.porta_tcp = v.parse().unwrap_or(8650),
            "--udp" => cfg.porta_udp = v.parse().unwrap_or(8650),
            "--ws" => ws = v.parse().unwrap_or(8644),
            "--achar" => cfg.alvo_achar = v.clone(),
            _ => {}
        }
        i += 2;
    }
    let s = match Servico::abrir(cfg) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[kof-rede] {e}");
            std::process::exit(2);
        }
    };
    eprintln!("[kof-rede] aparelho {} na porta {}", s.id(), s.porta_tcp());
    if let Err(e) = pagina::abrir(s, ws, Acesso::Antigo) {
        eprintln!("[kof-rede] porta {ws} ocupada ({e})");
        std::process::exit(2);
    }
    loop {
        std::thread::park();
    }
}
