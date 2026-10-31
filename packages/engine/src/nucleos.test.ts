import { describe, expect, it } from 'vitest';
import { tamanhoNaTela } from './escala';
import { mascaraLibretro, nomeParaNucleo } from './nucleos';
import { encaixarQuadro } from './quadro';

describe('peças da engine (iguais ao antigo)', () => {
  it('botões: B = id 0, A = id 8, Start = id 3', () => {
    expect(mascaraLibretro(0x8000)).toBe(1);
    expect(mascaraLibretro(0x0080 | 0x1000)).toBe((1 << 8) | (1 << 3));
  });
  it('Game Boy Color pela marca no cabeçalho', () => {
    const rom = new Uint8Array(0x8000);
    expect(nomeParaNucleo('gb', rom)).toBe('rom.gb');
    rom[0x143] = 0x80;
    expect(nomeParaNucleo('gb', rom)).toBe('rom.gbc');
  });
  it('NES 256x240 vira 256x224 cortando 8 linhas em cima e embaixo', () => {
    const fb = new Uint32Array(256 * 240).map((_, i) => Math.floor(i / 256));
    const s = new Uint32Array(256 * 224);
    encaixarQuadro(fb, 256, 240, 256, 224, s);
    expect(s[0]).toBe(8);
    expect(s[256 * 223]).toBe(231);
  });
  it('SNES em 512x448 reduz pela metade', () => {
    const fb = new Uint32Array(512 * 448).map((_, i) => i % 512);
    const s = new Uint32Array(256 * 224);
    encaixarQuadro(fb, 512, 448, 256, 224, s);
    expect(s[1]).toBe(2);
  });
  it('na janela: múltiplo inteiro e 4:3', () => {
    const r = tamanhoNaTela({
      W: 1000,
      H: 700,
      telaL: 256,
      telaA: 224,
      razaoDoAparelho: 4 / 3,
      proporcao: '43',
      escala: 0,
      cheia: false,
    });
    expect(r).toEqual({ w: 896, h: 672 });
    const pp = tamanhoNaTela({
      W: 1000,
      H: 700,
      telaL: 256,
      telaA: 224,
      razaoDoAparelho: 4 / 3,
      proporcao: '87',
      escala: 2,
      cheia: false,
    });
    expect(pp).toEqual({ w: 512, h: 448 });
  });
});
