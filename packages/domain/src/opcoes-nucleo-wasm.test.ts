// Confere o catálogo dos núcleos em WebAssembly contra o que eles declaram de verdade
// (`packages/contracts/fixtures/opcoes-wasm.json`, gerada por `node tools/opcoes-wasm.mjs`).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPCOES_DE_NUCLEO } from './opcoes-nucleo';
import type { SistemaId } from './sistemas';

interface Declarada {
  chave: string;
  valores: string[];
  padrao: string;
}
const declaradas = JSON.parse(
  readFileSync(new URL('../../contracts/fixtures/opcoes-wasm.json', import.meta.url), 'utf8'),
) as Record<string, Declarada[]>;

const NUCLEO_DO_SISTEMA: Partial<Record<SistemaId, string>> = {
  n64: 'mupen64',
  snes: 'snes9x',
  gb: 'gambatte',
  nes: 'fceumm',
  md: 'genplus',
  sms: 'genplus',
  gg: 'genplus',
  gba: 'mgba',
};

describe('catálogo das opções dos núcleos em WebAssembly', () => {
  for (const [sistema, nucleo] of Object.entries(NUCLEO_DO_SISTEMA)) {
    it(`${sistema}: chaves, valores e padrões batem com o que o núcleo ${nucleo} declara`, () => {
      const doNucleo = new Map((declaradas[nucleo] ?? []).map((o) => [o.chave, o]));
      expect(doNucleo.size, `fixture sem o núcleo ${nucleo}`).toBeGreaterThan(5);
      for (const o of OPCOES_DE_NUCLEO[sistema as SistemaId] ?? []) {
        const real = doNucleo.get(o.chave);
        expect(real, `${o.chave}: o núcleo não declara essa opção`).toBeDefined();
        if (!real) continue;
        expect(o.padrao, `${o.chave}: padrão`).toBe(real.padrao);
        for (const x of o.valores) expect(real.valores, `${o.chave}: valor "${x.valor}"`).toContain(x.valor);
      }
    });
  }

  it('nenhuma opção dos WebAssembly diz "vale na hora" sem medir (a ponte entrega, mas ninguém mediu quem relê)', () => {
    for (const s of Object.keys(NUCLEO_DO_SISTEMA) as SistemaId[])
      for (const o of OPCOES_DE_NUCLEO[s] ?? []) expect(o.naHora, `${s}/${o.chave}`).toBe(false);
  });

  it('o Equilibrado do N64 e do NES bate com as opções fixas do app (engine/nucleos.ts)', () => {
    const n64 = Object.fromEntries((OPCOES_DE_NUCLEO.n64 ?? []).map((o) => [o.chave, o.perfis.equilibrado]));
    expect(n64['mupen64plus-43screensize']).toBe('320x240');
    expect(n64['mupen64plus-EnableNativeResFactor']).toBe('1');
    expect(n64['mupen64plus-pak1']).toBe('memory');
    expect(n64['mupen64plus-cpucore']).toBe('cached_interpreter');
    const nes = Object.fromEntries((OPCOES_DE_NUCLEO.nes ?? []).map((o) => [o.chave, o.perfis.equilibrado]));
    expect(nes.fceumm_sndquality).toBe('High');
  });
});
