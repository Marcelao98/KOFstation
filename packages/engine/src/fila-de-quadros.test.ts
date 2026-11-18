import { describe, expect, it } from 'vitest';
import { ESPERA_DA_FOLGA_MS, FilaDeQuadros, MAX_NA_FILA } from './fila-de-quadros';

const q = (n: number, chegou: number) => ({ pixels: new Uint32Array([n]), largura: 1, altura: 1, chegou });

describe('FilaDeQuadros', () => {
  it('um quadro sozinho espera o próximo e depois sai', () => {
    const f = new FilaDeQuadros();
    f.empurrar(q(1, 0));
    expect(f.tirar(5)).toBeNull();
    expect(f.tirar(ESPERA_DA_FOLGA_MS)?.pixels[0]).toBe(1);
    expect(f.tirar(100)).toBeNull();
  });

  it('rajada de 2 quadros sai um por vsync, na ordem, sem perder nenhum', () => {
    const f = new FilaDeQuadros();
    f.empurrar(q(1, 0));
    f.empurrar(q(2, 0));
    expect(f.tirar(1)?.pixels[0]).toBe(1);
    expect(f.tirar(17)).toBeNull(); // sobrou 1: espera folga
    f.empurrar(q(3, 18));
    expect(f.tirar(18)?.pixels[0]).toBe(2);
    expect(f.descartados).toBe(0);
  });

  it('página atrasada: passou do máximo, os mais velhos saem e contam', () => {
    const f = new FilaDeQuadros();
    for (let i = 1; i <= MAX_NA_FILA + 2; i++) f.empurrar(q(i, 0));
    expect(f.tirar(1)?.pixels[0]).toBe(3);
    expect(f.descartados).toBe(2);
  });
});
