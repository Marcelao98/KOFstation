import { describe, expect, it } from 'vitest';
import { BOTAO, bitsDoControle, semOpostos } from './controle';

const controle = (apertados: number[], axes = [0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: apertados.includes(i) })),
  axes,
});

describe('controle virtual (bits do SNES, como no antigo)', () => {
  it('mapa padrão: 0 = B, 1 = A, 9 = Start, 12–15 = direcional', () => {
    expect(bitsDoControle(controle([0]))).toBe(BOTAO.B);
    expect(bitsDoControle(controle([1, 9]))).toBe(BOTAO.A | BOTAO.Start);
    expect(bitsDoControle(controle([12, 15]))).toBe(BOTAO.Cima | BOTAO.Direita);
  });
  it('analógico aperta o direcional, menos no modo puro', () => {
    expect(bitsDoControle(controle([], [-0.9, 0.8]))).toBe(BOTAO.Esquerda | BOTAO.Baixo);
    expect(bitsDoControle(controle([], [0.3, -0.3]))).toBe(0);
    expect(bitsDoControle(controle([], [-0.9, 0]), undefined, true)).toBe(0);
  });
  it('opostos se anulam', () => {
    expect(semOpostos(BOTAO.Cima | BOTAO.Baixo | BOTAO.A)).toBe(BOTAO.A);
    expect(semOpostos(BOTAO.Esquerda | BOTAO.Direita)).toBe(0);
  });
});
