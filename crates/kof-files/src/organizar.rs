//! Organizar a Kof Games: o Rust lista tudo de Games e Novos (`inventario`) e aplica os movimentos que o TS planejou
//! (`domain/organizar.ts`, a mesma regra do `organizar` do antigo). Nome repetido no destino vira "nome (2).ext".
use crate::biblioteca::{fatos, Arquivo};
use crate::escopo::{relativo, resolver};
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct Item {
    #[serde(flatten)]
    pub arquivo: Arquivo,
    /// arquivos citados pelo .cue (só nos .cue)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cue: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct Inventario {
    pub files: Vec<Item>,
    /// pastas (relativas), pra saber o que tem dentro de cada uma
    pub dirs: Vec<String>,
}

fn refs_do_cue(p: &Path) -> Vec<String> {
    let t = std::fs::read(p)
        .map(|b| String::from_utf8_lossy(&b).into_owned())
        .unwrap_or_default();
    let mut r = Vec::new();
    for linha in t.lines() {
        let l = linha.trim_start();
        if l.len() > 4 && l[..4].eq_ignore_ascii_case("FILE") {
            if let (Some(a), Some(b)) = (l.find('"'), l.rfind('"')) {
                if b > a + 1 {
                    r.push(l[a + 1..b].rsplit(['/', '\\']).next().unwrap_or("").to_string());
                }
            }
        }
    }
    r
}

/// Tudo de Games e Novos (até 6 níveis).
pub fn inventario(raiz: &Path) -> Result<Inventario, KofError> {
    let mut inv = Inventario {
        files: vec![],
        dirs: vec![],
    };
    for base in ["Games", "Novos"] {
        let d = raiz.join(base);
        if d.is_dir() {
            andar(raiz, &d, 0, &mut inv);
        }
    }
    Ok(inv)
}

fn andar(raiz: &Path, dir: &Path, prof: u32, inv: &mut Inventario) {
    let Ok(l) = std::fs::read_dir(dir) else { return };
    for e in l.flatten() {
        let p = e.path();
        if e.file_name().to_string_lossy().starts_with('.') {
            continue;
        }
        if p.is_dir() {
            inv.dirs.push(relativo(raiz, &p));
            if prof < 6 {
                andar(raiz, &p, prof + 1, inv);
            }
        } else if let Some(a) = fatos(raiz, &p) {
            let cue = a.path.to_lowercase().ends_with(".cue").then(|| refs_do_cue(&p));
            inv.files.push(Item { arquivo: a, cue });
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Movimento {
    /// arquivo ou pasta (relativo à raiz)
    pub from: String,
    /// pasta de destino (relativa à raiz); o nome continua o mesmo
    pub to: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct Falha {
    #[serde(rename = "move")]
    pub movimento: Movimento,
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct Resultado {
    pub done: Vec<Movimento>,
    pub failed: Vec<Falha>,
    /// pastas apagadas porque ficaram vazias
    pub removed: Vec<String>,
}

/// "nome.ext" livre no destino: "nome (2).ext", "nome (3).ext"...
pub fn nome_livre(dest: &Path, nome: &str) -> PathBuf {
    let p = dest.join(nome);
    if !p.exists() {
        return p;
    }
    let (base, ext) = match nome.rfind('.') {
        Some(i) if i > 0 => (&nome[..i], &nome[i..]),
        _ => (nome, ""),
    };
    (2..)
        .map(|i| dest.join(format!("{base} ({i}){ext}")))
        .find(|p| !p.exists())
        .expect("sempre acha")
}

fn mover_arquivo(de: &Path, dest_dir: &Path) -> Result<(), KofError> {
    let nome = de
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let para = nome_livre(dest_dir, &nome);
    if std::fs::rename(de, &para).is_err() {
        // outro disco: copia e apaga
        std::fs::copy(de, &para).map_err(|e| KofError::de_io(para.display(), e))?;
        std::fs::remove_file(de).map_err(|e| KofError::de_io(de.display(), e))?;
    }
    Ok(())
}

fn mover_pasta(de: &Path, dest_dir: &Path) -> Result<(), KofError> {
    let nome = de.file_name().map(|n| n.to_os_string()).unwrap_or_default();
    let alvo = dest_dir.join(&nome);
    if !alvo.exists() && std::fs::rename(de, &alvo).is_ok() {
        return Ok(());
    }
    // já existe (ou outro disco): junta arquivo por arquivo, como o moverPasta do antigo
    std::fs::create_dir_all(&alvo).map_err(|e| KofError::de_io(alvo.display(), e))?;
    for e in std::fs::read_dir(de)
        .map_err(|e| KofError::de_io(de.display(), e))?
        .flatten()
    {
        let p = e.path();
        if p.is_dir() {
            mover_pasta(&p, &alvo)?;
        } else {
            mover_arquivo(&p, &alvo)?;
        }
    }
    std::fs::remove_dir_all(de).map_err(|e| KofError::de_io(de.display(), e))
}

/// Aplica os movimentos; depois apaga as pastas de `limpar` que ficaram vazias.
pub fn aplicar(raiz: &Path, moves: &[Movimento], limpar: &[String]) -> Resultado {
    let mut r = Resultado {
        done: vec![],
        failed: vec![],
        removed: vec![],
    };
    for m in moves {
        let feito = (|| {
            let de = resolver(raiz, &m.from)?;
            let dest = resolver(raiz, &m.to)?;
            if !de.exists() {
                return Err(KofError::NaoEncontrado(m.from.clone()));
            }
            std::fs::create_dir_all(&dest).map_err(|e| KofError::de_io(dest.display(), e))?;
            if de.is_dir() {
                mover_pasta(&de, &dest)
            } else {
                mover_arquivo(&de, &dest)
            }
        })();
        match feito {
            Ok(()) => r.done.push(m.clone()),
            Err(e) => r.failed.push(Falha {
                movimento: m.clone(),
                code: e.codigo().into(),
                message: e.to_string(),
            }),
        }
    }
    // as mais fundas primeiro
    let mut l: Vec<&String> = limpar.iter().collect();
    l.sort_by_key(|p| std::cmp::Reverse(p.matches('/').count()));
    for d in l {
        if let Ok(p) = resolver(raiz, d) {
            if p.is_dir()
                && std::fs::read_dir(&p).is_ok_and(|mut x| x.next().is_none())
                && std::fs::remove_dir(&p).is_ok()
            {
                r.removed.push(d.clone());
            }
        }
    }
    if !r.done.is_empty() {
        tracing::info!(movidos = r.done.len(), falhas = r.failed.len(), "Kof Games organizada");
    }
    r
}

/// Guarda um jogo que veio de fora em Games/<pasta>/ (o `guardarNaArvore` do antigo). Já existe com o mesmo tamanho =
/// nada a fazer. Devolve o caminho relativo (ou `None` quando já estava lá).
pub fn guardar(raiz: &Path, pasta: &str, nome: &str, dados: &[u8]) -> Result<Option<String>, KofError> {
    if pasta.contains('/') || nome.contains('/') || nome.contains('\\') {
        return Err(KofError::ForaDoEscopo(format!("{pasta}/{nome}")));
    }
    let dest = resolver(raiz, &format!("Games/{pasta}"))?;
    std::fs::create_dir_all(&dest).map_err(|e| KofError::de_io(dest.display(), e))?;
    let p = dest.join(nome);
    if std::fs::metadata(&p).is_ok_and(|m| m.len() == dados.len() as u64) {
        return Ok(None);
    }
    std::fs::write(&p, dados).map_err(|e| KofError::de_io(p.display(), e))?;
    Ok(Some(relativo(raiz, &p)))
}

/// O que `guardar_parte` respondeu.
#[derive(Debug, PartialEq, Eq, serde::Serialize)]
pub struct Parte {
    /// caminho na Kof Games quando terminou (o último pedaço chegou, ou o arquivo já estava lá)
    pub stored: Option<String>,
    /// o arquivo já estava lá com o mesmo tamanho: pode parar de mandar
    pub ja: bool,
}

/// Guarda um arquivo grande na Kof Games aos pedaços (um CD de 700 MB não cabe num pedido só, nem deve passar inteiro
/// pela memória da página). Os pedaços vão, em ordem, pra `<nome>.kofparcial`; o último troca pelo nome certo.
pub fn guardar_parte(
    raiz: &Path,
    pasta: &str,
    nome: &str,
    offset: u64,
    total: u64,
    dados: &[u8],
) -> Result<Parte, KofError> {
    use std::io::{Seek, SeekFrom, Write};
    if pasta.contains('/') || nome.contains('/') || nome.contains('\\') || nome.ends_with(".kofparcial") {
        return Err(KofError::ForaDoEscopo(format!("{pasta}/{nome}")));
    }
    let dest = resolver(raiz, &format!("Games/{pasta}"))?;
    std::fs::create_dir_all(&dest).map_err(|e| KofError::de_io(dest.display(), e))?;
    let p = dest.join(nome);
    let tmp = dest.join(format!("{nome}.kofparcial"));
    if offset == 0 && std::fs::metadata(&p).is_ok_and(|m| m.len() == total) {
        return Ok(Parte {
            stored: Some(relativo(raiz, &p)),
            ja: true,
        });
    }
    let mut f = if offset == 0 {
        std::fs::File::create(&tmp)
    } else {
        std::fs::OpenOptions::new().write(true).open(&tmp)
    }
    .map_err(|e| KofError::de_io(tmp.display(), e))?;
    let tem = f.metadata().map_err(|e| KofError::de_io(tmp.display(), e))?.len();
    if tem != offset {
        return Err(KofError::Conflito(format!(
            "{nome}: o pedaço começa em {offset}, mas já tem {tem} bytes (comece de novo)"
        )));
    }
    f.seek(SeekFrom::Start(offset))
        .and_then(|_| f.write_all(dados))
        .and_then(|_| f.flush())
        .map_err(|e| KofError::de_io(tmp.display(), e))?;
    drop(f);
    let fim = offset + dados.len() as u64;
    if fim > total {
        let _ = std::fs::remove_file(&tmp); // pedido errado: não deixa sobra
        return Err(KofError::argumento(
            "total",
            format!("passou do tamanho ({fim} > {total})"),
        ));
    }
    if fim < total {
        return Ok(Parte {
            stored: None,
            ja: false,
        });
    }
    std::fs::rename(&tmp, &p).map_err(|e| KofError::de_io(p.display(), e))?;
    Ok(Parte {
        stored: Some(relativo(raiz, &p)),
        ja: false,
    })
}
