// M5.2: um savestate feito pelo app ANTIGO (KofEstado.capturar do web/estado.js + web/nucleo.js) abre no app novo e o
// jogo continua igual, quadro a quadro — e o do novo abre no antigo. Só com KOF_ANTIGO=<pasta do kofstation-old>.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { botoesNoQuadro, CASOS, hash } from './roms';

const antigo = process.env.KOF_ANTIGO;

interface Consolinho {
  pad: number[];
  runFrame(): void;
  rgba: Uint32Array;
  apu: { dsp: { outCount: number } };
}
interface EstadoAntigo {
  lr: string;
  d: string;
  s9x?: number;
}

describe.skipIf(!antigo)('savestate entre o antigo e o novo', () => {
  it('estado do antigo abre no novo e vice-versa, com a mesma imagem depois', async () => {
    const ctx: Record<string, unknown> = {
      console,
      setTimeout,
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
      btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
      module: { exports: {} },
    };
    vm.createContext(ctx);
    const carregar = (f: string) => vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
    for (const f of readdirSync(PASTA_NUCLEOS)) if (f.endsWith('.js') && f !== 'jogos.js') carregar(join(PASTA_NUCLEOS, f));
    carregar(join(antigo as string, 'web/estado.js'));
    vm.runInContext('globalThis.KofEstado = KofEstado;', ctx);
    carregar(join(antigo as string, 'web/nucleo.js'));
    vm.runInContext('globalThis.KofLibretro = KofLibretro;', ctx);
    const K = ctx.KofLibretro as { criar(rom: Uint8Array, nome: string): Promise<Consolinho> };
    const E = ctx.KofEstado as { capturar(s: Consolinho): EstadoAntigo; restaurar(s: Consolinho, o: EstadoAntigo): void };
    for (const c of CASOS) {
      const velho = await K.criar(c.rom(), c.arquivo);
      for (let i = 0; i < 30; i++) {
        velho.pad[0] = botoesNoQuadro(i);
        velho.runFrame();
        velho.apu.dsp.outCount = 0;
      }
      const est = E.capturar(velho);
      const rodarVelho = () => {
        for (let i = 30; i < 50; i++) {
          velho.pad[0] = botoesNoQuadro(i);
          velho.runFrame();
          velho.apu.dsp.outCount = 0;
        }
        return hash(new Uint8Array(velho.rgba.buffer));
      };
      const esperado = rodarVelho();
      // novo: abre o mesmo jogo, carrega o estado do antigo e roda os mesmos quadros
      const novo = new SessaoLibretro(c.sistema);
      await novo.iniciar(fabricaNode(novo.config.nucleo));
      novo.carregar(c.rom());
      expect(est.lr, c.sistema).toBe(novo.config.nucleo);
      novo.carregarEstado(new Uint8Array(Buffer.from(est.d, 'base64')));
      const rodarNovo = () => {
        for (let i = 30; i < 50; i++) {
          novo.pad[0] = botoesNoQuadro(i);
          novo.rodar();
        }
        return hash(new Uint8Array(novo.quadro.buffer));
      };
      expect(rodarNovo(), `${c.sistema}: antigo → novo`).toBe(esperado);
      // e o contrário: estado do novo no antigo
      novo.carregarEstado(new Uint8Array(Buffer.from(est.d, 'base64')));
      const doNovo = { lr: novo.config.nucleo, d: Buffer.from(novo.salvarEstado()).toString('base64') };
      E.restaurar(velho, doNovo);
      expect(rodarVelho(), `${c.sistema}: novo → antigo`).toBe(esperado);
    }
  }, 120_000);
});
