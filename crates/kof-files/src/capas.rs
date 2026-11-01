//! Capas oficiais do libretro-thumbnails (o mesmo acervo do RetroArch), baixadas pelo Rust e guardadas em
//! `<dados>/cache/capas/<acervo>/<nome>.png`. Falha fica lembrada por 7 dias (`.falhou`), como no antigo. Só baixa
//! de `raw.githubusercontent.com/libretro-thumbnails/`; o app manda só o acervo e os nomes candidatos.
use kof_core::KofError;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const BASE: &str = "https://raw.githubusercontent.com/libretro-thumbnails/";
const MAX_PNG: u64 = 4 << 20;
const LEMBRAR_FALHA: Duration = Duration::from_secs(7 * 86400);

fn valido(s: &str, max: usize) -> bool {
    !s.is_empty() && s.len() <= max && !s.contains(['/', '\\', '\0']) && s != "." && s != ".."
}

fn pasta(dados: &Path, acervo: &str) -> PathBuf {
    dados.join("cache").join("capas").join(acervo)
}

fn nome_arquivo(nome: &str) -> String {
    crate::loja::codificar(nome).unwrap_or_else(|_| "x".into())
}

/// A capa já guardada (sem rede). `Ok(None)` = ainda não tem.
pub fn guardada(dados: &Path, acervo: &str, chave: &str) -> Result<Option<Vec<u8>>, KofError> {
    if !valido(acervo, 80) {
        return Err(KofError::argumento("acervo", "acervo inválido"));
    }
    let p = pasta(dados, acervo).join(format!("{}.png", nome_arquivo(chave)));
    match std::fs::read(&p) {
        Ok(b) => Ok(Some(b)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(KofError::de_io(p.display(), e)),
    }
}

fn agente() -> ureq::Agent {
    let tls = ureq::tls::TlsConfig::builder()
        .root_certs(ureq::tls::RootCerts::PlatformVerifier)
        .build();
    ureq::Agent::config_builder()
        .tls_config(tls)
        .timeout_global(Some(Duration::from_secs(20)))
        .http_status_as_error(false)
        .build()
        .into()
}

fn baixar(agente: &ureq::Agent, url: &str) -> Result<Option<(String, Vec<u8>)>, KofError> {
    let r = agente.get(url).call().map_err(|e| KofError::Rede(e.to_string()))?;
    if r.status() != 200 {
        return Ok(None);
    }
    let tipo = r
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let corpo = r
        .into_body()
        .with_config()
        .limit(MAX_PNG)
        .read_to_vec()
        .map_err(|e| KofError::Rede(e.to_string()))?;
    Ok(Some((tipo, corpo)))
}

/// Procura a capa pelos nomes (o primeiro que existir no acervo), guarda e devolve. `Ok(None)` = não tem (lembrado).
pub fn buscar(dados: &Path, acervo: &str, chave: &str, nomes: &[String]) -> Result<Option<Vec<u8>>, KofError> {
    if let Some(b) = guardada(dados, acervo, chave)? {
        return Ok(Some(b));
    }
    let d = pasta(dados, acervo);
    let falhou = d.join(format!("{}.falhou", nome_arquivo(chave)));
    if std::fs::metadata(&falhou)
        .and_then(|m| m.modified())
        .is_ok_and(|t| SystemTime::now().duration_since(t).unwrap_or_default() < LEMBRAR_FALHA)
    {
        return Ok(None);
    }
    let ag = agente();
    let raiz = format!("{BASE}{acervo}/master/Named_Boxarts/");
    let enc = |s: &str| {
        s.bytes()
            .map(|b| {
                if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
                    (b as char).to_string()
                } else {
                    format!("%{b:02X}")
                }
            })
            .collect::<String>()
    };
    for n in nomes.iter().filter(|n| valido(n, 250)).take(16) {
        let Some((tipo, corpo)) = baixar(&ag, &format!("{raiz}{}.png", enc(n)))? else {
            continue;
        };
        let png = if tipo.starts_with("image/") {
            corpo
        } else {
            // atalho (symlink) do git: o conteúdo é o nome do arquivo de verdade
            let alvo = String::from_utf8_lossy(&corpo).trim().to_string();
            let alvo = alvo.rsplit('/').next().unwrap_or("").to_string();
            if !alvo.to_lowercase().ends_with(".png") || alvo.len() > 200 {
                continue;
            }
            match baixar(&ag, &format!("{raiz}{}", enc(&alvo)))? {
                Some((t, b)) if t.starts_with("image/") => b,
                _ => continue,
            }
        };
        std::fs::create_dir_all(&d).map_err(|e| KofError::de_io(d.display(), e))?;
        let p = d.join(format!("{}.png", nome_arquivo(chave)));
        std::fs::write(&p, &png).map_err(|e| KofError::de_io(p.display(), e))?;
        return Ok(Some(png));
    }
    std::fs::create_dir_all(&d).map_err(|e| KofError::de_io(d.display(), e))?;
    let _ = std::fs::write(&falhou, b""); // lembrar a falha é só economia: se não gravar, tenta de novo depois
    Ok(None)
}
