// O .kofsave do antigo e do novo são o mesmo formato. Com KOF_ANTIGO=<pasta do kofstation-old>, o pacote é criado e
// lido pelo próprio web/guarda.js do antigo e comparado com o novo, nos dois sentidos.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  abrirSave,
  contarSessao,
  criarPacote,
  decidir,
  ehPacote,
  empacotarSave,
  juntarStats,
  lerPacote,
  migrarStats,
  registrarTempo,
  visao,
} from './guarda';

describe('guarda (saves, estatísticas, .kofsave)', () => {
  it('save sem o fim vazio, mesmo hash em qualquer aparelho', async () => {
    const b = new Uint8Array(1024).fill(0xff);
    b.set([1, 2, 3]);
    const r = await empacotarSave(b, { chave: 'sram.X.1', quando: 5 });
    expect(r.cheio).toBe(1024);
    expect(r.hash).toBe((await empacotarSave(b.slice(), {})).hash);
    expect(await abrirSave(r)).toEqual(b);
    expect(decidir(null, r)).toBe('trazer');
    expect(decidir(r, { hash: r.hash })).toBe('igual');
    expect(decidir({ hash: 'a', quando: 9 }, { hash: 'b', quando: 1 })).toBe('manter');
  });
  it('estatísticas por aparelho, somadas e juntadas sem contar em dobro', () => {
    const t = Date.UTC(2026, 9, 31, 15);
    let pc = registrarTempo(null, 'J|1', 'Jogo', 'pc', 60000, t);
    pc = contarSessao(pc, 'J|1', 'Jogo', 'pc', t);
    const cel = registrarTempo(null, 'J|1', 'Jogo', 'cel', 30000, t);
    const junto = juntarStats(pc, cel);
    expect(junto && visao(junto).tempo).toBe(90000);
    expect(junto && visao(juntarStats(junto, cel) ?? junto).tempo).toBe(90000);
    const velho = migrarStats({ tempo: 5000, sessoes: 2, dias: { '2026-10-01': 5000 } }, 'pc', 'J|1', 'Jogo');
    expect(visao(velho).dias['2026-10-01']).toBe(5000);
  });
  it('pacote: blocos binários fora do JSON, ida e volta', async () => {
    const save = await empacotarSave(new Uint8Array([9, 9, 9]), { chave: 'sram.A.3', quando: 1 });
    const p = await criarPacote({ versao: 1, saves: [save], config: { tema: 'cafe' }, estados: [] });
    expect(ehPacote(p)).toBe(true);
    const de = await lerPacote<{ saves: { dados: Uint8Array }[]; config: unknown }>(p);
    expect(de.saves[0]?.dados).toEqual(save.dados);
    expect(de.config).toEqual({ tema: 'cafe' });
  });
  it.skipIf(!process.env.KOF_ANTIGO)('mesmo formato do guarda.js do antigo, nos dois sentidos', async () => {
    const ctx: Record<string, unknown> = {
      Uint8Array,
      Uint32Array,
      DataView,
      TextEncoder,
      TextDecoder,
      Blob,
      Response,
      CompressionStream,
      DecompressionStream,
      JSON,
      Date,
      Object,
      String,
      Math,
    };
    vm.createContext(ctx);
    vm.runInContext(
      readFileSync(join(process.env.KOF_ANTIGO ?? '', 'web/guarda.js'), 'utf8') + ';this.KofGuarda=KofGuarda',
      ctx,
    );
    const A = ctx.KofGuarda as {
      empacotarSave: (b: Uint8Array, e: object) => Promise<{ hash: string; cheio: number; dados: Uint8Array }>;
      abrirSave: (r: object) => Promise<Uint8Array>;
      criarPacote: (c: unknown) => Promise<Uint8Array>;
      lerPacote: (u: Uint8Array) => Promise<{ saves: { hash: string }[]; config: unknown }>;
    };
    const bruto = new Uint8Array(8192).fill(0xff);
    bruto.set([1, 2, 3, 4, 5], 100);
    const dele = await A.empacotarSave(bruto, { chave: 'sram.T.8192', quando: 7 });
    const nosso = await empacotarSave(bruto, { chave: 'sram.T.8192', quando: 7 });
    expect(nosso.hash).toBe(dele.hash);
    expect(await abrirSave(dele)).toEqual(bruto);
    expect(await A.abrirSave(nosso)).toEqual(bruto);
    const pacoteAntigo = await A.criarPacote({ versao: 1, saves: [dele], config: { tema: 'mocha' }, estados: [] });
    const lido = await lerPacote<{ saves: { hash: string; dados: Uint8Array }[]; config: unknown }>(pacoteAntigo);
    expect(lido.saves[0]?.hash).toBe(dele.hash);
    expect(lido.config).toEqual({ tema: 'mocha' });
    const pacoteNovo = await criarPacote({ versao: 1, saves: [nosso], config: { tema: 'latte' }, estados: [] });
    const lidoAntigo = await A.lerPacote(pacoteNovo);
    expect(lidoAntigo.saves[0]?.hash).toBe(nosso.hash);
    expect(lidoAntigo.config).toEqual({ tema: 'latte' });
  });
});
