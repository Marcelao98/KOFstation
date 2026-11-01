//! Lojas de dados do app (o IndexedDB do antigo, agora em arquivo): cada registro é `<chave>.json` (metadados, lidos na
//! listagem) + `<chave>.bin` (os bytes: save comprimido, estado...). Lojas com nome fixo; a chave vira nome de arquivo
//! com `%XX` no que não for letra, número, `.`, `_` ou `-`. Gravação atômica (arquivo temporário + rename).
use kof_core::KofError;
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};

/// As lojas que existem (as do banco `kofnes` do antigo que viraram arquivo).
pub const LOJAS: [&str; 8] = [
    "jogos", "saves", "estados", "autos", "stats", "musicas", "capas", "visual",
];

#[derive(Debug, Serialize)]
pub struct Registro {
    pub key: String,
    pub meta: Value,
    /// bytes do .bin (0 = sem)
    pub size: u64,
}

pub fn codificar(chave: &str) -> Result<String, KofError> {
    if chave.is_empty() || chave.len() > 400 {
        return Err(KofError::argumento("key", "chave vazia ou grande demais"));
    }
    let mut s = String::with_capacity(chave.len());
    for b in chave.bytes() {
        if b.is_ascii_alphanumeric() || b == b'_' || b == b'-' || (b == b'.' && !s.is_empty() && !s.ends_with('.')) {
            s.push(b as char);
        } else {
            s.push_str(&format!("%{b:02X}"));
        }
    }
    Ok(s)
}

pub fn decodificar(nome: &str) -> String {
    let b = nome.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 3 <= b.len() {
            if let Ok(v) = u8::from_str_radix(&nome[i + 1..i + 3], 16) {
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

pub struct Lojas {
    base: PathBuf,
}

fn gravar_atomico(p: &Path, dados: &[u8]) -> Result<(), KofError> {
    let tmp = p.with_extension("tmp");
    std::fs::write(&tmp, dados).map_err(|e| KofError::de_io(tmp.display(), e))?;
    std::fs::rename(&tmp, p).map_err(|e| KofError::de_io(p.display(), e))
}

impl Lojas {
    pub fn nova(base: PathBuf) -> Self {
        Self { base }
    }

    fn pasta(&self, loja: &str) -> Result<PathBuf, KofError> {
        if !LOJAS.contains(&loja) {
            return Err(KofError::argumento("store", format!("loja desconhecida: {loja}")));
        }
        Ok(self.base.join(loja))
    }

    fn caminhos(&self, loja: &str, chave: &str) -> Result<(PathBuf, PathBuf), KofError> {
        let d = self.pasta(loja)?;
        let c = codificar(chave)?;
        Ok((d.join(format!("{c}.json")), d.join(format!("{c}.bin"))))
    }

    pub fn por(&self, loja: &str, chave: &str, meta: &Value, dados: &[u8]) -> Result<(), KofError> {
        let d = self.pasta(loja)?;
        std::fs::create_dir_all(&d).map_err(|e| KofError::de_io(d.display(), e))?;
        let (j, b) = self.caminhos(loja, chave)?;
        if dados.is_empty() {
            let _ = std::fs::remove_file(&b); // sem bytes: o .bin antigo (se tinha) sai
        } else {
            gravar_atomico(&b, dados)?;
        }
        gravar_atomico(&j, &serde_json::to_vec(meta).expect("json"))
    }

    pub fn pegar(&self, loja: &str, chave: &str) -> Result<Vec<u8>, KofError> {
        let (j, b) = self.caminhos(loja, chave)?;
        if !j.is_file() {
            return Err(KofError::NaoEncontrado(format!("{loja}/{chave}")));
        }
        match std::fs::read(&b) {
            Ok(v) => Ok(v),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(vec![]),
            Err(e) => Err(KofError::de_io(b.display(), e)),
        }
    }

    pub fn meta(&self, loja: &str, chave: &str) -> Result<Value, KofError> {
        let (j, _) = self.caminhos(loja, chave)?;
        let t = std::fs::read(&j).map_err(|e| KofError::de_io(format!("{loja}/{chave}"), e))?;
        serde_json::from_slice(&t).map_err(|e| KofError::argumento("meta", e.to_string()))
    }

    pub fn apagar(&self, loja: &str, chave: &str) -> Result<(), KofError> {
        let (j, b) = self.caminhos(loja, chave)?;
        for p in [j, b] {
            if let Err(e) = std::fs::remove_file(&p) {
                if e.kind() != std::io::ErrorKind::NotFound {
                    return Err(KofError::de_io(p.display(), e));
                }
            }
        }
        Ok(())
    }

    /// Todos os registros (metadados) de uma loja; `prefixo` filtra pela chave.
    pub fn listar(&self, loja: &str, prefixo: Option<&str>) -> Result<Vec<Registro>, KofError> {
        let d = self.pasta(loja)?;
        let Ok(l) = std::fs::read_dir(&d) else {
            return Ok(vec![]);
        };
        let mut r = Vec::new();
        for e in l.flatten() {
            let nome = e.file_name().to_string_lossy().into_owned();
            let Some(c) = nome.strip_suffix(".json") else { continue };
            let chave = decodificar(c);
            if prefixo.is_some_and(|p| !chave.starts_with(p)) {
                continue;
            }
            let Ok(t) = std::fs::read(e.path()) else { continue };
            let Ok(meta) = serde_json::from_slice(&t) else {
                tracing::warn!(loja, chave, "registro com JSON estragado: ignorado");
                continue;
            };
            let size = std::fs::metadata(d.join(format!("{c}.bin")))
                .map(|m| m.len())
                .unwrap_or(0);
            r.push(Registro { key: chave, meta, size });
        }
        r.sort_by(|a, b| a.key.cmp(&b.key));
        Ok(r)
    }

    /// Quanto cada loja ocupa (Espaço usado).
    pub fn espaco(&self) -> Vec<(String, u64, usize)> {
        LOJAS
            .iter()
            .map(|l| {
                let mut bytes = 0;
                let mut n = 0;
                if let Ok(x) = std::fs::read_dir(self.base.join(l)) {
                    for e in x.flatten() {
                        bytes += e.metadata().map(|m| m.len()).unwrap_or(0);
                        if e.file_name().to_string_lossy().ends_with(".json") {
                            n += 1;
                        }
                    }
                }
                (l.to_string(), bytes, n)
            })
            .collect()
    }
}
