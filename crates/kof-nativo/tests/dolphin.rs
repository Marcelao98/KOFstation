//! O Dolphin do libretro (Wii e GameCube, `third_party/cores/nativos`, tarefa W.1) no frontend novo com OpenGL sem
//! janela: abre, roda quadros e mede o tamanho do estado. Sem jogo de verdade (não pode entrar em teste): um `.dol`
//! mínimo do GameCube gerado aqui, só um laço parado (`b .`). Com `KOF_JOGO_WII=<jogo>` roda também um jogo de
//! verdade da máquina (fora do CI). Precisa do `pnpm nucleos` (sem o núcleo, o teste avisa e passa).
mod comum;

use kof_nativo::nucleo::{Abertura, Nucleo};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

fn nucleo() -> Option<PathBuf> {
    let plat = if cfg!(windows) {
        "windows-x64/dolphin_libretro.dll"
    } else {
        "linux-x64/dolphin_libretro.so"
    };
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/cores/nativos")
        .join(plat);
    p.is_file().then_some(p)
}

/// Um executável do GameCube (formato DOL): cabeçalho de 0x100 bytes e uma seção de código em 0x80003100 com `b .`.
pub fn dol_minimo() -> Vec<u8> {
    let mut d = vec![0u8; 0x100 + 0x20];
    let be = |d: &mut Vec<u8>, o: usize, v: u32| d[o..o + 4].copy_from_slice(&v.to_be_bytes());
    be(&mut d, 0x00, 0x100); // texto 0: onde está no arquivo
    be(&mut d, 0x48, 0x8000_3100); // texto 0: endereço na memória
    be(&mut d, 0x90, 0x20); // texto 0: tamanho
    be(&mut d, 0xD8, 0x8000_3200); // bss
    be(&mut d, 0xDC, 0x20);
    be(&mut d, 0xE0, 0x8000_3100); // entrada
    be(&mut d, 0x100, 0x4800_0000); // b . (laço parado)
    d
}

fn abrir(jogo: PathBuf, dir: &Path) -> Option<Nucleo> {
    let lib = nucleo()?;
    let a = Abertura {
        nucleo: lib,
        jogo: Some(jogo),
        sistema: dir.join("sistema"),
        saves: dir.join("saves"),
        variaveis: BTreeMap::from([
            ("dolphin_renderer".into(), "Hardware".into()),
            ("dolphin_cpu_core".into(), "JIT64".into()),
        ]),
        dispositivo: None,
    };
    std::fs::create_dir_all(&a.sistema).ok()?;
    std::fs::create_dir_all(&a.saves).ok()?;
    match Nucleo::carregar(&a) {
        Ok(n) => Some(n),
        Err(e) if std::env::var("KOF_EXIGIR_GL").unwrap_or_default().is_empty() => {
            eprintln!("aviso: o Dolphin não abriu aqui ({e})");
            None
        }
        Err(e) => panic!("o Dolphin não abriu: {e}"),
    }
}

fn rodar(n: &mut Nucleo, quadros: u32) -> (f64, u32) {
    let mut som = Vec::new();
    let inicio = std::time::Instant::now();
    let mut novos = 0;
    for _ in 0..quadros {
        if n.rodar(&mut som) {
            novos += 1;
        }
    }
    (inicio.elapsed().as_secs_f64() * 1000.0 / quadros as f64, novos)
}

#[test]
fn dolphin_abre_com_opengl_e_um_dol() {
    if nucleo().is_none() {
        eprintln!("aviso: sem o Dolphin (rode o pnpm nucleos)");
        return;
    }
    let dir = tempfile::tempdir().unwrap();
    let dol = dir.path().join("laco.dol");
    std::fs::write(&dol, dol_minimo()).unwrap();
    let Some(mut n) = abrir(dol, dir.path()) else { return };
    eprintln!(
        "{} {} · {:?} · need_fullpath={} · extensões {}",
        n.info.nome, n.info.versao, n.av.geometry, n.info.caminho_inteiro, n.info.extensoes
    );
    assert!(n.pediu_gpu(), "o Dolphin desenha pela placa");
    assert!(
        n.info.caminho_inteiro,
        "o disco é lido do disco pelo processo: nunca passa inteiro pela memória da página"
    );
    let (ms, novos) = rodar(&mut n, 120);
    let estado = n.salvar_estado().map(|e| e.len()).unwrap_or(0);
    eprintln!(
        "120 quadros: {ms:.1} ms por quadro, {novos} imagens, quadro {}x{}, estado {} MB",
        n.quadro().largura,
        n.quadro().altura,
        estado >> 20
    );
}

/// Um jogo de verdade da máquina (fora do CI): `KOF_JOGO_WII=<arquivo> cargo test --release -p kof-nativo --test
/// dolphin -- --ignored --nocapture`. O nome do jogo não aparece em nada que este teste imprime.
#[test]
#[ignore]
fn dolphin_roda_um_jogo_de_verdade() {
    let Some(jogo) = std::env::var_os("KOF_JOGO_WII").map(PathBuf::from) else {
        eprintln!("aviso: sem KOF_JOGO_WII");
        return;
    };
    let dir = tempfile::tempdir().unwrap();
    let Some(mut n) = abrir(jogo, dir.path()) else { return };
    for i in 0..6 {
        let (ms, novos) = rodar(&mut n, 300);
        eprintln!(
            "trecho {i}: {ms:.1} ms por quadro, {novos} imagens novas em 300, quadro {}x{}",
            n.quadro().largura,
            n.quadro().altura
        );
    }
    let estado = n.salvar_estado().map(|e| e.len()).unwrap_or(0);
    eprintln!("estado {} MB", estado >> 20);
}
