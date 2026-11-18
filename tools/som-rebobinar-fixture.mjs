// Gera packages/contracts/fixtures/som-rebobinar.json a partir das contas do domain (som ao rebobinar, fase R).
// Os testes do TypeScript e do Rust leem o mesmo arquivo: o som tem que sair igual nos dois.
// Uso: node tools/som-rebobinar-fixture.mjs && npx prettier --write packages/contracts/fixtures/som-rebobinar.json
import { writeFileSync } from 'node:fs';
import * as s from '../packages/domain/src/som-rebobinar.ts';

const F = (a) => new Float32Array(a);
const L = (x) => Array.from(x, (v) => Math.round(v * 1e7) / 1e7);
const onda = (n, f = 0.31) =>
  F(Array.from({ length: n * 2 }, (_, i) => (Math.round(Math.sin(i * f) * 1e4) / 1e4) * (i % 2 ? -0.5 : 1)));

const casos = [];
const e1 = F([0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.4, -0.4]);
casos.push({ funcao: 'inverter', entrada: L(e1), saida: L(s.inverter(e1)) });
const e2 = onda(7);
casos.push({ funcao: 'acelerar', entrada: L(e2), fator: 2, saida: L(s.acelerar(e2, 2)) });
casos.push({ funcao: 'acelerar', entrada: L(e2), fator: 1.5, saida: L(s.acelerar(e2, 1.5)) });
casos.push({ funcao: 'ganhoEntrada', total: 8, saida: L(Array.from({ length: 10 }, (_, i) => s.ganhoEntrada(i, 8))) });
const e3 = onda(6, 0.7);
const m3 = [0.25, -0.25];
const o3 = e3.slice();
s.aplicarEntrada(o3, 3, 8);
casos.push({ funcao: 'aplicarEntrada', entrada: L(e3), inicio: 3, total: 8, saida: L(o3) });
casos.push({ funcao: 'coefFita', hz: 3500, taxa: 48000, saida: [s.coefFita(3500, 48000)] });
const o4 = e3.slice();
const m4 = [...m3];
s.filtrarFita(o4, s.coefFita(3500, 48000), m4);
casos.push({
  funcao: 'filtrarFita',
  entrada: L(e3),
  hz: 3500,
  taxa: 48000,
  memoria: m3,
  saida: L(o4),
  memoriaDepois: L(m4),
});
casos.push({
  funcao: 'ganhosCruzados',
  total: 6,
  saida: L(Array.from({ length: 8 }, (_, i) => s.ganhosCruzados(i, 6)).flat()),
});
const novo = onda(5, 0.2);
const velho = onda(10, 0.9);
for (const inicio of [0, 3]) {
  const o = novo.slice();
  s.cruzar(o, velho, inicio, 6);
  casos.push({ funcao: 'cruzar', novo: L(novo), velho: L(velho), inicio, total: 6, saida: L(o) });
}
const e5 = onda(9, 0.45);
const m5 = [0.1, 0.05];
const m5d = [...m5];
const o5 = s.trechoPraTras(e5, s.coefFita(3500, 48000), m5d, 2);
casos.push({
  funcao: 'trechoPraTras',
  entrada: L(e5),
  hz: 3500,
  taxa: 48000,
  memoria: m5,
  velocidade: 2,
  saida: L(o5),
  memoriaDepois: L(m5d),
});

const doc = {
  sobre:
    'Som ao rebobinar (fase R): vetores de teste das contas de packages/domain/src/som-rebobinar.ts, conferidos pelo TypeScript e pelo Rust. Gerado por tools/som-rebobinar-fixture.mjs; tolerância 1e-5 (float32).',
  constantes: s.SOM_REBOBINAR,
  casos,
};
writeFileSync(
  new URL('../packages/contracts/fixtures/som-rebobinar.json', import.meta.url),
  JSON.stringify(doc, null, 1).replace(/\[\s+([-\d.,\se]+?)\s+\]/g, (_, x) => `[${x.replace(/\s+/g, ' ').trim()}]`) +
    '\n',
);
console.log(`${casos.length} casos`);
