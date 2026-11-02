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

/** Executável de PlayStation (PS-X EXE) que fica num laço: o PCSX abre sem CD e sem BIOS (a dele imita). */
export function exePs1(): Buffer {
  const r = Buffer.alloc(0x1000);
  r.write('PS-X EXE', 0, 'latin1');
  r.writeUInt32LE(0x80010000, 0x10); // pc0
  r.writeUInt32LE(0x80010000, 0x18); // t_addr
  r.writeUInt32LE(0x800, 0x1c); // t_size
  r.writeUInt32LE(0x801fff00, 0x30); // pilha
  r.write('Sony Computer Entertainment Inc. for North America area', 0x4c, 'latin1');
  r.writeUInt32LE(0x08004000, 0x800); // j 0x80010000
  return r;
}

/** ROM de Nintendo 64 mínima (cabeçalho big-endian e a CPU num laço): o Mupen64Plus abre e desenha. */
export function romN64(): Buffer {
  const r = Buffer.alloc(0x101000);
  r.writeUInt32BE(0x80371240, 0); // .z64
  r.writeUInt32BE(0x0000000f, 4); // clock
  r.writeUInt32BE(0x80000400, 8); // ponto de entrada
  r.write('KOF TESTE N64      ', 0x20, 'latin1');
  r.write('N', 0x3b, 'latin1');
  r.write('KT', 0x3c, 'latin1');
  r.write('E', 0x3e, 'latin1');
  r.writeUInt32BE(0x08000100, 0x1000); // j 0x80000400 (o código do jogo começa em 0x1000 na ROM)
  return r;
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
