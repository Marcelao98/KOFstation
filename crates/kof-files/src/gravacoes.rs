//! ⏺ Gravações do jogo (G.1): o vídeo chega da página em pedaços (um por segundo, sem saber o tamanho final) e vai
//! direto pra `<Kof Games>/Gravações/`. Enquanto grava, o arquivo tem o fim `.kofparcial`; o `fechar` dá o nome final.
use crate::escopo::resolver;
use kof_core::KofError;
use std::io::Write;
use std::path::{Path, PathBuf};

/// A pasta das gravações, dentro da Kof Games.
pub const PASTA: &str = "Gravações";
const PARCIAL: &str = ".kofparcial";

/// Só nome de arquivo de vídeo (sem pasta, sem `..`): `qualquer coisa.mp4` ou `.webm`.
fn validar(nome: &str) -> Result<(), KofError> {
    let fora = || KofError::ForaDoEscopo(format!("{PASTA}/{nome}"));
    if nome.is_empty()
        || nome.len() > 200
        || nome.contains(['/', '\\', '\0'])
        || nome.starts_with('.')
        || nome.chars().any(char::is_control)
    {
        return Err(fora());
    }
    let n = nome.to_lowercase();
    if !(n.ends_with(".mp4") || n.ends_with(".webm")) {
        return Err(KofError::argumento("nome", "a gravação tem que ser .mp4 ou .webm"));
    }
    Ok(())
}

fn pasta(raiz: &Path) -> Result<PathBuf, KofError> {
    let p = resolver(raiz, PASTA)?;
    std::fs::create_dir_all(&p).map_err(|e| KofError::de_io(p.display(), e))?;
    Ok(p)
}

/// Junta um pedaço no fim da gravação. `offset` é quanto já foi mandado: 0 começa o arquivo do zero; outro valor tem que
/// bater com o que já está no disco (pedaço perdido ou repetido dá `CONFLICT`). Devolve o tamanho até aqui.
pub fn anexar(raiz: &Path, nome: &str, offset: u64, dados: &[u8]) -> Result<u64, KofError> {
    validar(nome)?;
    let tmp = pasta(raiz)?.join(format!("{nome}{PARCIAL}"));
    let mut f = if offset == 0 {
        std::fs::File::create(&tmp)
    } else {
        std::fs::OpenOptions::new().append(true).open(&tmp)
    }
    .map_err(|e| KofError::de_io(tmp.display(), e))?;
    let tem = f.metadata().map_err(|e| KofError::de_io(tmp.display(), e))?.len();
    if tem != offset {
        return Err(KofError::Conflito(format!(
            "{nome}: o pedaço começa em {offset}, mas a gravação já tem {tem} bytes"
        )));
    }
    f.write_all(dados)
        .and_then(|_| f.flush())
        .map_err(|e| KofError::de_io(tmp.display(), e))?;
    Ok(offset + dados.len() as u64)
}

/// Fecha a gravação: tira o `.kofparcial`. Se já existe um arquivo com esse nome, vira `nome (2).mp4`. Devolve o caminho
/// relativo à Kof Games.
pub fn fechar(raiz: &Path, nome: &str) -> Result<String, KofError> {
    validar(nome)?;
    let dir = pasta(raiz)?;
    let tmp = dir.join(format!("{nome}{PARCIAL}"));
    if !tmp.is_file() {
        return Err(KofError::NaoEncontrado(format!("{PASTA}/{nome}")));
    }
    let (base, ext) = nome.rsplit_once('.').unwrap_or((nome, ""));
    let mut dest = dir.join(nome);
    let mut n = 2;
    while dest.exists() {
        dest = dir.join(format!("{base} ({n}).{ext}"));
        n += 1;
    }
    std::fs::rename(&tmp, &dest).map_err(|e| KofError::de_io(dest.display(), e))?;
    let final_ = dest
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(format!("{PASTA}/{final_}"))
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn pedacos_em_ordem_viram_o_arquivo() {
        let d = tempfile::tempdir().unwrap();
        assert_eq!(anexar(d.path(), "Jogo 1.mp4", 0, b"abc").unwrap(), 3);
        assert_eq!(anexar(d.path(), "Jogo 1.mp4", 3, b"de").unwrap(), 5);
        // pedaço repetido ou perdido: não estraga o que já está lá
        assert_eq!(
            anexar(d.path(), "Jogo 1.mp4", 3, b"de").unwrap_err().codigo(),
            "CONFLICT"
        );
        let rel = fechar(d.path(), "Jogo 1.mp4").unwrap();
        assert_eq!(rel, "Gravações/Jogo 1.mp4");
        assert_eq!(std::fs::read(d.path().join(&rel)).unwrap(), b"abcde");
        assert!(!d.path().join("Gravações/Jogo 1.mp4.kofparcial").exists());
        // mesmo nome de novo: não apaga o primeiro
        anexar(d.path(), "Jogo 1.mp4", 0, b"x").unwrap();
        assert_eq!(fechar(d.path(), "Jogo 1.mp4").unwrap(), "Gravações/Jogo 1 (2).mp4");
        // começar de novo (offset 0) zera a parcial
        anexar(d.path(), "b.webm", 0, b"lixo").unwrap();
        anexar(d.path(), "b.webm", 0, b"ok").unwrap();
        assert_eq!(
            std::fs::read(d.path().join(fechar(d.path(), "b.webm").unwrap())).unwrap(),
            b"ok"
        );
    }

    #[test]
    fn nome_fora_da_pasta_ou_sem_ser_video_nao_passa() {
        let d = tempfile::tempdir().unwrap();
        for n in [
            "../x.mp4",
            "a/b.mp4",
            "a\\b.mp4",
            ".x.mp4",
            "",
            "x.exe",
            "x.mp4.kofparcial",
        ] {
            assert!(anexar(d.path(), n, 0, b"a").is_err(), "{n}");
        }
        assert_eq!(fechar(d.path(), "nao-tem.mp4").unwrap_err().codigo(), "NOT_FOUND");
    }
}
