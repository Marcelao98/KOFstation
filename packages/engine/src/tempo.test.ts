import { describe, expect, it } from 'vitest';
import { MAX_QUADROS_POR_PASSO, criarRelogio, criarRitmoDoVsync } from './tempo';

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

describe('ritmo pelo vsync', () => {
  const rodar = (r: ReturnType<typeof criarRitmoDoVsync>, vsyncs: number[]) => vsyncs.map((ms) => r.passo(ms));
  it('Game Boy (59,73) num monitor de 60 Hz trava: 1 quadro por vsync, nunca 0 nem 2', () => {
    const r = criarRitmoDoVsync(59.7275);
    const n = rodar(
      r,
      Array.from({ length: 3600 }, () => 1000 / 60),
    ).slice(10);
    expect(new Set(n)).toEqual(new Set([1]));
    expect(r.travado).toBe(true);
    expect(r.fator).toBeCloseTo(60 / 59.7275, 4);
  });
  it('trava mesmo com o vsync tremendo ±3 ms', () => {
    const r = criarRitmoDoVsync(60.0988);
    const n = rodar(
      r,
      Array.from({ length: 600 }, (_, i) => 1000 / 60 + (i % 2 ? 3 : -3)),
    ).slice(10);
    expect(new Set(n)).toEqual(new Set([1]));
  });
  it('um vsync perdido (33 ms) roda 2 pra não atrasar', () => {
    const r = criarRitmoDoVsync(59.7275);
    rodar(
      r,
      Array.from({ length: 30 }, () => 1000 / 60),
    );
    expect(r.passo(2000 / 60)).toBe(2);
    expect(r.passo(1000 / 60)).toBe(1);
  });
  it('120 Hz: 1 quadro a cada 2 vsyncs, alternado', () => {
    const r = criarRitmoDoVsync(59.7275);
    const n = rodar(
      r,
      Array.from({ length: 600 }, () => 1000 / 120),
    ).slice(20);
    expect(r.travado).toBe(true);
    for (let i = 1; i < n.length; i++) expect((n[i] ?? 0) + (n[i - 1] ?? 0)).toBe(1);
  });
  it('144 Hz não trava: soma o tempo (59,73 quadros por segundo de verdade)', () => {
    const r = criarRitmoDoVsync(59.7275);
    const total = rodar(
      r,
      Array.from({ length: 1440 }, () => 1000 / 144),
    ).reduce((a, b) => a + b, 0);
    expect(r.travado).toBe(false);
    expect(Math.abs(total - 597)).toBeLessThanOrEqual(1);
  });
  it('PAL (50) num monitor de 60 Hz não trava', () => {
    const r = criarRitmoDoVsync(50);
    const total = rodar(
      r,
      Array.from({ length: 600 }, () => 1000 / 60),
    ).reduce((a, b) => a + b, 0);
    expect(r.travado).toBe(false);
    expect(Math.abs(total - 500)).toBeLessThanOrEqual(1);
  });
  it('engasgo grande: no máximo 4 e não corre atrás', () => {
    const r = criarRitmoDoVsync(60);
    rodar(
      r,
      Array.from({ length: 30 }, () => 1000 / 60),
    );
    expect(r.passo(90)).toBe(MAX_QUADROS_POR_PASSO);
    expect(r.passo(1000 / 60)).toBe(1);
  });
});
