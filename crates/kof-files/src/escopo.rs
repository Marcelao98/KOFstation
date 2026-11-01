//! Escopos de caminho: o app só fala "relativo a X". `..`, caminho absoluto e link simbólico pra fora dão
//! `PATH_OUTSIDE_SCOPE`.
use kof_core::KofError;
use std::path::{Component, Path, PathBuf};

/// Junta `rel` (relativo, com `/`) à `base`, garantindo que o resultado fica dentro dela.
pub fn resolver(base: &Path, rel: &str) -> Result<PathBuf, KofError> {
    let fora = || KofError::ForaDoEscopo(rel.to_string());
    if rel.contains('\0') {
        return Err(fora());
    }
    let mut p = base.to_path_buf();
    for c in Path::new(rel).components() {
        match c {
            Component::Normal(x) => p.push(x),
            Component::CurDir => {}
            _ => return Err(fora()), // .., raiz, C:\
        }
    }
    // link simbólico: o caminho de verdade tem que continuar dentro da base
    if let (Ok(real), Ok(b)) = (p.canonicalize(), base.canonicalize()) {
        if !real.starts_with(&b) {
            return Err(fora());
        }
    }
    Ok(p)
}

/// O caminho relativo (com `/`) de `p` dentro de `base`.
pub fn relativo(base: &Path, p: &Path) -> String {
    p.strip_prefix(base)
        .unwrap_or(p)
        .components()
        .map(|c| c.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

/// Lê um pedaço de um arquivo (ou ele inteiro).
pub fn ler(p: &Path, inicio: u64, tamanho: Option<u64>) -> Result<Vec<u8>, KofError> {
    use std::io::{Read, Seek, SeekFrom};
    let nome = p.display().to_string();
    let mut f = std::fs::File::open(p).map_err(|e| KofError::de_io(&nome, e))?;
    let total = f.metadata().map_err(|e| KofError::de_io(&nome, e))?.len();
    if inicio > total {
        return Err(KofError::argumento(
            "offset",
            format!("{inicio} passa do fim ({total})"),
        ));
    }
    let n = tamanho.unwrap_or(total - inicio).min(total - inicio);
    f.seek(SeekFrom::Start(inicio)).map_err(|e| KofError::de_io(&nome, e))?;
    let mut v = vec![0u8; n as usize];
    f.read_exact(&mut v).map_err(|e| KofError::de_io(&nome, e))?;
    Ok(v)
}
