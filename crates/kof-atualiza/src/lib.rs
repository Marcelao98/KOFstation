//! Atualizador do KOFstation (M15.1). Faz o que o lançador do antigo fazia (comparar a versão, baixar o que mudou,
//! trocar, apagar núcleo velho, anotar tudo no `atualizacao.log`), agora com **assinatura**: o manifesto é assinado com
//! Ed25519 e cada arquivo é conferido pelo SHA-256 antes de entrar.
//!
//! A pasta do app (D33): `kofstation`/`KOFstation.exe`, `nucleos/`, `nativo/`, `versao.txt`. O manifesto lista, por
//! plataforma, cada arquivo dessa pasta com tamanho, SHA-256 e de onde baixar. O ciclo:
//! 1. `procurar`: baixa o manifesto e a assinatura, confere, compara com o que está na pasta e baixa o que falta pra
//!    `.atualizacao/` (cada arquivo conferido), terminando com `.atualizacao/pronto.json`.
//! 2. `aplicar` (na abertura seguinte, antes de tudo): troca os arquivos, apaga os núcleos que saíram da lista e grava
//!    o `versao.txt`. Se trocou o executável, quem chamou abre ele de novo.
//!
//! Sem rede aqui dentro: quem chama passa o `baixar` (o `kofstation` usa o mesmo cliente HTTP das capas).
use kof_core::KofError;
use ring::digest::{digest, SHA256};
use ring::signature::{UnparsedPublicKey, ED25519};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

/// Pasta onde a versão nova espera a próxima abertura.
pub const PASTA_NOVA: &str = ".atualizacao";
/// Pastas que o atualizador cuida (o que não está no manifesto sai daqui).
const PASTAS_CUIDADAS: [&str; 2] = ["nucleos", "nativo"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Arquivo {
    pub tamanho: u64,
    pub sha256: String,
    /// endereço completo (https://…)
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Manifesto {
    pub versao: String,
    #[serde(default)]
    pub commit: String,
    /// plataforma (`linux-x64`, `windows-x64`) → caminho na pasta (`kofstation`, `nucleos/x-hash.js`) → arquivo
    pub plataformas: BTreeMap<String, BTreeMap<String, Arquivo>>,
}

/// O que ficou pronto em `.atualizacao/` esperando a próxima abertura.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pronto {
    pub versao: String,
    pub commit: String,
    /// os arquivos novos (caminho na pasta do app)
    pub trocar: Vec<String>,
    /// os que saíram da lista (núcleos velhos)
    pub apagar: Vec<String>,
}

/// O que `procurar` encontrou.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "situacao", rename_all = "camelCase")]
pub enum Resultado {
    /// a pasta já está na versão do manifesto
    EmDia { versao: String },
    /// baixou: vale na próxima abertura
    Pronta {
        versao: String,
        baixados: usize,
        bytes: u64,
    },
}

fn erro(msg: impl Into<String>) -> KofError {
    KofError::Rede(msg.into())
}

pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn de_hex(s: &str) -> Option<Vec<u8>> {
    let s = s.trim();
    if !s.len().is_multiple_of(2) {
        return None;
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(s.get(i..i + 2)?, 16).ok())
        .collect()
}

pub fn sha256_hex(d: &[u8]) -> String {
    hex(digest(&SHA256, d).as_ref())
}

/// Confere a assinatura Ed25519 (64 bytes, crua ou em hex) do manifesto com a chave pública (32 bytes em hex).
pub fn verificar(manifesto: &[u8], assinatura: &[u8], chave_publica_hex: &str) -> Result<Manifesto, KofError> {
    let chave = de_hex(chave_publica_hex)
        .filter(|c| c.len() == 32)
        .ok_or_else(|| erro("chave pública do atualizador inválida"))?;
    let assinatura = match assinatura.len() {
        64 => assinatura.to_vec(),
        _ => std::str::from_utf8(assinatura)
            .ok()
            .and_then(de_hex)
            .filter(|a| a.len() == 64)
            .ok_or_else(|| erro("assinatura do manifesto com formato estranho"))?,
    };
    UnparsedPublicKey::new(&ED25519, &chave)
        .verify(manifesto, &assinatura)
        .map_err(|_| erro("a assinatura do manifesto não confere: atualização recusada"))?;
    serde_json::from_slice(manifesto).map_err(|e| erro(format!("manifesto ilegível: {e}")))
}

/// Caminho relativo seguro (sem `..`, sem raiz, só dentro da pasta do app).
fn caminho_seguro(rel: &str) -> Result<PathBuf, KofError> {
    let p = Path::new(rel);
    let ok = !rel.is_empty()
        && !rel.contains('\\')
        && p.components().all(|c| matches!(c, Component::Normal(_)))
        && !rel.starts_with(PASTA_NOVA);
    if ok {
        Ok(p.to_path_buf())
    } else {
        Err(KofError::ForaDoEscopo(rel.to_string()))
    }
}

/// A versão da pasta (`versao=` do `versao.txt`), se tiver.
pub fn versao_da_pasta(app: &Path) -> Option<String> {
    let t = std::fs::read_to_string(app.join("versao.txt")).ok()?;
    t.lines()
        .find_map(|l| l.strip_prefix("versao="))
        .map(|v| v.trim().to_string())
}

/// Anota no `atualizacao.log` da pasta do app (como o antigo). Falhar ao anotar não impede a atualização.
pub fn anotar(app: &Path, msg: &str) {
    tracing::info!(target: "atualizacao", "{msg}");
    let quando = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(app.join("atualizacao.log"))
    {
        let _ = writeln!(f, "{quando} {msg}"); // sem log em arquivo segue igual: o tracing já anotou
    }
}

fn io(p: &Path, e: std::io::Error) -> KofError {
    KofError::de_io(p.display(), e)
}

/// Procura e baixa a versão nova pra `.atualizacao/`. `baixar(url)` traz os bytes (o `kofstation` usa HTTPS).
pub fn procurar(
    app: &Path,
    plataforma: &str,
    chave_publica_hex: &str,
    url_manifesto: &str,
    baixar: &dyn Fn(&str) -> Result<Vec<u8>, KofError>,
) -> Result<Resultado, KofError> {
    let m = baixar(url_manifesto)?;
    let a = baixar(&format!("{url_manifesto}.sig"))?;
    let man = verificar(&m, &a, chave_publica_hex)?;
    let arquivos = man
        .plataformas
        .get(plataforma)
        .ok_or_else(|| erro(format!("a versão {} não tem pacote pra {plataforma}", man.versao)))?;
    // já esperando aplicar a mesma versão: nada a fazer
    if let Ok(p) = std::fs::read(app.join(PASTA_NOVA).join("pronto.json")) {
        if serde_json::from_slice::<Pronto>(&p).is_ok_and(|p| p.versao == man.versao) {
            return Ok(Resultado::Pronta {
                versao: man.versao,
                baixados: 0,
                bytes: 0,
            });
        }
    }
    let mut trocar = Vec::new();
    for (rel, arq) in arquivos {
        let destino = app.join(caminho_seguro(rel)?);
        let igual = std::fs::metadata(&destino).is_ok_and(|m| m.len() == arq.tamanho)
            && std::fs::read(&destino).is_ok_and(|d| sha256_hex(&d) == arq.sha256);
        if !igual {
            trocar.push(rel.clone());
        }
    }
    let mut apagar = Vec::new();
    for pasta in PASTAS_CUIDADAS {
        let Ok(l) = std::fs::read_dir(app.join(pasta)) else {
            continue;
        };
        for e in l.flatten() {
            let rel = format!("{pasta}/{}", e.file_name().to_string_lossy());
            if e.path().is_file() && !arquivos.contains_key(&rel) {
                apagar.push(rel);
            }
        }
    }
    apagar.sort();
    if trocar.is_empty() && apagar.is_empty() && versao_da_pasta(app).as_deref() == Some(man.versao.as_str()) {
        return Ok(Resultado::EmDia { versao: man.versao });
    }
    let nova = app.join(PASTA_NOVA);
    let _ = std::fs::remove_dir_all(&nova); // sobra de uma tentativa anterior: começa de novo
    let mut bytes = 0;
    for rel in &trocar {
        let arq = &arquivos[rel];
        let d = baixar(&arq.url)?;
        if d.len() as u64 != arq.tamanho || sha256_hex(&d) != arq.sha256 {
            let _ = std::fs::remove_dir_all(&nova); // nada pela metade
            return Err(erro(format!("{rel} veio diferente do manifesto: atualização recusada")));
        }
        let p = nova.join(caminho_seguro(rel)?);
        if let Some(pai) = p.parent() {
            std::fs::create_dir_all(pai).map_err(|e| io(pai, e))?;
        }
        std::fs::write(&p, &d).map_err(|e| io(&p, e))?;
        bytes += d.len() as u64;
    }
    std::fs::create_dir_all(&nova).map_err(|e| io(&nova, e))?;
    let pronto = Pronto {
        versao: man.versao.clone(),
        commit: man.commit.clone(),
        trocar: trocar.clone(),
        apagar,
    };
    let p = nova.join("pronto.json");
    std::fs::write(&p, serde_json::to_vec_pretty(&pronto).expect("json")).map_err(|e| io(&p, e))?;
    anotar(
        app,
        &format!(
            "versão {} baixada ({} arquivos, {} bytes): vale na próxima abertura",
            man.versao,
            trocar.len(),
            bytes
        ),
    );
    Ok(Resultado::Pronta {
        versao: man.versao,
        baixados: trocar.len(),
        bytes,
    })
}

/// O que `aplicar` fez.
#[derive(Debug, PartialEq, Eq)]
pub struct Aplicado {
    pub versao: String,
    /// o executável foi trocado: abrir de novo pra rodar o novo
    pub trocou_executavel: bool,
}

/// Na abertura: se tem versão esperando em `.atualizacao/`, troca os arquivos. `executavel` = o nome do executável na
/// pasta (`kofstation` ou `KOFstation.exe`), que no Windows não pode ser apagado rodando: vira `.velho`.
pub fn aplicar(app: &Path, executavel: &str) -> Result<Option<Aplicado>, KofError> {
    // sobras de uma troca anterior (o executável velho no Windows)
    let _ = std::fs::remove_file(app.join(format!("{executavel}.velho")));
    let nova = app.join(PASTA_NOVA);
    let Ok(p) = std::fs::read(nova.join("pronto.json")) else {
        return Ok(None);
    };
    let pronto: Pronto = serde_json::from_slice(&p).map_err(|e| erro(format!("pronto.json ilegível: {e}")))?;
    let mut trocou_executavel = false;
    for rel in &pronto.trocar {
        let rel_p = caminho_seguro(rel)?;
        let de = nova.join(&rel_p);
        let para = app.join(&rel_p);
        if let Some(pai) = para.parent() {
            std::fs::create_dir_all(pai).map_err(|e| io(pai, e))?;
        }
        if rel == executavel {
            // o que está rodando: muda de nome antes (no Linux também funciona) e o novo entra no lugar
            let velho = app.join(format!("{executavel}.velho"));
            if para.exists() {
                std::fs::rename(&para, &velho).map_err(|e| io(&para, e))?;
            }
            trocou_executavel = true;
        }
        std::fs::rename(&de, &para).map_err(|e| io(&para, e))?;
        #[cfg(unix)]
        if rel == executavel || rel.starts_with("nativo/") {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&para, std::fs::Permissions::from_mode(0o755));
            // sem isso não abre
        }
    }
    for rel in &pronto.apagar {
        let p = app.join(caminho_seguro(rel)?);
        if let Err(e) = std::fs::remove_file(&p) {
            anotar(app, &format!("não apaguei {rel}: {e}"));
        }
    }
    let v = format!("versao={}\ncommit={}\n", pronto.versao, pronto.commit);
    let mut antigo = std::fs::read_to_string(app.join("versao.txt")).unwrap_or_default();
    antigo = antigo
        .lines()
        .filter(|l| !l.starts_with("versao=") && !l.starts_with("commit="))
        .map(|l| format!("{l}\n"))
        .collect();
    let vp = app.join("versao.txt");
    std::fs::write(&vp, v + &antigo).map_err(|e| io(&vp, e))?;
    let _ = std::fs::remove_dir_all(&nova); // trocado: a pasta de espera some (sobra não atrapalha a próxima)
    anotar(
        app,
        &format!(
            "atualizado pra versão {} ({} arquivos trocados, {} apagados)",
            pronto.versao,
            pronto.trocar.len(),
            pronto.apagar.len()
        ),
    );
    Ok(Some(Aplicado {
        versao: pronto.versao,
        trocou_executavel,
    }))
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn caminhos_fora_da_pasta_sao_recusados() {
        for ruim in [
            "../x",
            "/etc/passwd",
            "a/../../b",
            "",
            "a\\b",
            ".atualizacao/pronto.json",
        ] {
            assert!(caminho_seguro(ruim).is_err(), "{ruim}");
        }
        assert!(caminho_seguro("nucleos/snes9x-1234.js").is_ok());
    }

    #[test]
    fn hex_ida_e_volta() {
        assert_eq!(de_hex(&hex(&[0, 1, 0xab, 0xff])).unwrap(), vec![0, 1, 0xab, 0xff]);
        assert!(de_hex("abc").is_none());
    }
}
