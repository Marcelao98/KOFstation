// Gera referencia.json rodando o adaptador do APP ANTIGO (web/nucleo.js do kofstation-old) com os mesmos núcleos.
// Só roda com KOF_ANTIGO=<pasta do kofstation-old>:  KOF_ANTIGO=~/kofstation-old pnpm --filter @kof/engine test
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PASTA_NUCLEOS } from './nucleo-node';
import { botoesNoQuadro, CASOS, Hasher, hash, MARCAS, QUADROS, type Resultado } from './roms';

const antigo = process.env.KOF_ANTIGO;

interface Consolinho {
  pad: number[];
  runFrame(): void;
  rgba: Uint32Array;
  largura: number;
  altura: number;
  fps: number;
  taxaAudio: number;
  apu: { dsp: { outBuf: Int16Array; outCount: number } };
}

describe.skipIf(!antigo)('referência do app antigo', () => {
  it('gera referencia.json', async () => {
    const ctx: Record<string, unknown> = {
      console,
      setTimeout,
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
      module: { exports: {} },
    };
    vm.createContext(ctx);
    const carregar = (f: string) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
    for (const f of readdirSync(PASTA_NUCLEOS)) if (f.endsWith('.js')) carregar(join(PASTA_NUCLEOS, f));
    carregar(join(antigo as string, 'web/estado.js'));
    vm.runInContext('globalThis.KofEstado = KofEstado;', ctx);
    carregar(join(antigo as string, 'web/nucleo.js'));
    vm.runInContext('globalThis.KofLibretro = KofLibretro;', ctx);
    const K = ctx.KofLibretro as { criar(rom: Uint8Array, nome: string): Promise<Consolinho> };
    const ref: Record<string, Resultado> = {};
    for (const c of CASOS) {
      const s = await K.criar(c.rom(), c.arquivo);
      const som = new Hasher();
      const quadros: Record<string, string> = {};
      for (let i = 0; i < QUADROS; i++) {
        s.pad[0] = botoesNoQuadro(i);
        s.runFrame();
        const d = s.apu.dsp;
        const a = d.outBuf.slice(0, d.outCount);
        som.add(new Uint8Array(a.buffer));
        d.outCount = 0;
        if (MARCAS.includes(i)) quadros[i] = hash(new Uint8Array(s.rgba.buffer));
      }
      ref[c.sistema] = {
        largura: s.largura,
        altura: s.altura,
        fps: +s.fps.toFixed(3),
        taxaAudio: Math.round(s.taxaAudio),
        quadros,
        som: som.valor,
        amostras: som.n / 2,
      };
    }
    writeFileSync(new URL('./referencia.json', import.meta.url), JSON.stringify(ref, null, 2) + '\n');
    expect(Object.keys(ref)).toHaveLength(CASOS.length);
  }, 60_000);
});
