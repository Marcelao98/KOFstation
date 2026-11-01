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
