//! Varredura da pasta Kof Games/Games (até 2 níveis abaixo, como o `varrer` do antigo) e o CRC No-Intro dos arquivos,
//! com cache por caminho+tamanho+data. A decisão de "que console é" fica no TS (domain/deteccao.ts): aqui só os fatos.
use crate::escopo::{relativo, resolver};
use crate::zip::{itens, ItemDoZip};
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Clone, PartialEq)]
pub struct Arquivo {
    /// relativo à raiz Kof Games, com `/`
    pub path: String,
    pub size: u64,
    /// ms desde 1970
    pub modified: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub zip: Option<Vec<ItemDoZip>>,
    /// `Some("ps1"|"ps2")` pelo conteúdo, `Some(None)`→ null quando olhou e não é; ausente quando não olhou
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cd: Option<Option<&'static str>>,
}

fn ms(m: &std::fs::Metadata) -> u64 {
    m.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn extensao(p: &Path) -> String {
    p.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

fn ler_em(f: &mut std::fs::File, ini: u64, n: usize) -> Option<Vec<u8>> {
    f.seek(SeekFrom::Start(ini)).ok()?;
    let mut v = Vec::with_capacity(n);
    f.take(n as u64).read_to_end(&mut v).ok()?;
    Some(v)
}

/// O `cdPs1` do antigo: setor cru de CD ou ISO de 2048 com "CD001".
pub fn cd_ps1(b: &[u8]) -> bool {
    (b.len() > 0x9000 && b[0] == 0 && b[11] == 0 && b[1..11].iter().all(|&x| x == 0xFF))
        || (b.len() > 0x8006 && &b[0x8001..0x8006] == b"CD001")
}

/// ISO 9660 com SYSTEM.CNF dizendo BOOT2 = DVD de PS2 (o `ehPs2` do antigo).
pub fn iso_de_ps2(f: &mut std::fs::File) -> bool {
    let Some(pvd) = ler_em(f, 16 * 2048, 2048) else {
        return false;
    };
    if pvd.len() < 2048 || &pvd[1..6] != b"CD001" {
        return false;
    }
    let u32le = |b: &[u8], i: usize| u32::from_le_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]]);
    let setor = u32le(&pvd, 158) as u64;
    let tam = (u32le(&pvd, 166) as usize).min(65536);
    let Some(raiz) = ler_em(f, setor * 2048, tam) else {
        return false;
    };
    let mut i = 0usize;
    while i < raiz.len() {
        let len = raiz[i] as usize;
        if len == 0 {
            i = (i / 2048 + 1) * 2048;
            continue;
        }
        if i + 33 > raiz.len() {
            break;
        }
        let nl = raiz[i + 32] as usize;
        let nome = raiz.get(i + 33..i + 33 + nl).unwrap_or(&[]);
        if nome.len() >= 10 && nome[..10].eq_ignore_ascii_case(b"SYSTEM.CNF") {
            let s = u32le(&raiz, i + 2) as u64;
            let n = (u32le(&raiz, i + 10) as usize).min(2048);
            return ler_em(f, s * 2048, n).is_some_and(|c| c.windows(5).any(|w| w == b"BOOT2"));
        }
        i += len;
    }
    false
}

/// Os fatos de um arquivo (tamanho, data, zip, CD).
pub fn fatos(raiz: &Path, p: &Path) -> Option<Arquivo> {
    let m = std::fs::metadata(p).ok()?;
    let ext = extensao(p);
    let mut a = Arquivo {
        path: relativo(raiz, p),
        size: m.len(),
        modified: ms(&m),
        zip: None,
        cd: None,
    };
    if ext == "zip" {
        let mut f = std::fs::File::open(p).ok()?;
        a.zip = Some(itens(&mut f, m.len()));
    } else if matches!(ext.as_str(), "bin" | "img" | "iso") && m.len() > 0x9000 {
        let mut f = std::fs::File::open(p).ok()?;
        let ps2 = ext != "bin" && iso_de_ps2(&mut f);
        a.cd = Some(if ps2 {
            Some("ps2")
        } else if ler_em(&mut f, 0, 0x9001).is_some_and(|b| cd_ps1(&b)) {
            Some("ps1")
        } else {
            None
        });
    }
    Some(a)
}

/// Varre `Games` (e sub-pastas até 2 níveis), só os arquivos com as extensões pedidas (as de jogo + zip).
pub fn varrer(raiz: &Path, exts: &HashSet<String>) -> Result<Vec<Arquivo>, KofError> {
    let games = raiz.join("Games");
    if !games.is_dir() {
        return Err(KofError::RaizFaltando(games.display().to_string()));
    }
    let mut saida = Vec::new();
    varrer_em(raiz, &games, 0, exts, &mut saida);
    saida.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(saida)
}

fn varrer_em(raiz: &Path, dir: &Path, prof: u32, exts: &HashSet<String>, saida: &mut Vec<Arquivo>) {
    let Ok(lista) = std::fs::read_dir(dir) else {
        tracing::warn!(pasta = %dir.display(), "não consegui ler a pasta");
        return;
    };
    for e in lista.flatten() {
        let p = e.path();
        let Ok(t) = e.file_type() else { continue };
        let nome = e.file_name().to_string_lossy().into_owned();
        if nome.starts_with('.') {
            continue;
        }
        if t.is_dir() && prof < 2 {
            varrer_em(raiz, &p, prof + 1, exts, saida);
        } else if (t.is_file() || t.is_symlink() && p.is_file()) && exts.contains(&extensao(&p)) {
            if let Some(a) = fatos(raiz, &p) {
                saida.push(a);
            }
        }
    }
}

// ---------- CRC No-Intro com cache ----------

#[derive(Debug, Deserialize)]
pub struct PedidoCrc {
    pub path: String,
    pub sistema: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ItemCache {
    size: u64,
    modified: u64,
    crc: String,
}

/// Bytes de cabeçalho de copiador que o No-Intro ignora (igual ao `cabecalhoNoIntro` do domain).
pub fn cabecalho(sistema: &str, tamanho: u64, inicio: &[u8]) -> u64 {
    if matches!(sistema, "snes" | "sms" | "gg") && tamanho % 1024 == 512 {
        return 512;
    }
    if sistema == "nes" && inicio.starts_with(b"NES") {
        return 16;
    }
    0
}

pub fn crc_de(p: &Path, sistema: &str) -> Result<String, KofError> {
    let nome = p.display().to_string();
    let mut f = std::fs::File::open(p).map_err(|e| KofError::de_io(&nome, e))?;
    let tam = f.metadata().map_err(|e| KofError::de_io(&nome, e))?.len();
    let ini = ler_em(&mut f, 0, 4).unwrap_or_default();
    f.seek(SeekFrom::Start(cabecalho(sistema, tam, &ini)))
        .map_err(|e| KofError::de_io(&nome, e))?;
    let mut h = crc32fast::Hasher::new();
    let mut buf = vec![0u8; 1 << 20];
    loop {
        let n = f.read(&mut buf).map_err(|e| KofError::de_io(&nome, e))?;
        if n == 0 {
            break;
        }
        h.update(&buf[..n]);
    }
    Ok(format!("{:08x}", h.finalize()))
}

/// CRC de vários arquivos (relativos à raiz); os que já estão no cache (mesmo tamanho e data) não são relidos.
pub fn crcs(dados: &Path, raiz: &Path, pedidos: &[PedidoCrc]) -> Result<BTreeMap<String, String>, KofError> {
    let arq = dados.join("cache").join("crc.json");
    let mut cache: BTreeMap<String, ItemCache> = std::fs::read_to_string(&arq)
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default();
    let mut r = BTreeMap::new();
    let mut mudou = false;
    for p in pedidos {
        let caminho: PathBuf = resolver(raiz, &p.path)?;
        let Ok(m) = std::fs::metadata(&caminho) else { continue };
        let chave = format!("{}|{}", p.sistema, p.path);
        if let Some(c) = cache.get(&chave).filter(|c| c.size == m.len() && c.modified == ms(&m)) {
            r.insert(p.path.clone(), c.crc.clone());
            continue;
        }
        let crc = crc_de(&caminho, &p.sistema)?;
        cache.insert(
            chave,
            ItemCache {
                size: m.len(),
                modified: ms(&m),
                crc: crc.clone(),
            },
        );
        mudou = true;
        r.insert(p.path.clone(), crc);
    }
    if mudou {
        if let Some(d) = arq.parent() {
            let _ = std::fs::create_dir_all(d); // cache: se não der pra gravar, só recalcula da próxima vez
        }
        if let Err(e) = std::fs::write(&arq, serde_json::to_vec(&cache).expect("json")) {
            tracing::warn!("cache de CRC não gravado: {e}");
        }
    }
    Ok(r)
}
