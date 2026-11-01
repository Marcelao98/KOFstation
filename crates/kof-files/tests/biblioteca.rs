use kof_files::{biblioteca, escopo, raiz};
use std::collections::HashSet;
use std::io::Write;

fn zip_com(nome: &str, dados: &[u8]) -> Vec<u8> {
    // zip "guardado" (método 0) com uma entrada, montado à mão
    let crc = crc32fast::hash(dados);
    let mut z = Vec::new();
    let n = nome.as_bytes();
    z.extend(0x0403_4b50u32.to_le_bytes());
    z.extend([20, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    z.extend(crc.to_le_bytes());
    z.extend((dados.len() as u32).to_le_bytes());
    z.extend((dados.len() as u32).to_le_bytes());
    z.extend((n.len() as u16).to_le_bytes());
    z.extend([0, 0]);
    z.extend(n);
    z.extend(dados);
    let dir = z.len() as u32;
    z.extend(0x0201_4b50u32.to_le_bytes());
    z.extend([20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    z.extend(crc.to_le_bytes());
    z.extend((dados.len() as u32).to_le_bytes());
    z.extend((dados.len() as u32).to_le_bytes());
    z.extend((n.len() as u16).to_le_bytes());
    z.extend([0u8; 12]);
    z.extend(0u32.to_le_bytes());
    z.extend(n);
    let tam_dir = z.len() as u32 - dir;
    z.extend(0x0605_4b50u32.to_le_bytes());
    z.extend([0, 0, 0, 0, 1, 0, 1, 0]);
    z.extend(tam_dir.to_le_bytes());
    z.extend(dir.to_le_bytes());
    z.extend([0, 0]);
    z
}

#[test]
fn escopo_recusa_sair_da_pasta() {
    let d = tempfile::tempdir().unwrap();
    for ruim in ["../x", "/etc/passwd", "a/../../b"] {
        let e = escopo::resolver(d.path(), ruim).unwrap_err();
        assert_eq!(e.codigo(), "PATH_OUTSIDE_SCOPE", "{ruim}");
    }
    assert!(escopo::resolver(d.path(), "Games/snes/x.sfc").is_ok());
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink("/etc", d.path().join("fuga")).unwrap();
        assert_eq!(
            escopo::resolver(d.path(), "fuga/passwd").unwrap_err().codigo(),
            "PATH_OUTSIDE_SCOPE"
        );
    }
}

#[test]
fn raiz_cria_a_arvore_e_recusa_pasta_de_dentro() {
    let dados = tempfile::tempdir().unwrap();
    let casa = tempfile::tempdir().unwrap();
    let kg = casa.path().join("Kof Games");
    assert_eq!(
        raiz::escolher(dados.path(), &casa.path().join("Games").display().to_string())
            .unwrap_err()
            .codigo(),
        "INNER_FOLDER"
    );
    raiz::escolher(dados.path(), &kg.display().to_string()).unwrap();
    assert!(kg.join("Games/psx").is_dir() && kg.join("Config/bios").is_dir() && kg.join("Novos").is_dir());
    let i = raiz::info(dados.path(), None, Some(casa.path()));
    assert!(i.ok && i.missing.is_empty());
    assert_eq!(i.path.as_deref(), Some(kg.display().to_string().as_str()));
    // executável instalado em Kof Games/KOFstation: a raiz vem sozinha
    assert_eq!(raiz::pela_posicao(&kg.join("KOFstation/kofstation")), Some(kg.clone()));
    assert_eq!(raiz::pela_posicao(&casa.path().join("bin/kofstation")), None);
}

#[test]
fn varre_com_fatos_e_crc_no_intro() {
    let dados = tempfile::tempdir().unwrap();
    let d = tempfile::tempdir().unwrap();
    raiz::garantir_arvore(d.path()).unwrap();
    let g = d.path().join("Games");
    // SNES com cabeçalho de 512: o CRC é só do resto
    let mut rom = vec![0xAAu8; 512];
    rom.extend(vec![7u8; 1024]);
    std::fs::write(g.join("snes/Jogo.sfc"), &rom).unwrap();
    std::fs::write(g.join("snes/leia.txt"), b"x").unwrap();
    std::fs::create_dir_all(g.join("psx/Jogo CD")).unwrap();
    let mut cd = vec![0u8; 0x9100];
    cd[1..11].fill(0xFF);
    std::fs::write(g.join("psx/Jogo CD/Jogo.bin"), &cd).unwrap();
    std::fs::File::create(g.join("Mario.zip"))
        .unwrap()
        .write_all(&zip_com("pasta/Mario.nes", b"NES\x1a1234"))
        .unwrap();
    let exts: HashSet<String> = ["sfc", "bin", "zip", "nes"].iter().map(|s| s.to_string()).collect();
    let l = biblioteca::varrer(d.path(), &exts).unwrap();
    let caminhos: Vec<_> = l.iter().map(|a| a.path.as_str()).collect();
    assert_eq!(
        caminhos,
        ["Games/Mario.zip", "Games/psx/Jogo CD/Jogo.bin", "Games/snes/Jogo.sfc"]
    );
    let z = l[0].zip.as_ref().unwrap();
    assert_eq!(z[0].nome, "Mario.nes");
    assert_eq!(z[0].crc, format!("{:08x}", crc32fast::hash(b"NES\x1a1234")));
    assert_eq!(l[1].cd, Some(Some("ps1")));
    let pedidos = vec![biblioteca::PedidoCrc {
        path: "Games/snes/Jogo.sfc".into(),
        sistema: "snes".into(),
    }];
    let c = biblioteca::crcs(dados.path(), d.path(), &pedidos).unwrap();
    assert_eq!(
        c["Games/snes/Jogo.sfc"],
        format!("{:08x}", crc32fast::hash(&rom[512..]))
    );
    assert!(dados.path().join("cache/crc.json").is_file(), "cache gravado");
    let c2 = biblioteca::crcs(dados.path(), d.path(), &pedidos).unwrap();
    assert_eq!(c, c2);
}
