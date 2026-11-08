//! CD de PS1 zipado: a página lê só o .cue/a cabeça (`ler_entrada`) e o núcleo nativo abre o CD extraído no cache
//! (`extrair_cd`). Os zips são montados aqui (guardado e deflate), sem jogo de ninguém.
use kof_files::zip::{extrair_cd, itens, ler_entrada};
use std::io::Write;

/// Zip com várias entradas; `deflate` = comprime com o método 8 (o dos zips de verdade).
fn zip_de(entradas: &[(&str, &[u8])], deflate: bool) -> Vec<u8> {
    let mut z = Vec::new();
    let mut dir = Vec::new();
    for (nome, dados) in entradas {
        let crc = crc32fast::hash(dados);
        let corpo = if deflate {
            let mut e = flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
            e.write_all(dados).unwrap();
            e.finish().unwrap()
        } else {
            dados.to_vec()
        };
        let metodo: u16 = if deflate { 8 } else { 0 };
        let local = z.len() as u32;
        let n = nome.as_bytes();
        z.extend(0x0403_4b50u32.to_le_bytes());
        z.extend([20, 0, 0, 0]);
        z.extend(metodo.to_le_bytes());
        z.extend([0, 0, 0, 0]);
        z.extend(crc.to_le_bytes());
        z.extend((corpo.len() as u32).to_le_bytes());
        z.extend((dados.len() as u32).to_le_bytes());
        z.extend((n.len() as u16).to_le_bytes());
        z.extend([0, 0]);
        z.extend(n);
        z.extend(&corpo);
        dir.extend(0x0201_4b50u32.to_le_bytes());
        dir.extend([20, 0, 20, 0, 0, 0]);
        dir.extend(metodo.to_le_bytes());
        dir.extend([0, 0, 0, 0]);
        dir.extend(crc.to_le_bytes());
        dir.extend((corpo.len() as u32).to_le_bytes());
        dir.extend((dados.len() as u32).to_le_bytes());
        dir.extend((n.len() as u16).to_le_bytes());
        dir.extend([0u8; 12]);
        dir.extend(local.to_le_bytes());
        dir.extend(n);
    }
    let ofs = z.len() as u32;
    z.extend(&dir);
    let total = entradas.len() as u16;
    z.extend(0x0605_4b50u32.to_le_bytes());
    z.extend([0, 0, 0, 0]);
    z.extend(total.to_le_bytes());
    z.extend(total.to_le_bytes());
    z.extend((dir.len() as u32).to_le_bytes());
    z.extend(ofs.to_le_bytes());
    z.extend([0, 0]);
    z
}

fn imagem(n: usize) -> Vec<u8> {
    (0..n).map(|i| (i * 7 + i / 2352) as u8).collect()
}

const CUE: &[u8] = b"FILE \"Jogo (Disc 1).bin\" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n";

#[test]
fn le_o_cue_e_a_cabeca_sem_descompactar_tudo() {
    for deflate in [false, true] {
        let d = tempfile::tempdir().unwrap();
        let bin = imagem(3 << 20);
        let z = d.path().join("Jogo.zip");
        std::fs::write(
            &z,
            zip_de(&[("Jogo (Disc 1).bin", &bin), ("Jogo (Disc 1).cue", CUE)], deflate),
        )
        .unwrap();
        assert_eq!(ler_entrada(&z, "Jogo (Disc 1).cue", None).unwrap(), CUE);
        assert_eq!(
            ler_entrada(&z, "jogo (disc 1).CUE", None).unwrap(),
            CUE,
            "nome sem caixa"
        );
        assert_eq!(
            ler_entrada(&z, "Jogo (Disc 1).bin", Some(65536)).unwrap(),
            &bin[..65536],
            "só a cabeça"
        );
        let e = ler_entrada(&z, "outro.bin", None).unwrap_err();
        assert_eq!(e.codigo(), "NOT_FOUND");
        let mut f = std::fs::File::open(&z).unwrap();
        let tam = f.metadata().unwrap().len();
        assert_eq!(itens(&mut f, tam).len(), 2, "o diretório continua igual pra varredura");
    }
}

#[test]
fn extrai_o_cd_no_cache_e_reaproveita() {
    let d = tempfile::tempdir().unwrap();
    let cache = d.path().join("cache");
    let bin = imagem(2 << 20);
    let z = d.path().join("Jogo.zip");
    std::fs::write(
        &z,
        zip_de(
            &[
                ("pasta/Jogo (Disc 1).bin", &bin),
                ("Jogo (Disc 1).cue", CUE),
                ("leia.txt", b"x"),
            ],
            true,
        ),
    )
    .unwrap();
    let p = extrair_cd(&z, &cache).unwrap();
    assert_eq!(p.file_name().unwrap(), "Jogo (Disc 1).cue", "o principal é o .cue");
    let pasta = p.parent().unwrap();
    assert_eq!(
        std::fs::read(pasta.join("Jogo (Disc 1).bin")).unwrap(),
        bin,
        "o .bin do lado, inteiro"
    );
    assert!(!pasta.join("leia.txt").exists(), "só os arquivos do CD");
    // de novo: não extrai outra vez (a data do .bin não muda)
    let antes = std::fs::metadata(pasta.join("Jogo (Disc 1).bin"))
        .unwrap()
        .modified()
        .unwrap();
    assert_eq!(extrair_cd(&z, &cache).unwrap(), p);
    assert_eq!(
        std::fs::metadata(pasta.join("Jogo (Disc 1).bin"))
            .unwrap()
            .modified()
            .unwrap(),
        antes
    );
    // outro CD: o primeiro sai do cache (um por vez)
    let z2 = d.path().join("Outro.zip");
    std::fs::write(&z2, zip_de(&[("Outro.iso", &imagem(100_000))], false)).unwrap();
    let p2 = extrair_cd(&z2, &cache).unwrap();
    assert_eq!(p2.file_name().unwrap(), "Outro.iso", "imagem única sem .cue");
    assert!(!pasta.exists(), "o CD anterior saiu do cache");
    assert_eq!(std::fs::read_dir(&cache).unwrap().count(), 1);
}

#[test]
fn zip_estragado_da_erro_com_codigo() {
    let d = tempfile::tempdir().unwrap();
    let cache = d.path().join("cache");
    let z = d.path().join("ruim.zip");
    let mut b = zip_de(&[("Jogo.bin", &imagem(50_000))], false);
    b[40] ^= 0xFF; // um byte do .bin muda: o CRC não bate
    std::fs::write(&z, &b).unwrap();
    assert_eq!(extrair_cd(&z, &cache).unwrap_err().codigo(), "BAD_ZIP");
    let z2 = d.path().join("sem-cd.zip");
    std::fs::write(&z2, zip_de(&[("leia.txt", b"oi")], false)).unwrap();
    assert_eq!(extrair_cd(&z2, &cache).unwrap_err().codigo(), "BAD_ZIP");
}
