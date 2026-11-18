import { describe, expect, it, vi } from 'vitest';
import type { Backend } from './backend';
import { EscritorDeGravacao } from './gravacao';

function backendFalso(falharNo = -1) {
  const pedidos: { cmd: string; args: Record<string, unknown>; n: number }[] = [];
  let i = 0;
  const b: Backend = {
    chamar: <T>(cmd: string, args?: Record<string, unknown>) => {
      pedidos.push({ cmd, args: args ?? {}, n: 0 });
      return Promise.resolve({ path: 'Gravações/' + String(args?.nome) } as T);
    },
    lerBinario: () => Promise.resolve(new Uint8Array()),
    enviarBinario: async <T>(cmd: string, args: Record<string, unknown>, dados: Uint8Array) => {
      // o primeiro pedaço demora mais: a ordem tem que ficar mesmo assim
      await new Promise((r) => setTimeout(r, i === 0 ? 20 : 0));
      if (i++ === falharNo) throw new Error('disco cheio');
      pedidos.push({ cmd, args, n: dados.length });
      return {} as T;
    },
  };
  return { b, pedidos };
}

describe('EscritorDeGravacao', () => {
  it('manda os pedaços em ordem, com o offset certo, e fecha', async () => {
    const { b, pedidos } = backendFalso();
    const e = new EscritorDeGravacao(b, 'x.mp4', () => undefined);
    e.anexar(new Blob([new Uint8Array(3)]));
    e.anexar(new Blob([new Uint8Array(5)]));
    e.anexar(new Blob([new Uint8Array(2)]));
    expect(await e.fechar()).toBe('Gravações/x.mp4');
    expect(pedidos.map((p) => [p.cmd, p.args.offset, p.n])).toEqual([
      ['gravacao.parte', 0, 3],
      ['gravacao.parte', 3, 5],
      ['gravacao.parte', 8, 2],
      ['gravacao.fim', undefined, 0],
    ]);
    expect(e.bytes).toBe(10);
  });

  it('um pedaço falhou: avisa uma vez, para de mandar e o fechar dá o erro', async () => {
    const { b, pedidos } = backendFalso(1);
    const aviso = vi.fn();
    const e = new EscritorDeGravacao(b, 'x.mp4', aviso);
    for (let k = 0; k < 4; k++) e.anexar(new Blob([new Uint8Array(1)]));
    await expect(e.fechar()).rejects.toThrow('disco cheio');
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(pedidos).toHaveLength(1);
  });

  it('nada gravado: não cria arquivo vazio', async () => {
    const { b, pedidos } = backendFalso();
    await expect(new EscritorDeGravacao(b, 'x.mp4', () => undefined).fechar()).rejects.toThrow('vazia');
    expect(pedidos).toHaveLength(0);
  });
});
