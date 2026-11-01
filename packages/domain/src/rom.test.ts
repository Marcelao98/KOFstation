// Os valores esperados saíram do próprio código do antigo (web/nucleo.js `titulo` e web/jogos.js `crcRom`) rodando
// com estas mesmas ROMs geradas: se um dia divergir, o save de alguém some.
import { describe, expect, it } from 'vitest';
import { chaveSramDe, crcRom, jogoIdDe, normal, tituloInterno, VARIANTE } from './rom';
import type { SistemaId } from './sistemas';

function rom(n: number, f?: (u: Uint8Array) => void) {
  const u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = (i * 7 + 3) & 255;
  f?.(u);
  return u;
}
const put = (u: Uint8Array, o: number, s: string) => {
  for (let i = 0; i < s.length; i++) u[o + i] = s.charCodeAt(i);
};

const CASOS: [string, SistemaId, Uint8Array, string, string][] = [
  [
    'snes',
    'snes',
    rom(0x80000, (u) => {
      put(u, 0x7fc0, 'SUPER TESTE KOF      ');
      u.set([0x34, 0x12, 0xcb, 0xed], 0x7fdc);
    }),
    'SUPER TESTE KOF      ',
    'a4cf3765',
  ],
  [
    'snes com cabeçalho de 512',
    'snes',
    rom(0x80000 + 512, (u) => {
      put(u, 0x7fc0 + 512, 'COM CABECALHO        ');
      u.set([0, 0, 0xff, 0xff], 0x7fdc + 512);
    }),
    'COM CABECALHO        ',
    'aa8f8203',
  ],
  ['nes (iNES)', 'nes', rom(16 + 0x8000, (u) => put(u, 0, 'NES\x1a')), 'NES D589A2DB', 'd589a2db'],
  [
    'gb color',
    'gb',
    rom(0x8000, (u) => {
      put(u, 0x134, 'POKEMON TESTE');
      u[0x143] = 0x80;
    }),
    'POKEMON TESTE  ',
    '0cd3ceb6',
  ],
  ['gba', 'gba', rom(0x10000, (u) => put(u, 0xa0, 'KOFTESTEGBA ')), 'KOFTESTEGBA', '4d8c7075'],
  [
    'mega drive',
    'md',
    rom(0x20000, (u) => {
      put(u, 0x100, 'SEGA');
      put(u, 0x150, 'SONIC   TESTE                                   ');
    }),
    'SONIC TESTE',
    'f5360b56',
  ],
  ['mega drive sem cabeçalho', 'md', rom(0x20000), 'MD 25F70869', '25f70869'],
  ['master system com cabeçalho', 'sms', rom(0x8000 + 512), 'SMS 76DE2ACD', '76de2acd'],
  ['game gear', 'gg', rom(0x8000), 'GG 76DE2ACD', '76de2acd'],
];

describe('identidade da ROM (igual ao antigo)', () => {
  for (const [nome, sis, u, titulo, crc] of CASOS)
    it(nome, () => {
      expect(tituloInterno(u, sis)).toBe(titulo);
      expect(crcRom(sis, u)).toBe(crc);
    });
  it('chaves do banco do antigo', () => {
    expect(jogoIdDe('SUPER TESTE KOF      ', 524288)).toBe('SUPER TESTE KOF|524288');
    expect(chaveSramDe(' X ', 10)).toBe('sram.X.10');
  });
  it('normal e variantes do GoodTools', () => {
    expect(normal('Pokémon: Edição Azul!')).toBe('pokemon edicao azul');
    expect(VARIANTE.test('Jogo [h1C]')).toBe(true);
    expect(VARIANTE.test('Jogo [T+Por]')).toBe(false);
  });
});
