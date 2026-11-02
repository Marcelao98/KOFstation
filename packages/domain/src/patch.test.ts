// M10.3: IPS, BPS e UPS como o patch.js do antigo (patches montados aqui mesmo).
import { describe, expect, it } from 'vitest';
import { aplicarPatch, nomeTraduzido, tipoDoPatch } from './patch';
import { crc32 } from './rom';

const rom = Uint8Array.from({ length: 4096 }, (_, i) => (i * 7) & 0xff);
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24];
const num = (n: number) => {
  const r: number[] = [];
  for (;;) {
    const x = n & 0x7f;
    n = Math.floor(n / 128);
    if (n === 0) {
      r.push(x | 0x80);
      break;
    }
    r.push(x);
    n--;
  }
  return r;
};

describe('patches', () => {
  it('IPS: escreve, repete (RLE) e cresce', () => {
    const p = Uint8Array.from([
      ...'PATCH'.split('').map((c) => c.charCodeAt(0)),
      0,
      0,
      0x10,
      0,
      2,
      0xaa,
      0xbb, // 2 bytes em $10
      0,
      0x10,
      0,
      0,
      0,
      0,
      3,
      0xcc, // RLE: 3 x $CC em $1000 (passa do fim: cresce)
      ...'EOF'.split('').map((c) => c.charCodeAt(0)),
    ]);
    expect(tipoDoPatch(p)).toBe('ips');
    const r = aplicarPatch(rom, p, 'nes').rom;
    expect(r.length).toBe(4099);
    expect([...r.subarray(0x10, 0x12)]).toEqual([0xaa, 0xbb]);
    expect([...r.subarray(4096)]).toEqual([0xcc, 0xcc, 0xcc]);
    // SNES com cabeçalho de 512: o IPS vai na ROM sem ele
    const comCab = new Uint8Array(512 + rom.length);
    comCab.set(rom, 512);
    expect(aplicarPatch(comCab, p, 'snes').rom.length).toBe(4099);
  });

  it('BPS: TargetRead, confere os CRCs e recusa a ROM errada', () => {
    const novo = rom.slice();
    novo[5] = 0x99;
    // SourceRead 5, TargetRead 1 (0x99), SourceRead o resto
    const corpo = [
      ...'BPS1'.split('').map((c) => c.charCodeAt(0)),
      ...num(rom.length),
      ...num(novo.length),
      ...num(0),
      ...num(((5 - 1) << 2) | 0),
      ...num(((1 - 1) << 2) | 1),
      0x99,
      ...num(((rom.length - 6 - 1) << 2) | 0),
      ...u32(crc32(rom)),
      ...u32(crc32(novo)),
    ];
    const p = Uint8Array.from([...corpo, ...u32(crc32(Uint8Array.from(corpo)))]);
    expect([...aplicarPatch(rom, p, 'gba').rom]).toEqual([...novo]);
    expect(() => aplicarPatch(novo, p, 'gba')).toThrow('outra versão');
  });

  it('UPS: XOR nos dois sentidos', () => {
    const novo = rom.slice();
    novo[3] = (rom[3] ?? 0) ^ 0x0f;
    const corpo = [
      ...'UPS1'.split('').map((c) => c.charCodeAt(0)),
      ...num(rom.length),
      ...num(novo.length),
      ...num(3),
      0x0f,
      0x00,
      ...u32(crc32(rom)),
      ...u32(crc32(novo)),
    ];
    const p = Uint8Array.from([...corpo, ...u32(crc32(Uint8Array.from(corpo)))]);
    expect(aplicarPatch(rom, p, 'gb').rom[3]).toBe(novo[3]);
    expect(aplicarPatch(novo, p, 'gb').rom[3]).toBe(rom[3]);
  });

  it('nome do traduzido', () => {
    expect(nomeTraduzido('Zelda.sfc')).toEqual({ nome: 'Zelda (tradução).sfc', original: 'Zelda' });
    expect(nomeTraduzido('Zelda (tradução).sfc').nome).toBe('Zelda (tradução).sfc');
  });
});
