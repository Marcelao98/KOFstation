// M7.1: o painel de imagem é o do antigo, sem mudança. O kofvisual.js tem que ser o web/visual.js do kofstation-old
// (ceba493) byte a byte, tirando o cabeçalho e a última linha (export).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KofVisual } from '../src/visual/kofvisual.js';

const SHA_DO_ANTIGO = '2bbd9e57d42bcb9f49d3338ba1634faf5e9653a2ac838a8c9f3ed9334e7d0f26';

describe('KofVisual (cópia do antigo)', () => {
  it('o miolo é o visual.js do antigo, byte a byte', () => {
    const t = readFileSync(new URL('../src/visual/kofvisual.js', import.meta.url), 'utf8');
    const ini = t.indexOf('// Painel de imagem do KOFstation');
    const fim = t.lastIndexOf('export { KofVisual };');
    const antigo = t.slice(ini, fim) + "if (typeof module !== 'undefined') module.exports = KofVisual;\n";
    expect(createHash('sha256').update(antigo).digest('hex')).toBe(SHA_DO_ANTIGO);
  });
  it('61 ajustes, 42 predefinições, cada uma com shader e passadas', () => {
    expect(KofVisual.AJUSTES).toHaveLength(61);
    expect(KofVisual.PREDEF).toHaveLength(42);
    for (const [id] of KofVisual.PREDEF) {
      const v = KofVisual.valores(id);
      expect(KofVisual.fonte(v, { passos: true }), id).toContain('void main');
      expect(['leve', 'médio', 'pesado']).toContain(KofVisual.custo(v));
    }
    expect(KofVisual.passos(KofVisual.valores('pixelhd'), 256, 224).map((p) => p.w)).toEqual([512, 1024]);
  });
});

describe('KofMolduras (cópia do antigo)', () => {
  it('o miolo é o molduras.js do antigo, byte a byte', () => {
    const t = readFileSync(new URL('../src/molduras/kofmolduras.js', import.meta.url), 'utf8');
    const ini = t.indexOf('// Molduras do KOFstation');
    const fim = t.lastIndexOf('export { KofMolduras };');
    const antigo = t.slice(ini, fim) + "if (typeof module !== 'undefined') module.exports = KofMolduras;\n";
    expect(createHash('sha256').update(antigo).digest('hex')).toBe(
      '9c404b973a9fa97508da0ab26945701fda26d94b2ae24240233ba9e2cebae208',
    );
  });
});
