//! Confere o catálogo de opções de emulação (`packages/domain/src/opcoes-nucleo.ts`, via a fixture
//! `packages/contracts/fixtures/opcoes-nucleo.json`) contra o que os núcleos nativos de verdade declaram no
//! `SET_VARIABLES`: cada chave existe, cada valor (e o padrão) existe, e o padrão bate com o primeiro valor do núcleo.
//! O PS1 (PCSX-ReARMed) e o PS2 (LRPS2) declaram tudo logo na abertura do jogo, então abrimos um jogo mínimo gerado
//! aqui (PS-X EXE de um laço; no PS2, BIOS falsa e ISO por genisoimage). Sem o `.so` (`pnpm nucleos`) o teste avisa e
//! passa. Os dois núcleos ficam num teste só: o contexto do frontend é global, um núcleo por vez.
use kof_nativo::nucleo::{Abertura, Nucleo, OpcaoDeclarada};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

fn lib(n: &str) -> Option<PathBuf> {
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/cores/nativos/linux-x64")
        .join(n);
    p.is_file().then_some(p)
}

fn psx_exe() -> Vec<u8> {
    let base = 0x8001_0000u32;
    let corpo: Vec<u8> = [0x0800_0000 | ((base >> 2) & 0x03FF_FFFF), 0u32]
        .iter()
        .flat_map(|w| w.to_le_bytes())
        .collect();
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
    let entradas: [(&str, u16, u32); 4] = [
        ("RESET", 0, 0x2700),
        ("ROMDIR", 0, 0x50),
        ("EXTINFO", 0, 0x10),
        ("ROMVER", 0, 0x10),
    ];
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

#[derive(serde::Deserialize)]
struct Do {
    chave: String,
    padrao: String,
    #[serde(rename = "naHora")]
    na_hora: bool,
    valores: Vec<String>,
    perfis: BTreeMap<String, String>,
}

fn catalogo() -> BTreeMap<String, Vec<Do>> {
    let p = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/contracts/fixtures/opcoes-nucleo.json");
    let t = std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("sem a fixture {}: {e}", p.display()));
    serde_json::from_str(&t).expect("fixture do catálogo inválida")
}

/// Compara o catálogo de um sistema com o que o núcleo declarou; devolve os problemas encontrados.
fn conferir(sistema: &str, catalogo: &[Do], declaradas: &[OpcaoDeclarada]) -> Vec<String> {
    let mut erros = vec![];
    for o in catalogo {
        let Some(d) = declaradas.iter().find(|d| d.chave == o.chave) else {
            erros.push(format!("{sistema}: o núcleo não declara a chave {}", o.chave));
            continue;
        };
        if d.valores.first() != Some(&o.padrao) {
            erros.push(format!(
                "{sistema}/{}: padrão do catálogo '{}' ≠ padrão do núcleo {:?}",
                o.chave,
                o.padrao,
                d.valores.first()
            ));
        }
        for v in &o.valores {
            if !d.valores.contains(v) {
                erros.push(format!(
                    "{sistema}/{}: o núcleo não aceita o valor '{v}' (aceita {:?})",
                    o.chave, d.valores
                ));
            }
        }
        for (perfil, v) in &o.perfis {
            if !d.valores.contains(v) {
                erros.push(format!(
                    "{sistema}/{}: perfil {perfil} usa '{v}', que o núcleo não aceita",
                    o.chave
                ));
            }
        }
        // o núcleo avisa na própria descrição quando a opção só vale ao reabrir o jogo
        if o.na_hora && d.descricao.contains("(Restart)") {
            erros.push(format!(
                "{sistema}/{}: o catálogo diz que vale na hora, mas o núcleo diz '{}'",
                o.chave, d.descricao
            ));
        }
        if !o.na_hora && !d.descricao.contains("(Restart)") && sistema == "ps2" {
            eprintln!(
                "nota: {sistema}/{} marcada como 'não vale na hora' sem '(Restart)' no núcleo",
                o.chave
            );
        }
    }
    erros
}

#[test]
fn catalogo_bate_com_o_que_os_nucleos_declaram() {
    let cat = catalogo();
    let d = tempfile::tempdir().unwrap();
    let mut jobs: Vec<(&str, Abertura)> = vec![];
    if let Some(l) = lib("pcsx_rearmed_libretro.so") {
        let exe = d.path().join("a.exe");
        std::fs::write(&exe, psx_exe()).unwrap();
        jobs.push((
            "ps1",
            Abertura {
                nucleo: l,
                jogo: Some(exe),
                sistema: d.path().into(),
                saves: d.path().into(),
                ..Default::default()
            },
        ));
    } else {
        eprintln!("aviso: sem o PCSX-ReARMed nativo (rode o pnpm nucleos); PS1 não conferido");
    }
    match (lib("pcsx2_libretro.so"), dvd(d.path())) {
        (Some(l), Some(iso)) => {
            let s = d.path().join("sistema");
            std::fs::create_dir_all(s.join("pcsx2/bios")).unwrap();
            std::fs::write(s.join("pcsx2/bios/falsa.bin"), bios_falsa()).unwrap();
            jobs.push((
                "ps2",
                Abertura {
                    nucleo: l,
                    jogo: Some(iso),
                    sistema: s,
                    saves: d.path().join("saves"),
                    variaveis: BTreeMap::from([
                        ("pcsx2_bios".into(), "falsa.bin".into()),
                        ("pcsx2_renderer".into(), "OpenGL".into()),
                    ]),
                    dispositivo: None,
                },
            ));
        }
        _ => eprintln!("aviso: sem o LRPS2 ou sem o genisoimage; PS2 não conferido"),
    }
    let mut erros = vec![];
    for (sistema, a) in jobs {
        let n = match Nucleo::carregar(&a) {
            Ok(n) => n,
            Err(e) if std::env::var("KOF_EXIGIR_GL").unwrap_or_default().is_empty() => {
                eprintln!("aviso: o núcleo de {sistema} não abriu aqui ({e}); não conferido");
                continue;
            }
            Err(e) => panic!("o núcleo de {sistema} não abriu: {e}"),
        };
        let declaradas = n.opcoes_declaradas();
        assert!(!declaradas.is_empty(), "{sistema}: o núcleo não declarou nenhuma opção");
        eprintln!(
            "{sistema}: o núcleo declara {} opções; o catálogo tem {}",
            declaradas.len(),
            cat[sistema].len()
        );
        erros.extend(conferir(sistema, &cat[sistema], &declaradas));
        drop(n);
    }
    assert!(
        erros.is_empty(),
        "o catálogo não bate com os núcleos:\n{}",
        erros.join("\n")
    );
}

#[test]
fn analisa_o_texto_do_set_variables() {
    let o = kof_nativo::nucleo::analisar_opcao("k", "Vídeo > Coisa; b|a|c");
    assert_eq!(o.descricao, "Vídeo > Coisa");
    assert_eq!(o.valores, ["b", "a", "c"]);
}
