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

describe('fila com a janela escondida (2.3)', () => {
  it('sem ninguém tirar (o rAF parado), a fila não passa do máximo e os mais velhos saem', () => {
    const f = new FilaDeQuadros();
    const px = new Uint32Array(4);
    for (let i = 0; i < 1000; i++) f.empurrar({ pixels: px, largura: 2, altura: 2, chegou: i });
    expect(f.tamanho).toBe(MAX_NA_FILA);
    expect(f.descartados).toBe(1000 - MAX_NA_FILA);
    // quando a janela volta, sai o mais novo que sobrou primeiro na ordem
    expect(f.tirar(5000)?.chegou).toBe(1000 - MAX_NA_FILA);
  });
});
