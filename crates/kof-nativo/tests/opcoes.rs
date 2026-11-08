use kof_nativo::nucleo::{Abertura, Nucleo};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

fn lib(n: &str) -> Option<PathBuf> {
    let p = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../third_party/cores/nativos/linux-x64").join(n);
    p.is_file().then_some(p)
}

fn psx_exe() -> Vec<u8> {
    let base = 0x8001_0000u32;
    let corpo: Vec<u8> = [0x0800_0000 | ((base >> 2) & 0x03FF_FFFF), 0u32].iter().flat_map(|w| w.to_le_bytes()).collect();
    let mut corpo = corpo;
    corpo.resize(2048, 0);
    let mut exe = vec![0u8; 2048];
    exe[..8].copy_from_slice(b"PS-X EXE");
    exe[0x10..0x14].copy_from_slice(&base.to_le_bytes());
    exe[0x18..0x1C].copy_from_slice(&base.to_le_bytes());
    exe[0x1C..0x20].copy_from_slice(&(corpo.len() as u32).to_le_bytes());
    exe[0x30..0x34].copy_from_slice(&0x801F_FFF0u32.to_le_bytes());
    let regiao = b"Sony Computer Entertainment Inc. for North America area";
    exe[0x4C..0x4C + regiao.len()].copy_from_slice(regiao);
    exe.extend_from_slice(&corpo);
    exe
}

fn bios_falsa() -> Vec<u8> {
    let mut b = vec![0u8; 4 << 20];
    let entradas: [(&str, u16, u32); 4] = [("RESET", 0, 0x2700), ("ROMDIR", 0, 0x50), ("EXTINFO", 0, 0x10), ("ROMVER", 0, 0x10)];
    for (i, (nome, ext, tam)) in entradas.iter().enumerate() {
        let o = 0x2700 + i * 16;
        b[o..o + nome.len()].copy_from_slice(nome.as_bytes());
        b[o + 10..o + 12].copy_from_slice(&ext.to_le_bytes());
        b[o + 12..o + 16].copy_from_slice(&tam.to_le_bytes());
    }
    b[0..4].copy_from_slice(&0x0BF0_0000u32.to_le_bytes());
    b[0x2760..0x2760 + 14].copy_from_slice(b"0160EC20020207");
    b
}

fn dvd(pasta: &Path) -> Option<PathBuf> {
    let d = pasta.join("dvd");
    std::fs::create_dir_all(&d).ok()?;
    std::fs::write(d.join("SYSTEM.CNF"), "BOOT2 = cdrom0:\\SLUS_000.00;1\r\nVER = 1.00\r\nVMODE = NTSC\r\n").ok()?;
    std::fs::write(d.join("SLUS_000.00"), [0x7f, b'E', b'L', b'F']).ok()?;
    let iso = pasta.join("jogo.iso");
    let ok = std::process::Command::new("genisoimage")
        .args(["-quiet", "-V", "KOFPS2", "-o"]).arg(&iso).arg(&d)
        .status().is_ok_and(|s| s.success());
    ok.then_some(iso)
}

#[test]
fn dump() {
    let d = tempfile::tempdir().unwrap();
    let mut jobs: Vec<(&str, Abertura)> = vec![];
    if let Some(l) = lib("pcsx_rearmed_libretro.so") {
        let exe = d.path().join("a.exe");
        std::fs::write(&exe, psx_exe()).unwrap();
        jobs.push(("ps1", Abertura { nucleo: l, jogo: Some(exe), sistema: d.path().into(), saves: d.path().into(), ..Default::default() }));
    }
    if let (Some(l), Some(iso)) = (lib("pcsx2_libretro.so"), dvd(d.path())) {
        let s = d.path().join("sistema");
        std::fs::create_dir_all(s.join("pcsx2/bios")).unwrap();
        std::fs::write(s.join("pcsx2/bios/falsa.bin"), bios_falsa()).unwrap();
        jobs.push(("ps2", Abertura { nucleo: l, jogo: Some(iso), sistema: s, saves: d.path().join("saves"),
            variaveis: BTreeMap::from([("pcsx2_bios".into(), "falsa.bin".into()), ("pcsx2_renderer".into(), "OpenGL".into())]), dispositivo: None }));
    }
    for (f, a) in jobs {
        match Nucleo::carregar(&a) {
            Ok(n) => { let o = n.opcoes_declaradas(); eprintln!("{f}: {} opcoes", o.len());
                for x in o { eprintln!("OPC {f} {} | {} | {}", x.chave, x.descricao, x.valores.join(" / ")); } }
            Err(e) => eprintln!("{f}: erro {e}"),
        }
    }
}
