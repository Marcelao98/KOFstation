import { describe, expect, it } from 'vitest';
import { criarAnel, escrever, ler, ocupacao } from './anel';
import { Reamostrador } from './reamostrador';

describe('anel de som', () => {
  it('escreve, lê na ordem e conta faltas', () => {
    const a = criarAnel(8);
    expect(escrever(a, new Float32Array([1, -1, 2, -2, 3, -3]))).toBe(3);
    expect(ocupacao(a)).toBe(3);
    const e = new Float32Array(4);
    const d = new Float32Array(4);
    ler(a, e, d);
    expect([...e]).toEqual([1, 2, 3, 0]);
    expect([...d]).toEqual([-1, -2, -3, 0]);
    expect(Atomics.load(a.ctl, 2)).toBe(1);
  });
  it('cheio: descarta o que não cabe', () => {
    const a = criarAnel(4);
    expect(escrever(a, new Float32Array(20))).toBe(3);
  });
});

describe('reamostrador', () => {
  it('32040 Hz → 48000 Hz: um segundo vira ~um segundo, sem perder a fração', () => {
    const r = new Reamostrador(32040, 48000);
    let total = 0;
    for (let q = 0; q < 60; q++) total += r.converter(new Int16Array(534 * 2)).length / 2;
    expect(Math.abs(total - (48000 * (534 * 60)) / 32040)).toBeLessThan(3);
  });
  it('mesma taxa: copia (em float)', () => {
    const r = new Reamostrador(48000, 48000);
    const s = r.converter(new Int16Array([16384, -16384, 0, 0]));
    expect([...s]).toEqual([0.5, -0.5, 0, 0]);
    const s2 = r.converter(new Int16Array([8192, 8192, 0, 0]));
    expect([...s2]).toEqual([0.25, 0.25, 0, 0]);
  });
});
