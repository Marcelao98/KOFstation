//! PCSX-ReARMed nativo (com dynarec) pelo nosso frontend: um PS-X EXE montado aqui mesmo (MIPS escrito à mão, sem ROM
//! nem BIOS de ninguém) liga a GPU e pinta a tela de vermelho com um retângulo verde; os pixels são conferidos.
//! O núcleo vem do `pnpm nucleos` (third_party/cores/nativos/) ou de `KOF_PCSX=<arquivo>`; sem ele, o teste avisa e passa.
use kof_nativo::nucleo::{Abertura, Nucleo};
use std::path::PathBuf;

fn nucleo_pcsx() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("KOF_PCSX") {
        return Some(PathBuf::from(p));
    }
    let nome = if cfg!(windows) {
        "pcsx_rearmed_libretro.dll"
    } else {
        "pcsx_rearmed_libretro.so"
    };
    let p = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/cores/nativos")
        .join(kof_nativo::plataforma())
        .join(nome);
    p.is_file().then_some(p)
}

/// Monta um PS-X EXE: escreve na GPU (GP1 = controle, GP0 = desenho) e fica parado num laço.
pub fn psx_exe_que_desenha() -> Vec<u8> {
    const T0: u32 = 8;
    const T1: u32 = 9;
    let lui = |rt: u32, imm: u32| 0x3C00_0000 | (rt << 16) | (imm & 0xFFFF);
    let ori = |rt: u32, rs: u32, imm: u32| 0x3400_0000 | (rs << 21) | (rt << 16) | (imm & 0xFFFF);
    let sw = |rt: u32, base: u32, off: u32| 0xAC00_0000 | (base << 21) | (rt << 16) | (off & 0xFFFF);
    let mut code = vec![lui(T0, 0x1F80), ori(T0, T0, 0x1810)];
    let mut escrever = |gp1: bool, v: u32| {
        code.push(lui(T1, v >> 16));
        code.push(ori(T1, T1, v & 0xFFFF));
        code.push(sw(T1, T0, if gp1 { 4 } else { 0 }));
    };
    for v in [
        0x0000_0000u32, // reset
        0x0300_0000,    // liga a imagem
        0x0800_0001,    // 320x240, NTSC, 15 bits
        0x06C6_0260,    // faixa horizontal padrão
        0x0704_0010,    // faixa vertical padrão (NTSC)
        0x0500_0000,    // começa em (0,0) da VRAM
    ] {
        escrever(true, v);
    }
    for v in [
        0xE100_0400u32, // pode desenhar na área mostrada
        0xE300_0000,    // área de desenho de (0,0)
        0xE403_BD3F,    // ... até (319,239)
        0xE500_0000,    // sem deslocamento
        0x0200_00FF,    // retângulo cheio vermelho
        0x0000_0000,    // em (0,0)
        0x00F0_0140,    // 320x240
        0x0200_FF00,    // retângulo cheio verde
        0x0010_0010,    // em (16,16)
        0x0020_0040,    // 64x32
    ] {
        escrever(false, v);
    }
    let base = 0x8001_0000u32;
    let aqui = base + code.len() as u32 * 4;
    code.push(0x2529_0001); // addiu t1, t1, 1 (o laço faz alguma coisa)
    code.push(0x0800_0000 | ((aqui >> 2) & 0x03FF_FFFF)); // j aqui
    code.push(0); // nop
    let mut corpo: Vec<u8> = code.iter().flat_map(|w| w.to_le_bytes()).collect();
    corpo.resize(corpo.len().div_ceil(2048) * 2048, 0);
    let mut exe = vec![0u8; 2048];
    exe[..8].copy_from_slice(b"PS-X EXE");
    exe[0x10..0x14].copy_from_slice(&base.to_le_bytes()); // pc inicial
    exe[0x18..0x1C].copy_from_slice(&base.to_le_bytes()); // onde carregar
    exe[0x1C..0x20].copy_from_slice(&(corpo.len() as u32).to_le_bytes());
    exe[0x30..0x34].copy_from_slice(&0x801F_FFF0u32.to_le_bytes()); // pilha
    let regiao = b"Sony Computer Entertainment Inc. for North America area";
    exe[0x4C..0x4C + regiao.len()].copy_from_slice(regiao);
    exe.extend_from_slice(&corpo);
    exe
}

#[test]
fn pcsx_nativo_desenha_o_exe() {
    let Some(lib) = nucleo_pcsx() else {
        eprintln!("aviso: sem o PCSX nativo (rode `pnpm nucleos` ou defina KOF_PCSX): teste pulado");
        return;
    };
    let dir = tempfile::tempdir().unwrap();
    let exe = dir.path().join("desenha.exe");
    std::fs::write(&exe, psx_exe_que_desenha()).unwrap();
    let a = Abertura {
        nucleo: lib,
        jogo: Some(exe),
        sistema: dir.path().into(),
        saves: dir.path().into(),
        variaveis: Default::default(),
        dispositivo: None,
    };
    let mut n = Nucleo::carregar(&a).expect("o PCSX abriu o EXE");
    assert!(n.info.nome.contains("PCSX"), "{}", n.info.nome);
    let mut som = Vec::new();
    for _ in 0..120 {
        n.rodar(&mut som);
    }
    assert!(!som.is_empty(), "o PCSX entrega som (silêncio) a cada quadro");
    let q = n.quadro();
    assert!(q.largura >= 320 && q.altura >= 240, "{}x{}", q.largura, q.altura);
    let px = |x: u32, y: u32| {
        let i = ((y * q.largura + x) * 4) as usize;
        [q.rgba[i], q.rgba[i + 1], q.rgba[i + 2]]
    };
    assert_eq!(px(4, 4), [255, 0, 0], "fundo vermelho");
    assert_eq!(px(300, 200), [255, 0, 0], "fundo vermelho");
    // o PCSX entrega RGB565: o verde de 5 bits (31) vira 62 de 6 bits = 251 (a mesma conta do ponte.cpp do wasm)
    assert_eq!(px(20, 20), [0, 251, 0], "retângulo verde");
    assert_eq!(px(79, 47), [0, 251, 0], "canto do retângulo");
    assert_eq!(px(80, 48), [255, 0, 0], "fora do retângulo");

    // estado: salva, anda, volta (o mesmo caminho que a página usa), várias vezes seguidas
    let e = n.salvar_estado().expect("estado");
    assert!(e.len() > 1 << 20, "estado do PS1 tem alguns MB ({})", e.len());
    for _ in 0..3 {
        for _ in 0..10 {
            n.rodar(&mut som);
        }
        n.carregar_estado(&e).expect("carregou o estado");
        n.rodar(&mut som);
        let q2 = n.quadro();
        assert_eq!(q2.rgba, q.rgba, "a mesma imagem depois de carregar o estado");
    }
    rebobina(&mut n);
}

/// Fase R.3: o rebobinar dentro do processo. Grava fotos a cada 2 quadros, volta 10 e confere que cada foto voltou
/// exatamente o estado gravado e que, carregado, o jogo anda igual (2 quadros depois = a foto seguinte).
/// (Um núcleo por processo: roda no fim do teste de cima, com o mesmo núcleo aberto.)
fn rebobina(n: &mut Nucleo) {
    use kof_nativo::rebobinar::{ModoDoSom, Voltar};
    use std::time::{Duration, Instant};
    let mut som = Vec::new();
    for _ in 0..30 {
        som.clear();
        n.rodar(&mut som);
    }
    let mut rb = Voltar::new(n.av.timing.sample_rate, 96 << 20);
    rb.configurar(true, 5, 6, ModoDoSom::Fita);
    let mut fotos = Vec::new();
    let (mut t_quadros, mut t_salvar, mut t_gravar) = (Duration::ZERO, Duration::ZERO, Duration::ZERO);
    for _ in 0..120 {
        som.clear();
        let t = Instant::now();
        n.rodar(&mut som);
        t_quadros += t.elapsed();
        rb.som.saiu(&mut som, true);
        if rb.hora_da_foto(1) {
            let t = Instant::now();
            n.salvar_estado_em(&mut rb.buf).expect("estado");
            t_salvar += t.elapsed();
            fotos.push(rb.buf.clone());
            let t = Instant::now();
            rb.gravar();
            t_gravar += t.elapsed();
        }
    }
    eprintln!(
        "120 quadros: núcleo {:?}/quadro; por foto: salvar {:?}, comparar e guardar {:?}; {} fotos, {} KB guardados, estado de {} KB",
        t_quadros / 120,
        t_salvar / 60,
        t_gravar / 60,
        rb.r.as_ref().unwrap().quantas(),
        rb.r.as_ref().unwrap().ocupado() / 1024,
        fotos[0].len() / 1024
    );
    assert_eq!(fotos.len(), 60);
    assert_eq!(rb.r.as_ref().unwrap().quantas(), 59, "a 1ª foto vira só a cabeça");
    let q_antes = n.quadro();
    for k in 0..10 {
        let e = rb.voltar().expect("ainda tem foto").to_vec();
        assert!(e == fotos[fotos.len() - 2 - k], "a foto {k} voltou o estado gravado");
        n.voltar_estado(&e).expect("carregou");
        som.clear();
        n.rodar(&mut som);
    }
    assert_eq!(n.quadro().rgba, q_antes.rgba, "a imagem depois de voltar");
    // carregado, anda igual: a foto i + 2 quadros = a foto i+1
    let i = fotos.len() - 12;
    n.voltar_estado(&fotos[i]).unwrap();
    for _ in 0..2 {
        som.clear();
        n.rodar(&mut som);
    }
    let mut depois = Vec::new();
    n.salvar_estado_em(&mut depois).unwrap();
    let diferentes = depois.iter().zip(&fotos[i + 1]).filter(|(x, y)| x != y).count();
    assert_eq!(
        diferentes, 0,
        "2 quadros depois de voltar, o estado é o da foto seguinte"
    );
}
