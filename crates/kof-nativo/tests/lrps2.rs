//! O LRPS2 (o PCSX2 do libretro, `third_party/cores/nativos`) no frontend novo com OpenGL sem janela: abre, aceita a
//! BIOS e o DVD e roda quadros. Sem BIOS de verdade (não pode entrar em teste): uma falsa só com a tabela ROMDIR, que o
//! PCSX2 aceita; o código dela é zero (o PS2 fica parado, mas o caminho todo — núcleo, OpenGL, DVD, quadros — roda).
//! Precisa do `pnpm nucleos` (sem o núcleo, o teste avisa e passa).
mod comum;

use kof_nativo::nucleo::{Abertura, Nucleo};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

fn nucleo() -> Option<PathBuf> {
    let plat = if cfg!(windows) {
        "windows-x64/pcsx2_libretro.dll"
    } else {
        "linux-x64/pcsx2_libretro.so"
    };
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/cores/nativos")
        .join(plat);
    p.is_file().then_some(p)
}

/// BIOS falsa: 4 MB com a tabela ROMDIR (RESET, ROMDIR, EXTINFO, ROMVER) que o PCSX2 procura.
pub fn bios_falsa() -> Vec<u8> {
    let mut b = vec![0u8; 4 << 20];
    let tabela = 0x2700usize;
    let entradas: [(&str, u16, u32); 4] = [
        ("RESET", 0, 0x2700),
        ("ROMDIR", 0, 0x50),
        ("EXTINFO", 0, 0x10),
        ("ROMVER", 0, 0x10),
    ];
    for (i, (nome, ext, tam)) in entradas.iter().enumerate() {
        let o = tabela + i * 16;
        b[o..o + nome.len()].copy_from_slice(nome.as_bytes());
        b[o + 10..o + 12].copy_from_slice(&ext.to_le_bytes());
        b[o + 12..o + 16].copy_from_slice(&tam.to_le_bytes());
    }
    // no vetor de reset (0xBFC00000, onde as duas CPUs começam): `j 0xBFC00000` + nop, um laço parado (sem isso o
    // código zerado anda até cair, como no RetroArch com BIOS falsa)
    b[0..4].copy_from_slice(&0x0BF0_0000u32.to_le_bytes());
    // os dados: RESET em 0, ROMDIR em 0x2700, EXTINFO em 0x2750, ROMVER em 0x2760 ("0160EC20020207" = v1.60 EUA)
    b[0x2760..0x2760 + 14].copy_from_slice(b"0160EC20020207");
    b
}

/// DVD mínimo: ISO 9660 com o SYSTEM.CNF de PS2 (BOOT2) apontando pra um ELF vazio (precisa do genisoimage).
fn dvd(pasta: &Path) -> Option<PathBuf> {
    let d = pasta.join("dvd");
    std::fs::create_dir_all(&d).ok()?;
    std::fs::write(
        d.join("SYSTEM.CNF"),
        "BOOT2 = cdrom0:\\SLUS_000.00;1\r\nVER = 1.00\r\nVMODE = NTSC\r\n",
    )
    .ok()?;
    std::fs::write(d.join("SLUS_000.00"), [0x7f, b'E', b'L', b'F']).ok()?;
    let iso = pasta.join("jogo.iso");
    let ok = std::process::Command::new("genisoimage")
        .args(["-quiet", "-V", "KOFPS2", "-o"])
        .arg(&iso)
        .arg(&d)
        .status()
        .is_ok_and(|s| s.success());
    ok.then_some(iso)
}

#[test]
fn lrps2_abre_com_opengl_bios_e_dvd() {
    let Some(lib) = nucleo() else {
        eprintln!("aviso: sem o LRPS2 (rode o pnpm nucleos)");
        return;
    };
    let dir = tempfile::tempdir().unwrap();
    let Some(iso) = dvd(dir.path()) else {
        eprintln!("aviso: sem o genisoimage");
        return;
    };
    let sistema = dir.path().join("sistema");
    std::fs::create_dir_all(sistema.join("pcsx2/bios")).unwrap();
    std::fs::write(sistema.join("pcsx2/bios/falsa.bin"), bios_falsa()).unwrap();
    let a = Abertura {
        nucleo: lib,
        jogo: Some(iso),
        sistema: sistema.clone(),
        saves: dir.path().join("saves"),
        variaveis: BTreeMap::from([
            ("pcsx2_bios".into(), "falsa.bin".into()),
            ("pcsx2_renderer".into(), "OpenGL".into()),
        ]),
        dispositivo: None,
    };
    let mut n = match Nucleo::carregar(&a) {
        Ok(n) => n,
        Err(e) if std::env::var("KOF_EXIGIR_GL").unwrap_or_default().is_empty() => {
            eprintln!("aviso: o LRPS2 não abriu aqui ({e})");
            return;
        }
        Err(e) => panic!("o LRPS2 não abriu: {e}"),
    };
    eprintln!("{} {} · {:?}", n.info.nome, n.info.versao, n.av.geometry);
    assert!(n.pediu_gpu(), "o LRPS2 desenha pela placa");
    let mut som = Vec::new();
    let inicio = std::time::Instant::now();
    let mut novos = 0;
    for _ in 0..60 {
        if n.rodar(&mut som) {
            novos += 1;
        }
    }
    eprintln!(
        "60 quadros: {:.1} ms por quadro, {novos} imagens, {} amostras de som, quadro {}x{}",
        inicio.elapsed().as_secs_f64() * 1000.0 / 60.0,
        som.len() / 2,
        n.quadro().largura,
        n.quadro().altura
    );
}
