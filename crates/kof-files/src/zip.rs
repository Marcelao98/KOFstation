//! Diretório de um .zip lido do fim do arquivo (sem descompactar nada): nome, tamanho e CRC de cada entrada. É o
//! que a detecção de sistema precisa (domain/deteccao.ts) e o que o Neo Geo usa pra achar o set pelos CRCs.
use kof_core::KofError;
use serde::Serialize;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ItemDoZip {
    pub nome: String,
    pub tamanho: u64,
    pub crc: String,
}

fn u16le(b: &[u8], i: usize) -> u16 {
    u16::from_le_bytes([b[i], b[i + 1]])
}
fn u32le(b: &[u8], i: usize) -> u32 {
    u32::from_le_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]])
}

/// Itens do zip; zip estragado devolve vazio (não é jogo que dê pra reconhecer).
pub fn itens(f: &mut std::fs::File, tamanho: u64) -> Vec<ItemDoZip> {
    entradas(f, tamanho)
        .unwrap_or_default()
        .into_iter()
        .map(|e| ItemDoZip {
            nome: e.nome,
            tamanho: e.tamanho,
            crc: format!("{:08x}", e.crc),
        })
        .collect()
}

/// Uma entrada do diretório central, com o que precisa pra descompactar.
#[derive(Debug, Clone)]
struct Entrada {
    /// só o nome (sem as pastas de dentro do zip)
    nome: String,
    tamanho: u64,
    comprimido: u64,
    metodo: u16,
    crc: u32,
    /// onde fica o cabeçalho local
    local: u64,
}

fn entradas(f: &mut std::fs::File, tamanho: u64) -> std::io::Result<Vec<Entrada>> {
    let ini = tamanho.saturating_sub(65557);
    f.seek(SeekFrom::Start(ini))?;
    let mut fim = Vec::new();
    f.take(tamanho - ini).read_to_end(&mut fim)?;
    let Some(e) = (0..fim.len().saturating_sub(21))
        .rev()
        .find(|&i| u32le(&fim, i) == 0x0605_4b50)
    else {
        return Ok(vec![]);
    };
    let total = u16le(&fim, e + 10) as usize;
    let tam_dir = u32le(&fim, e + 12) as u64;
    let ofs_dir = u32le(&fim, e + 16) as u64;
    let mut dir = vec![0u8; tam_dir.min(64 << 20) as usize];
    f.seek(SeekFrom::Start(ofs_dir))?;
    f.read_exact(&mut dir)?;
    let mut r = Vec::new();
    let mut p = 0usize;
    for _ in 0..total {
        if p + 46 > dir.len() || u32le(&dir, p) != 0x0201_4b50 {
            break;
        }
        let nl = u16le(&dir, p + 28) as usize;
        let xl = u16le(&dir, p + 30) as usize;
        let cl = u16le(&dir, p + 32) as usize;
        let Some(nome_b) = dir.get(p + 46..p + 46 + nl) else {
            break;
        };
        let nome = String::from_utf8_lossy(nome_b);
        let nome = nome.rsplit(['/', '\\']).next().unwrap_or("").to_string();
        if !nome.is_empty() {
            r.push(Entrada {
                nome,
                tamanho: u32le(&dir, p + 24) as u64,
                comprimido: u32le(&dir, p + 20) as u64,
                metodo: u16le(&dir, p + 10),
                crc: u32le(&dir, p + 16),
                local: u32le(&dir, p + 42) as u64,
            });
        }
        p += 46 + nl + xl + cl;
    }
    Ok(r)
}

fn ruim(zip: &Path, motivo: impl std::fmt::Display) -> KofError {
    KofError::ZipRuim(format!("{}: {motivo}", zip.display()))
}

/// Abre o leitor dos bytes descompactados de uma entrada (guardada ou deflate).
fn leitor<'a>(zip: &Path, f: &'a mut std::fs::File, e: &Entrada) -> Result<Box<dyn Read + 'a>, KofError> {
    if e.tamanho == 0xFFFF_FFFF || e.comprimido == 0xFFFF_FFFF || e.local == 0xFFFF_FFFF {
        return Err(ruim(
            zip,
            format!("{} está num zip64 (maior que 4 GB), que eu não sei abrir", e.nome),
        ));
    }
    let io = |x: std::io::Error| KofError::de_io(zip.display(), x);
    f.seek(SeekFrom::Start(e.local)).map_err(io)?;
    let mut cab = [0u8; 30];
    f.read_exact(&mut cab).map_err(io)?;
    if u32le(&cab, 0) != 0x0403_4b50 {
        return Err(ruim(zip, format!("cabeçalho de {} não encontrado", e.nome)));
    }
    let pular = u16le(&cab, 26) as i64 + u16le(&cab, 28) as i64;
    f.seek(SeekFrom::Current(pular)).map_err(io)?;
    let bruto = f.take(e.comprimido);
    match e.metodo {
        0 => Ok(Box::new(bruto)),
        8 => Ok(Box::new(flate2::read::DeflateDecoder::new(std::io::BufReader::new(
            bruto,
        )))),
        m => Err(ruim(
            zip,
            format!("{} usa uma compressão que eu não conheço (método {m})", e.nome),
        )),
    }
}

fn achar(zip: &Path, f: &mut std::fs::File, nome: &str) -> Result<Entrada, KofError> {
    let tamanho = f.metadata().map_err(|e| KofError::de_io(zip.display(), e))?.len();
    let es = entradas(f, tamanho).map_err(|e| ruim(zip, e))?;
    es.into_iter()
        .find(|e| e.nome.eq_ignore_ascii_case(nome))
        .ok_or_else(|| KofError::NaoEncontrado(format!("{nome} dentro de {}", zip.display())))
}

/// Os primeiros `max` bytes (ou tudo) de um arquivo de dentro do zip, descompactados. Serve pra página ler o `.cue` ou
/// a cabeça do CD sem passar o zip inteiro (o resto fica pro núcleo nativo, pelo `extrair_cd`).
pub fn ler_entrada(zip: &Path, nome: &str, max: Option<u64>) -> Result<Vec<u8>, KofError> {
    let mut f = std::fs::File::open(zip).map_err(|e| KofError::de_io(zip.display(), e))?;
    let e = achar(zip, &mut f, nome)?;
    let mut r = Vec::new();
    let quanto = max.unwrap_or(e.tamanho).min(e.tamanho);
    leitor(zip, &mut f, &e)?
        .take(quanto)
        .read_to_end(&mut r)
        .map_err(|x| ruim(zip, format!("não consegui descompactar {}: {x}", e.nome)))?;
    Ok(r)
}

/// Arquivos de CD de PS1 que vão pro núcleo (e o .sbi da proteção, que o PCSX procura do lado).
fn de_cd(n: &str) -> bool {
    let n = n.to_ascii_lowercase();
    [
        ".cue", ".bin", ".img", ".iso", ".chd", ".pbp", ".sbi", ".ccd", ".sub", ".m3u", ".exe",
    ]
    .iter()
    .any(|x| n.ends_with(x))
}

fn nome_ok(n: &str) -> bool {
    !n.is_empty() && n != "." && n != ".." && !n.contains(['/', '\\', ':', '\0'])
}

/// O arquivo que o núcleo abre: o .cue, senão a imagem única, senão o maior .bin.
fn principal(es: &[Entrada]) -> Option<&Entrada> {
    let ext = |e: &Entrada, x: &[&str]| x.iter().any(|x| e.nome.to_ascii_lowercase().ends_with(x));
    es.iter()
        .find(|e| ext(e, &[".cue"]))
        .or_else(|| es.iter().find(|e| ext(e, &[".chd", ".pbp", ".iso"])))
        .or_else(|| {
            es.iter()
                .filter(|e| ext(e, &[".bin", ".img"]))
                .max_by_key(|e| e.tamanho)
        })
}

/// Extrai o CD de PS1 de dentro do zip numa pasta de cache e devolve o arquivo principal (o .cue, a imagem). O núcleo
/// nativo lê de lá; a página nunca vê o CD. Só um CD fica no cache por vez (um CD de PS1 tem até ~700 MB): extrair
/// outro apaga o anterior. Reaproveita a extração quando o zip é o mesmo (nome, tamanho e data).
pub fn extrair_cd(zip: &Path, cache: &Path) -> Result<PathBuf, KofError> {
    let io_zip = |e: std::io::Error| KofError::de_io(zip.display(), e);
    let io_cache = |p: &Path, e: std::io::Error| KofError::de_io(p.display(), e);
    let mut f = std::fs::File::open(zip).map_err(io_zip)?;
    let meta = f.metadata().map_err(io_zip)?;
    let data = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let es: Vec<Entrada> = entradas(&mut f, meta.len())
        .map_err(|e| ruim(zip, e))?
        .into_iter()
        .filter(|e| de_cd(&e.nome) && nome_ok(&e.nome))
        .collect();
    let p = principal(&es).ok_or_else(|| ruim(zip, "não achei um CD de PS1 dentro"))?;
    let base: String = zip
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || " -_().".contains(c) {
                c
            } else {
                '_'
            }
        })
        .take(80)
        .collect();
    let chave = format!("{}-{}-{}", base.trim(), meta.len(), data);
    let pasta = cache.join(&chave);
    let alvo = pasta.join(&p.nome);
    if pasta.join(".pronto").is_file() && alvo.is_file() {
        tracing::info!(pasta = %pasta.display(), "CD do zip já extraído: reaproveitando");
        return Ok(alvo);
    }
    std::fs::create_dir_all(cache).map_err(|e| io_cache(cache, e))?;
    // um CD por vez no cache (os outros e as extrações que pararam no meio saem)
    if let Ok(rd) = std::fs::read_dir(cache) {
        for d in rd.flatten() {
            if d.file_name().to_string_lossy() != chave {
                let r = if d.path().is_dir() {
                    std::fs::remove_dir_all(d.path())
                } else {
                    std::fs::remove_file(d.path())
                };
                if let Err(e) = r {
                    tracing::warn!(caminho = %d.path().display(), erro = %e, "não consegui limpar o cache de CDs");
                }
            }
        }
    }
    let parcial = cache.join(format!("{chave}.parcial"));
    if parcial.exists() {
        std::fs::remove_dir_all(&parcial).map_err(|e| io_cache(&parcial, e))?;
    }
    std::fs::create_dir_all(&parcial).map_err(|e| io_cache(&parcial, e))?;
    let t0 = std::time::Instant::now();
    let mut total = 0u64;
    for e in &es {
        let destino = parcial.join(&e.nome);
        let mut saida = std::fs::File::create(&destino).map_err(|x| io_cache(&destino, x))?;
        let mut crc = Crc {
            h: crc32fast::Hasher::new(),
            w: &mut saida,
        };
        let n = std::io::copy(&mut leitor(zip, &mut f, e)?, &mut crc).map_err(|x| match x.kind() {
            std::io::ErrorKind::StorageFull => KofError::DiscoCheio(destino.display().to_string()),
            _ => ruim(zip, format!("não consegui extrair {}: {x}", e.nome)),
        })?;
        let h = crc.h.finalize();
        if n != e.tamanho || h != e.crc {
            return Err(ruim(
                zip,
                format!("{} veio estragado (CRC {h:08x}, esperado {:08x})", e.nome, e.crc),
            ));
        }
        total += n;
    }
    std::fs::write(parcial.join(".pronto"), b"").map_err(|e| io_cache(&parcial, e))?;
    if pasta.exists() {
        std::fs::remove_dir_all(&pasta).map_err(|e| io_cache(&pasta, e))?;
    }
    std::fs::rename(&parcial, &pasta).map_err(|e| io_cache(&pasta, e))?;
    tracing::info!(
        mb = total >> 20,
        segundos = t0.elapsed().as_secs_f32(),
        pasta = %pasta.display(),
        "CD extraído do zip pro núcleo nativo"
    );
    Ok(alvo)
}

/// Escreve e calcula o CRC32 junto (confere a extração sem ler o arquivo de novo).
struct Crc<'a, W: Write> {
    h: crc32fast::Hasher,
    w: &'a mut W,
}
impl<W: Write> Write for Crc<'_, W> {
    fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
        let n = self.w.write(b)?;
        self.h.update(&b[..n]);
        Ok(n)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.w.flush()
    }
}

/// Monta um .zip (deflate) em memória com os arquivos dados (nome com `/` pra pasta). É o que o modo diagnóstico
/// exporta (M16.3); data e hora das entradas fixas em 1980-01-01 (o conteúdo é que importa).
pub fn montar(itens: &[(String, Vec<u8>)]) -> std::io::Result<Vec<u8>> {
    let mut saida = Vec::new();
    let mut central = Vec::new();
    for (nome, dados) in itens {
        let mut c = flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
        c.write_all(dados)?;
        let comprimido = c.finish()?;
        let crc = crc32fast::hash(dados);
        let n = nome.as_bytes();
        let grande = |v: usize| {
            u32::try_from(v).map_err(|_| std::io::Error::other(format!("{nome}: grande demais pro zip (4 GB)")))
        };
        let (tc, tn, desl) = (grande(comprimido.len())?, grande(dados.len())?, grande(saida.len())?);
        let cab = |assinatura: u32, central: bool| {
            let mut h = Vec::with_capacity(46 + n.len());
            h.extend_from_slice(&assinatura.to_le_bytes());
            if central {
                h.extend_from_slice(&20u16.to_le_bytes()); // feito por
            }
            h.extend_from_slice(&20u16.to_le_bytes()); // versão pra abrir
            h.extend_from_slice(&0x0800u16.to_le_bytes()); // nomes em UTF-8
            h.extend_from_slice(&8u16.to_le_bytes()); // deflate
            h.extend_from_slice(&0u16.to_le_bytes()); // hora
            h.extend_from_slice(&0x0021u16.to_le_bytes()); // 1980-01-01
            h.extend_from_slice(&crc.to_le_bytes());
            h.extend_from_slice(&tc.to_le_bytes());
            h.extend_from_slice(&tn.to_le_bytes());
            h.extend_from_slice(&(n.len() as u16).to_le_bytes());
            h.extend_from_slice(&0u16.to_le_bytes()); // extra
            if central {
                h.extend_from_slice(&[0; 6]); // comentário, disco, atributos internos
                h.extend_from_slice(&0u32.to_le_bytes()); // atributos externos
                h.extend_from_slice(&desl.to_le_bytes());
            }
            h.extend_from_slice(n);
            h
        };
        saida.extend_from_slice(&cab(0x0403_4b50, false));
        saida.extend_from_slice(&comprimido);
        central.extend_from_slice(&cab(0x0201_4b50, true));
    }
    let inicio_central = saida.len() as u32;
    saida.extend_from_slice(&central);
    saida.extend_from_slice(&0x0605_4b50u32.to_le_bytes());
    saida.extend_from_slice(&[0; 4]);
    saida.extend_from_slice(&(itens.len() as u16).to_le_bytes());
    saida.extend_from_slice(&(itens.len() as u16).to_le_bytes());
    saida.extend_from_slice(&(central.len() as u32).to_le_bytes());
    saida.extend_from_slice(&inicio_central.to_le_bytes());
    saida.extend_from_slice(&0u16.to_le_bytes());
    Ok(saida)
}

#[cfg(test)]
mod testes_montar {
    use super::*;

    #[test]
    fn monta_e_le_de_volta() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("r.zip");
        let texto = "t_ms,nucleo_ms\n".repeat(500).into_bytes();
        let z = montar(&[
            ("sessao/quadros.csv".into(), texto.clone()),
            ("resumo.txt".into(), b"oi".to_vec()),
        ])
        .unwrap();
        assert!(z.len() < texto.len() / 4, "comprime");
        std::fs::write(&p, &z).unwrap();
        let mut f = std::fs::File::open(&p).unwrap();
        let itens = itens(&mut f, z.len() as u64);
        assert_eq!(itens.len(), 2);
        assert_eq!(
            itens[0].nome, "quadros.csv",
            "o leitor daqui mostra só o nome, sem a pasta"
        );
        assert_eq!(ler_entrada(&p, "quadros.csv", None).unwrap(), texto);
        assert_eq!(ler_entrada(&p, "resumo.txt", None).unwrap(), b"oi");
    }
}
