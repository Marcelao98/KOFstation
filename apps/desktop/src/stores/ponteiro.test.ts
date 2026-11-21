import { describe, expect, it } from 'vitest';
import { posicaoNaImagem } from './ponteiro';

describe('ponteiro do Wiimote no mouse (W.4)', () => {
  const r = { left: 100, top: 50, width: 400, height: 300 };
  it('o centro é 0, os cantos são ±1', () => {
    expect(posicaoNaImagem(r, 300, 200)).toEqual({ x: 0, y: 0, dentro: true });
    expect(posicaoNaImagem(r, 100, 50)).toEqual({ x: -1, y: -1, dentro: true });
    expect(posicaoNaImagem(r, 500, 350)).toEqual({ x: 1, y: 1, dentro: true });
  });
  it('fora da imagem: preso na borda e "fora"', () => {
    expect(posicaoNaImagem(r, 0, 200)).toEqual({ x: -1, y: 0, dentro: false });
  });
});
