import { describe, expect, it } from 'vitest';
import { arquivoDaBios, ehBiosPs2, faltaBios, sistemaDaBios } from './bios';

describe('BIOS', () => {
  it('reconhece pelo nome e pelo tamanho', () => {
    expect(sistemaDaBios('gba_bios.bin', new Uint8Array(16384))).toBe('gba');
    expect(sistemaDaBios('qualquer.bin', new Uint8Array(524288))).toBe('ps1');
    expect(sistemaDaBios('neogeo.zip', new Uint8Array(100))).toBe('neogeo');
    expect(sistemaDaBios('x.diff', new Uint8Array(4194304))).toBeNull();
  });
  it('PS2 pela ROMDIR', () => {
    const d = new Uint8Array(4194304);
    d.set([82, 69, 83, 69, 84, 0], 0x2700);
    'ROMDIR'.split('').forEach((c, i) => (d[0x2710 + i] = c.charCodeAt(0)));
    expect(ehBiosPs2(d)).toBe(true);
    expect(sistemaDaBios('bios.bin', d)).toBe('ps2');
  });
  it('botão do console: aceita com outro nome e guarda com o nome que o núcleo procura', () => {
    expect(arquivoDaBios('ps1', 'SCPH1001.BIN', new Uint8Array(524288))).toBe('scph1001.bin');
    expect(arquivoDaBios('ps1', 'outra.bin', new Uint8Array(524288))).toBe('scph5501.bin');
    expect(arquivoDaBios('neogeo', 'NeoGeo BIOS.zip', new Uint8Array(10))).toBe('neogeo.zip');
    expect(arquivoDaBios('gba', 'x.bin', new Uint8Array(10))).toBeNull();
  });
  it('só o Neo Geo exige', () => {
    expect(faltaBios('neogeo', new Set())).toBe(true);
    expect(faltaBios('neogeo', new Set(['neogeo.zip']))).toBe(false);
    expect(faltaBios('ps1', new Set())).toBe(false);
  });
});
