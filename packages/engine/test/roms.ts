// ROMs geradas aqui mesmo (nada de ROM de verdade no repositório). Pequenas, mas fazem o núcleo trabalhar de verdade:
// a CPU emulada roda o quadro inteiro e o vídeo/som são gerados.

export function romSnes(): Uint8Array {
  const r = new Uint8Array(0x8000);
  // SEI; CLC; XCE (modo nativo); LDA #$0F; STA $2100 (tela ligada); BRA -2
  r.set([0x78, 0x18, 0xfb, 0xa9, 0x0f, 0x8d, 0x00, 0x21, 0x80, 0xfe], 0);
  'KOF PARIDADE'.split('').forEach((c, i) => (r[0x7fc0 + i] = c.charCodeAt(0)));
  for (let i = 12; i < 21; i++) r[0x7fc0 + i] = 0x20;
  r[0x7fd5] = 0x20;
  r[0x7fd7] = 0x05;
  r[0x7ffc] = 0x00;
  r[0x7ffd] = 0x80;
  let s = 0x1fe;
  for (let i = 0; i < r.length; i++) if (i < 0x7fdc || i > 0x7fdf) s = (s + (r[i] ?? 0)) & 0xffff;
  r[0x7fde] = s & 0xff;
  r[0x7fdf] = s >> 8;
  r[0x7fdc] = (s ^ 0xffff) & 0xff;
  r[0x7fdd] = (s ^ 0xffff) >> 8;
  return r;
}

export function romNes(): Uint8Array {
  const r = new Uint8Array(16 + 0x4000 + 0x2000);
  r.set([0x4e, 0x45, 0x53, 0x1a, 1, 1], 0);
  // SEI; LDA #$1E; STA $2001 (liga o desenho); LDA #$0F; STA $4015; LDA #$BF; STA $4000; LDA #$40; STA $4002;
  // LDA #$00; STA $4003 (pulso 1 tocando); JMP para si mesmo
  r.set(
    [
      0x78, 0xa9, 0x1e, 0x8d, 0x01, 0x20, 0xa9, 0x0f, 0x8d, 0x15, 0x40, 0xa9, 0xbf, 0x8d, 0x00, 0x40, 0xa9, 0x40, 0x8d,
      0x02, 0x40, 0xa9, 0x00, 0x8d, 0x03, 0x40, 0x4c, 0x1a, 0x80,
    ],
    16,
  );
  for (const v of [0x3ffa, 0x3ffc, 0x3ffe]) {
    r[16 + v] = 0x00;
    r[16 + v + 1] = 0x80;
  }
  return r;
}

export function romMd(): Uint8Array {
  const r = new Uint8Array(0x400);
  const d = new DataView(r.buffer);
  d.setUint32(0, 0xfffe00);
  d.setUint32(4, 0x200);
  'SEGA MEGA DRIVE '.split('').forEach((c, i) => (r[0x100 + i] = c.charCodeAt(0)));
  [
    0x33fc, 0x8004, 0x00c0, 0x0004, 0x33fc, 0x8144, 0x00c0, 0x0004, 0x33fc, 0x8700, 0x00c0, 0x0004, 0x23fc, 0xc000,
    0x0000, 0x00c0, 0x0004, 0x33fc, 0x000e, 0x00c0, 0x0000, 0x60fe,
  ].forEach((w, i) => d.setUint16(0x200 + 2 * i, w));
  return r;
}

export function romGb(): Uint8Array {
  const r = new Uint8Array(0x8000);
  r.set([0x00, 0xc3, 0x50, 0x01], 0x100); // nop; jp $0150
  'KOFPARIDADE'.split('').forEach((c, i) => (r[0x134 + i] = c.charCodeAt(0)));
  // ld a,$80; ldh ($26),a (som ligado); ld a,$77; ldh ($24),a; ld a,$11; ldh ($25),a; ld a,$80; ldh ($11),a;
  // ld a,$F0; ldh ($12),a; ld a,$C0; ldh ($14),a (canal 1 tocando); jr para si mesmo
  r.set(
    [
      0x3e, 0x80, 0xe0, 0x26, 0x3e, 0x77, 0xe0, 0x24, 0x3e, 0x11, 0xe0, 0x25, 0x3e, 0x80, 0xe0, 0x11, 0x3e, 0xf0, 0xe0,
      0x12, 0x3e, 0xc0, 0xe0, 0x14, 0x18, 0xfe,
    ],
    0x150,
  );
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - (r[i] ?? 0) - 1) & 0xff;
  r[0x14d] = x;
  return r;
}

export function romGba(): Uint8Array {
  const r = new Uint8Array(0x200);
  r.set([0xfe, 0xff, 0xff, 0xea], 0); // b . (laço)
  'KOFPARIDADE'.split('').forEach((c, i) => (r[0xa0 + i] = c.charCodeAt(0)));
  r[0xb2] = 0x96;
  return r;
}

/** Sequência de botões usada nos dois lados (antigo e novo): muda a cada poucos quadros. */
export const botoesNoQuadro = (i: number): number =>
  [0, 0x0080, 0x8000, 0x0100, 0x1000, 0x0800 | 0x0040, 0][i % 7] ?? 0;

export const CASOS = [
  { sistema: 'snes', arquivo: 'paridade.sfc', rom: romSnes },
  { sistema: 'nes', arquivo: 'paridade.nes', rom: romNes },
  { sistema: 'md', arquivo: 'paridade.md', rom: romMd },
  { sistema: 'gb', arquivo: 'paridade.gb', rom: romGb },
  { sistema: 'gba', arquivo: 'paridade.gba', rom: romGba },
] as const;

/** Hash simples (FNV-1a de 32 bits) de bytes. */
export function hash(b: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ (b[i] ?? 0), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** FNV-1a de 32 bits aos pedaços (pro som de muitos quadros). */
export class Hasher {
  private h = 0x811c9dc5;
  n = 0;
  add(b: Uint8Array): void {
    for (let i = 0; i < b.length; i++) this.h = Math.imul(this.h ^ (b[i] ?? 0), 0x01000193);
    this.n += b.length;
  }
  get valor(): string {
    return (this.h >>> 0).toString(16).padStart(8, '0');
  }
}

export const QUADROS = 180;
export const MARCAS = [30, 90, 179];
export interface Resultado {
  largura: number;
  altura: number;
  fps: number;
  taxaAudio: number;
  quadros: Record<string, string>;
  som: string;
  amostras: number;
}

/** .spc feito aqui: o SPC700 parado num laço e a voz 0 soando uma onda quadrada (BRR) em laço. */
export function spcDeTeste(envx = 0x7f): Uint8Array {
  const u8 = new Uint8Array(0x10200);
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
