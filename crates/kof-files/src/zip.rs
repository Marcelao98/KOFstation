//! Diretório de um .zip lido do fim do arquivo (sem descompactar nada): nome, tamanho e CRC de cada entrada. É o
//! que a detecção de sistema precisa (domain/deteccao.ts) e o que o Neo Geo usa pra achar o set pelos CRCs.
use serde::Serialize;
use std::io::{Read, Seek, SeekFrom};

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
    ler_itens(f, tamanho).unwrap_or_default()
}

fn ler_itens(f: &mut std::fs::File, tamanho: u64) -> std::io::Result<Vec<ItemDoZip>> {
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
            r.push(ItemDoZip {
                nome,
                tamanho: u32le(&dir, p + 24) as u64,
                crc: format!("{:08x}", u32le(&dir, p + 16)),
            });
        }
        p += 46 + nl + xl + cl;
    }
    Ok(r)
}
