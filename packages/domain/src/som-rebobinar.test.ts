import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  acelerar,
  aplicarEntrada,
  coefFita,
  cruzar,
  filtrarFita,
  ganhoEntrada,
  ganhosCruzados,
  inverter,
  quadrosEm,
  trechoPraTras,
} from './som-rebobinar';

const F = (a: number[]) => new Float32Array(a);
const perto = (x: ArrayLike<number>, y: number[], tol = 1e-5) => {
  expect(x.length).toBe(y.length);
  for (let i = 0; i < y.length; i++) expect(Math.abs((x[i] ?? 0) - (y[i] ?? 0))).toBeLessThan(tol);
};

describe('som ao rebobinar: o que cada conta garante', () => {
  it('inverter troca a ordem dos quadros, não os canais', () => {
    perto(inverter(F([1, 2, 3, 4, 5, 6])), [5, 6, 3, 4, 1, 2]);
  });
  it('acelerar 2× faz a média dos pares e corta pela metade', () => {
    perto(acelerar(F([1, 0, 3, 0, 5, 2, 7, 2]), 2), [2, 0, 6, 2]);
    expect(acelerar(F([1, 1]), 1)).toEqual(F([1, 1]));
  });
  it('fade de entrada vai de 0 a 1 sem quina e continua entre trechos', () => {
    expect(ganhoEntrada(0, 10)).toBe(0);
    expect(ganhoEntrada(5, 10)).toBeCloseTo(0.5);
    expect(ganhoEntrada(10, 10)).toBe(1);
    const tudo = F(Array(20).fill(1));
    aplicarEntrada(tudo, 0, 10);
    const a = F(Array(10).fill(1));
    const b = F(Array(10).fill(1));
    aplicarEntrada(a, 0, 10);
    aplicarEntrada(b, 5, 10);
    perto([...a, ...b], [...tudo]);
  });
  it('a fita deixa o grave passar e corta o agudo, e começa da memória (sem estalo)', () => {
    const a = coefFita(3500, 48000);
    const grave = F(Array(400).fill(0.5));
    const m: [number, number] = [0.5, 0.5];
    filtrarFita(grave, a, m);
    expect(grave[398]).toBeCloseTo(0.5);
    const agudo = F(Array.from({ length: 400 }, (_, i) => ((i >> 1) % 2 ? 0.5 : -0.5))); // 24 kHz
    filtrarFita(agudo, a, [0, 0]);
    expect(Math.abs(agudo[398] ?? 1)).toBeLessThan(0.25);
  });
  it('crossfade de potência constante: começa no velho, termina no novo, e depois não toca no novo', () => {
    const [v0, n0] = ganhosCruzados(0, 8);
    expect([v0, n0]).toEqual([1, 0]);
    const [v4, n4] = ganhosCruzados(4, 8);
    expect(v4 * v4 + n4 * n4).toBeCloseTo(1);
    const novo = F([0.3, 0.3, 0.3, 0.3, 0.3, 0.3]);
    cruzar(novo, F(Array(20).fill(-1)), 8, 8);
    perto(novo, [0.3, 0.3, 0.3, 0.3, 0.3, 0.3]);
  });
  it('o trecho pra trás de um som em rampa sai em rampa descendente, com metade do tamanho', () => {
    const rampa = F(Array.from({ length: 200 }, (_, i) => (i >> 1) / 100));
    const m: [number, number] = [0.99, 0.99];
    const t = trechoPraTras(rampa, coefFita(3500, 48000), m, 2);
    expect(t.length).toBe(100);
    expect(t[0]).toBeGreaterThan(t[98] ?? 1);
  });
  it('quadrosEm arredonda e nunca dá zero', () => {
    expect(quadrosEm(80, 48000)).toBe(3840);
    expect(quadrosEm(0, 48000)).toBe(1);
  });
});

interface Caso {
  funcao: string;
  [k: string]: unknown;
}
const fixture = JSON.parse(
  readFileSync(new URL('../../contracts/fixtures/som-rebobinar.json', import.meta.url), 'utf8'),
) as { casos: Caso[] };

describe('som ao rebobinar: vetores do fixture (os mesmos do Rust)', () => {
  it.each(fixture.casos.map((c, i) => [`${i} ${c.funcao}`, c] as const))('%s', (_, c) => {
    const n = (k: string) => c[k] as number;
    const v = (k: string) => F(c[k] as number[]);
    const saida = c.saida as number[];
    switch (c.funcao) {
      case 'inverter':
        return perto(inverter(v('entrada')), saida);
      case 'acelerar':
        return perto(acelerar(v('entrada'), n('fator')), saida);
      case 'ganhoEntrada':
        return perto(
          saida.map((_, i) => ganhoEntrada(i, n('total'))),
          saida,
        );
      case 'aplicarEntrada': {
        const x = v('entrada');
        aplicarEntrada(x, n('inicio'), n('total'));
        return perto(x, saida);
      }
      case 'coefFita':
        return perto([coefFita(n('hz'), n('taxa'))], saida, 1e-12);
      case 'filtrarFita': {
        const x = v('entrada');
        const m = [...(c.memoria as number[])] as [number, number];
        filtrarFita(x, coefFita(n('hz'), n('taxa')), m);
        perto(m, c.memoriaDepois as number[]);
        return perto(x, saida);
      }
      case 'ganhosCruzados':
        return perto(Array.from({ length: saida.length / 2 }, (_, i) => ganhosCruzados(i, n('total'))).flat(), saida);
      case 'cruzar': {
        const x = v('novo');
        cruzar(x, v('velho'), n('inicio'), n('total'));
        return perto(x, saida);
      }
      case 'trechoPraTras': {
        const m = [...(c.memoria as number[])] as [number, number];
        const x = trechoPraTras(v('entrada'), coefFita(n('hz'), n('taxa')), m, n('velocidade'));
        perto(m, c.memoriaDepois as number[]);
        return perto(x, saida);
      }
      default:
        throw new Error(`caso desconhecido no fixture: ${c.funcao}`);
    }
  });
});
