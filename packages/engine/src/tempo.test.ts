import { describe, expect, it } from 'vitest';
import { MAX_QUADROS_POR_PASSO, criarRelogio } from './tempo';

describe('relógio de quadros', () => {
  it('60 fps num monitor de 60 Hz dá 1 quadro por passo', () => {
    const r = criarRelogio(60);
    const n = Array.from({ length: 600 }, () => r.passo(1000 / 60)).reduce((a, b) => a + b, 0);
    expect(n).toBeGreaterThanOrEqual(599);
    expect(n).toBeLessThanOrEqual(600);
  });
  it('Game Boy (59,73) em 10 s roda ~597 quadros', () => {
    const r = criarRelogio(59.73);
    let n = 0;
    for (let i = 0; i < 600; i++) n += r.passo(1000 / 60);
    expect(Math.abs(n - 597)).toBeLessThanOrEqual(1);
  });
  it('engasgo grande roda no máximo 4 e não acumula atraso', () => {
    const r = criarRelogio(60);
    expect(r.passo(2000)).toBe(MAX_QUADROS_POR_PASSO);
    expect(r.passo(1000 / 60)).toBe(1);
  });
  it('fps inválido é erro', () => expect(() => criarRelogio(0)).toThrow(RangeError));
});
