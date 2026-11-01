// M6.1: rebobinar volta bit a bit (cada passo pra trás é exatamente o estado daquele momento) e faz o mesmo que o
// Rebobinador do app antigo (com KOF_ANTIGO, roda os dois lado a lado e compara cada estado restaurado).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { Rebobinador } from '../src/rebobinador';
import { fabricaNode } from './nucleo-node';
import { PASTA_NUCLEOS } from './nucleo-node';
import { botoesNoQuadro, CASOS } from './roms';

const h = (u: Uint8Array) => createHash('sha1').update(u).digest('hex');

describe('rebobinar', () => {
  for (const c of CASOS)
    it(`${c.sistema}: cada passo pra trás é o estado salvo naquele quadro`, async () => {
      const s = new SessaoLibretro(c.sistema);
      await s.iniciar(fabricaNode(s.config.nucleo));
      s.carregar(c.rom());
      // o que o rebobinador põe no núcleo tem que ser, byte a byte, o estado daquele momento
      let carregado = '';
      const fonte = {
        estadoVivo: () => s.estadoVivo(),
        carregarEstado: (e: Uint8Array) => {
          carregado = h(e);
          s.carregarEstado(e);
        },
        get tamEstado() {
          return s.tamEstado;
        },
      };
      const r = new Rebobinador(fonte, 48 << 20, 5 * 30);
      const marcas: string[] = [];
      for (let i = 0; i < 60; i++) {
        s.pad[0] = botoesNoQuadro(i);
        s.rodar();
        if (i % 2 === 1) {
          r.gravar();
          marcas.push(h(s.salvarEstado()));
        }
      }
      // a última gravada é a cabeça: voltar devolve as anteriores em ordem
      for (let k = marcas.length - 2; k >= 0; k--) {
        expect(r.voltar()).toBe(true);
        expect(carregado, `foto ${k}`).toBe(marcas[k]);
      }
      expect(r.voltar()).toBe(false);
    });

  it.skipIf(!process.env.KOF_ANTIGO)(
    'igual ao Rebobinador do antigo',
    async () => {
      const antigo = process.env.KOF_ANTIGO as string;
      const ctx: Record<string, unknown> = {
        console,
        setTimeout,
        atob: (x: string) => Buffer.from(x, 'base64').toString('binary'),
        btoa: (x: string) => Buffer.from(x, 'binary').toString('base64'),
        module: { exports: {} },
      };
      vm.createContext(ctx);
      const carregar = (f: string) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
      for (const f of readdirSync(PASTA_NUCLEOS))
        if (f.endsWith('.js') && f !== 'jogos.js') carregar(join(PASTA_NUCLEOS, f));
      carregar(join(antigo, 'web/estado.js'));
      vm.runInContext('globalThis.KofEstado = KofEstado;', ctx);
      carregar(join(antigo, 'web/nucleo.js'));
      vm.runInContext('globalThis.KofLibretro = KofLibretro;', ctx);
      type C = { pad: number[]; runFrame(): void; serializar(): Uint8Array; apu: { dsp: { outCount: number } } };
      const K = ctx.KofLibretro as { criar(rom: Uint8Array, nome: string): Promise<C> };
      const E = ctx.KofEstado as { Rebobinador(s: C, lim: number, max: number): { gravar(): void; voltar(): boolean } };
      for (const c of CASOS) {
        const velho = await K.criar(c.rom(), c.arquivo);
        const rv = E.Rebobinador(velho, 48 << 20, 20);
        const novo = new SessaoLibretro(c.sistema);
        await novo.iniciar(fabricaNode(novo.config.nucleo));
        novo.carregar(c.rom());
        const rn = new Rebobinador(novo, 48 << 20, 20);
        for (let i = 0; i < 80; i++) {
          velho.pad[0] = novo.pad[0] = botoesNoQuadro(i);
          velho.runFrame();
          velho.apu.dsp.outCount = 0;
          novo.rodar();
          if (i % 2) {
            rv.gravar();
            rn.gravar();
          }
        }
        for (let k = 0; k < 25; k++) {
          expect(rn.voltar(), `${c.sistema} passo ${k}`).toBe(rv.voltar());
          expect(h(novo.salvarEstado()), `${c.sistema} passo ${k}`).toBe(h(velho.serializar()));
        }
      }
    },
    120_000,
  );
});
