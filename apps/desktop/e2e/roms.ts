// ROMs geradas pelos próprios testes (nunca jogo de verdade).

/** Mega Drive que pinta o fundo de vermelho. */
export function romVermelha(): Buffer {
  const r = Buffer.alloc(0x400);
  r.writeUInt32BE(0xfffe00, 0);
  r.writeUInt32BE(0x200, 4);
  r.write('SEGA MEGA DRIVE ', 0x100);
  [
    0x33fc, 0x8004, 0x00c0, 0x0004, 0x33fc, 0x8144, 0x00c0, 0x0004, 0x33fc, 0x8700, 0x00c0, 0x0004, 0x23fc, 0xc000,
    0x0000, 0x00c0, 0x0004, 0x33fc, 0x000e, 0x00c0, 0x0000, 0x60fe,
  ].forEach((w, i) => r.writeUInt16BE(w, 0x200 + 2 * i));
  return r;
}

/** Game Boy com MBC1 + RAM + bateria que liga a RAM e grava `valor` em $A000 (o save do jogo). */
export function romGbComSave(valor = 0x42): Buffer {
  const r = Buffer.alloc(0x8000);
  r.set([0x00, 0xc3, 0x50, 0x01], 0x100); // nop; jp $0150
  r.write('KOFSAVE', 0x134, 'latin1');
  r[0x147] = 0x03; // MBC1 + RAM + bateria
  r[0x149] = 0x02; // 8 KB
  // ld a,$0A; ld ($0000),a (liga a RAM); ld a,valor; ld ($A000),a; jr para si mesmo
  r.set([0x3e, 0x0a, 0xea, 0x00, 0x00, 0x3e, valor, 0xea, 0x00, 0xa0, 0x18, 0xfe], 0x150);
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - (r[i] ?? 0) - 1) & 0xff;
  r[0x14d] = x;
  return r;
}

/** Game Boy com o canal 1 tocando uma quadrada sem parar (a música da jukebox nos testes). */
export function romGbSom(): Buffer {
  const r = Buffer.alloc(0x8000);
  r.set([0x00, 0xc3, 0x50, 0x01], 0x100); // nop; jp $0150
  r.write('KOFSOM', 0x134, 'latin1');
  // som ligado, volume cheio, canal 1 nos dois lados, ciclo 50%, envelope cheio, dispara em ~512 Hz sem tempo de
  // duração (toca pra sempre); jr para si mesmo
  r.set(
    [
      0x3e, 0x80, 0xe0, 0x26, 0x3e, 0x77, 0xe0, 0x24, 0x3e, 0x11, 0xe0, 0x25, 0x3e, 0x80, 0xe0, 0x11, 0x3e, 0xf0, 0xe0,
      0x12, 0x3e, 0x87, 0xe0, 0x14, 0x18, 0xfe,
    ],
    0x150,
  );
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - (r[i] ?? 0) - 1) & 0xff;
  r[0x14d] = x;
  return r;
}

/** PS-X EXE que desenha (o mesmo do tools/testar-nativo.mjs e do tests/pcsx.rs): GPU ligada, fundo vermelho 320x240 e um
 * retângulo verde em (16,16)-(79,47); depois fica num laço. Sem ROM nem BIOS de ninguém. */
export function exePs1(): Buffer {
  const T0 = 8;
  const T1 = 9;
  const lui = (rt: number, imm: number) => (0x3c000000 | (rt << 16) | (imm & 0xffff)) >>> 0;
  const ori = (rt: number, rs: number, imm: number) => (0x34000000 | (rs << 21) | (rt << 16) | (imm & 0xffff)) >>> 0;
  const sw = (rt: number, base: number, off: number) => (0xac000000 | (base << 21) | (rt << 16) | (off & 0xffff)) >>> 0;
  const code = [lui(T0, 0x1f80), ori(T0, T0, 0x1810)];
  const escrever = (gp1: boolean, v: number) =>
    code.push(lui(T1, v >>> 16), ori(T1, T1, v & 0xffff), sw(T1, T0, gp1 ? 4 : 0));
  for (const v of [0, 0x03000000, 0x08000001, 0x06c60260, 0x07040010, 0x05000000]) escrever(true, v);
  for (const v of [
    0xe1000400, 0xe3000000, 0xe403bd3f, 0xe5000000, 0x020000ff, 0, 0x00f00140, 0x0200ff00, 0x00100010, 0x00200040,
  ])
    escrever(false, v);
  const base = 0x80010000;
  const aqui = base + (code.length + 1) * 4;
  code.push(0x25290001, (0x08000000 | ((aqui >>> 2) & 0x03ffffff)) >>> 0, 0);
  const corpo = Buffer.alloc(Math.ceil((code.length * 4) / 2048) * 2048);
  code.forEach((w, i) => corpo.writeUInt32LE(w, i * 4));
  const cab = Buffer.alloc(2048);
  cab.write('PS-X EXE', 0, 'latin1');
  cab.writeUInt32LE(base, 0x10);
  cab.writeUInt32LE(base, 0x18);
  cab.writeUInt32LE(corpo.length, 0x1c);
  cab.writeUInt32LE(0x801ffff0, 0x30);
  cab.write('Sony Computer Entertainment Inc. for North America area', 0x4c, 'latin1');
  return Buffer.concat([cab, corpo]);
}

/** .spc feito aqui: o SPC700 parado num laço e a voz 0 soando uma onda quadrada (BRR) em laço. */
export function spcDeTeste(envx = 0x7f): Buffer {
  const u8 = Buffer.alloc(0x10200);
  const ass = 'SNES-SPC700 Sound File Data v0.30';
  for (let i = 0; i < ass.length; i++) u8[i] = ass.charCodeAt(i);
  u8[0x21] = 26;
  u8[0x22] = 26;
  u8[0x23] = 26;
  u8[0x24] = 30;
  u8.set([0x00, 0x02, 0, 0, 0, 0x02, 0xef], 0x25); // PC = $0200, PSW = Z, SP = $EF
  const tit = 'Quadrada';
  for (let i = 0; i < tit.length; i++) u8[0x2e + i] = tit.charCodeAt(i);
  '090'.split('').forEach((c, i) => (u8[0xa9 + i] = c.charCodeAt(0)));
  '05000'.split('').forEach((c, i) => (u8[0xac + i] = c.charCodeAt(0)));
  const ram = u8.subarray(0x100, 0x10100);
  ram.set([0x2f, 0xfe], 0x200); // BRA $
  ram.set([0x00, 0x04, 0x00, 0x04], 0x300); // diretório: amostra 0 começa e volta em $0400
  ram.set([0xc3, 0x77, 0x77, 0x77, 0x77, 0x88, 0x88, 0x88, 0x88], 0x400); // BRR: fim + laço
  const r = u8.subarray(0x10100, 0x10180);
  r.set([0x7f, 0x7f, 0x00, 0x10, 0x00], 0); // voz 0: volume, tom $1000, amostra 0
  r[0x05] = 0x00; // ADSR desligado
  r[0x07] = 0x7f; // GAIN direto
  r[0x08] = envx; // ENVX: estava soando?
  r[0x0c] = 0x7f;
  r[0x1c] = 0x7f; // volume geral
  r[0x5d] = 0x03; // diretório em $0300
  r[0x6c] = 0x20; // FLG: sem escrever eco
  return u8;
}

/**
 * ROM de N64 que boota de verdade (sem IPL3 de ninguém): o boot do Mupen64Plus copia ROM[0..0x1000] pra memória do RSP
 * e começa a executar em 0x40. No lugar do IPL3 vai um programa MIPS que monta uma lista de comandos do RDP na RDRAM
 * (fundo vermelho 320x240 e um retângulo verde em (16,16)-(79,47)), manda o RDP desenhar e liga o VI nessa imagem.
 */
export function romN64QueDesenha(): Buffer {
  const T0 = 8,
    T1 = 9,
    T2 = 10;
  const lui = (rt: number, imm: number) => (0x3c000000 | (rt << 16) | (imm & 0xffff)) >>> 0;
  const ori = (rt: number, rs: number, imm: number) => (0x34000000 | (rs << 21) | (rt << 16) | (imm & 0xffff)) >>> 0;
  const sw = (rt: number, base: number, off: number) => (0xac000000 | (base << 21) | (rt << 16) | (off & 0xffff)) >>> 0;
  const code: number[] = [];
  const li = (rt: number, v: number) => code.push(lui(rt, v >>> 16), ori(rt, rt, v & 0xffff));
  /** grava `v` em `base + off` (base num registrador já carregado) */
  const gravar = (base: number, off: number, v: number) => {
    li(T1, v >>> 0);
    code.push(sw(T1, base, off));
  };
  // lista do RDP em 0xA0200000 (RDRAM sem cache); a imagem em 0x00100000
  const lista = [
    [0x2f300000, 0x00000000], // outros modos: ciclo "fill"
    [0x2d000000, 0x005003c0], // tesoura: (0,0)-(320,240)
    [0x3f10013f, 0x00100000], // imagem de cor: RGBA 16 bits, 320 de largura, em 0x00100000
    [0x37000000, 0xf801f801], // cor de preencher: vermelho
    [0x364fc3bc, 0x00000000], // retângulo cheio (0,0)-(319,239)
    [0x27000000, 0x00000000], // sincroniza o pipeline
    [0x37000000, 0x07c107c1], // cor de preencher: verde
    [0x3613c0bc, 0x00040040], // retângulo cheio (16,16)-(79,47)
    [0x29000000, 0x00000000], // sincroniza tudo
  ];
  li(T0, 0xa0200000);
  lista.forEach(([a, b], i) => {
    gravar(T0, i * 8, a ?? 0);
    gravar(T0, i * 8 + 4, b ?? 0);
  });
  li(T0, 0xa4100000); // registradores do RDP (DPC)
  gravar(T0, 0x0c, 0x00000001); // tira o "lendo da memória do RSP"
  gravar(T0, 0x00, 0x00200000); // começo da lista
  gravar(T0, 0x04, 0x00200000 + lista.length * 8); // fim: o RDP começa
  li(T0, 0xa4400000); // VI, NTSC 320x240 16 bits
  for (const [off, v] of [
    [0x04, 0x00100000],
    [0x08, 320],
    [0x0c, 0x200],
    [0x14, 0x03e52239],
    [0x18, 0x20d],
    [0x1c, 0xc15],
    [0x20, 0x0c150c15],
    [0x24, 0x006c02ec],
    [0x28, 0x002501ff],
    [0x2c, 0x000e0204],
    [0x30, 0x200],
    [0x34, 0x400],
    [0x00, 0x00003202],
  ] as const)
    gravar(T0, off, v);
  code.push(0x1000ffff, 0); // b . (fica aqui)
  void T2;
  const r = Buffer.alloc(0x101000);
  r.writeUInt32BE(0x80371240, 0); // .z64
  r.writeUInt32BE(0x0000000f, 4);
  r.writeUInt32BE(0x80000400, 8);
  r.write('KOF N64 DESENHA    ', 0x20, 'latin1');
  r.write('N', 0x3b, 'latin1');
  r.write('KD', 0x3c, 'latin1');
  r.write('E', 0x3e, 'latin1');
  code.forEach((w, i) => r.writeUInt32BE(w, 0x40 + i * 4));
  if (0x40 + code.length * 4 > 0x1000) throw new Error('o programa não cabe no lugar do IPL3');
  return r;
}

/**
 * Game Boy que troca a cor da tela inteira a cada quadro (BGP: branco, cinza claro, cinza escuro, preto, de novo):
 * o tom na tela diz o número do quadro (mod 4), então dá pra contar quadro repetido e pulado (tools/medir-ritmo.mjs).
 */
export function romGbContador(): Buffer {
  const r = Buffer.alloc(0x8000);
  r.set([0x00, 0xc3, 0x50, 0x01], 0x100); // nop; jp $0150
  r.write('KOFRITMO', 0x134, 'latin1');
  const programa = [
    [0xf3], // di
    [0xf0, 0x44, 0xfe, 0x90, 0x38, 0xfa], // espera o vblank (LY >= 144)
    [0xaf, 0xe0, 0x40], // LCD desligado
    [0x21, 0x00, 0x80, 0x01, 0x00, 0x20], // hl = $8000, bc = $2000
    [0xaf, 0x22, 0x0b, 0x78, 0xb1, 0x20, 0xf9], // zera a VRAM inteira (tile 0 vazio, mapa todo no tile 0)
    [0xaf, 0xe0, 0x47], // BGP = 0
    [0x3e, 0x91, 0xe0, 0x40], // LCD ligado, fundo ligado, tiles em $8000
    [0xf0, 0x44, 0xfe, 0x90, 0x20, 0xfa], // laço: espera LY == 144
    [0x1c, 0x7b, 0xe6, 0x03, 0xe0, 0x47], // e++; BGP = e & 3 (a cor 0 vira o tom e & 3)
    [0xf0, 0x44, 0xfe, 0x90, 0x28, 0xfa], // espera sair da linha 144
    [0x18, 0xec], // volta pro laço
  ];
  r.set(programa.flat(), 0x150);
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - (r[i] ?? 0) - 1) & 0xff;
  r[0x14d] = x;
  return r;
}
