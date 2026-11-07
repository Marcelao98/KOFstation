// O CD de PS1 que vai pro núcleo nativo não passa inteiro pela página: só a cabeça (o .cue ou 64 KB da imagem).
import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { identidade, cabecaDoCd } from './jogos';

/** Backend falso: guarda quanto cada file.read pediu. */
function backend(arquivos: Record<string, Uint8Array>) {
  const pedidos: { path: string; length?: number }[] = [];
  const b: Backend = {
    chamar: () => Promise.reject(new Error('não usado')),
    enviarBinario: () => Promise.reject(new Error('não usado')),
    lerBinario: (_cmd, a) => {
      const path = String(a?.path);
      const length = a?.length as number | undefined;
      pedidos.push({ path, ...(length !== undefined ? { length } : {}) });
      const d = arquivos[path] ?? new Uint8Array(0);
      return Promise.resolve(d.subarray(Number(a?.offset ?? 0), length === undefined ? undefined : length));
    },
  };
  return { b, pedidos };
}

/** Começo de um CD cru (setor 00 FF×10 00, modo 2). */
function setorCru(n: number): Uint8Array {
  const u = new Uint8Array(n);
  u.set([0, ...Array(10).fill(0xff), 0], 0);
  u[15] = 2;
  return u;
}

describe('cabeça do CD de PS1', () => {
  it('.chd/.iso grande: pede só 64 KB, guarda o tamanho de verdade (a chave do save não muda)', async () => {
    const { b, pedidos } = backend({ 'Games/psx/Jogo.iso': setorCru(0x20000) });
    const j = await cabecaDoCd(b, 'Games/psx/Jogo.iso', 700 << 20);
    expect(j?.sistema).toBe('ps1');
    expect(j?.parcial).toBe(true);
    expect(j?.tamanho).toBe(700 << 20);
    expect(pedidos).toEqual([{ path: 'Games/psx/Jogo.iso', length: 64 << 10 }]);
    // mesma identidade que lendo inteiro: nome + tamanho
    expect(identidade('ps1', j?.rom ?? new Uint8Array(0), 'Jogo', j?.tamanho).id).toBe(
      identidade('ps1', new Uint8Array(700 << 20), 'Jogo').id,
    );
  });

  it('.cue: lê o .cue inteiro (pequeno) e não toca nos .bin', async () => {
    const cue = new TextEncoder().encode('FILE "Jogo.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n');
    const { b, pedidos } = backend({ 'Games/psx/Jogo.cue': cue });
    const j = await cabecaDoCd(b, 'Games/psx/Jogo.cue', cue.length);
    expect(j?.sistema).toBe('ps1');
    expect(j?.parcial).toBeUndefined();
    expect(pedidos.map((p) => p.path)).toEqual(['Games/psx/Jogo.cue']);
  });

  it('.bin de Mega Drive não é CD: volta null (lê do jeito normal)', async () => {
    const { b } = backend({ 'Games/megadrive/Sonic.bin': new Uint8Array(0x10000) });
    expect(await cabecaDoCd(b, 'Games/megadrive/Sonic.bin', 0x10000)).toBeNull();
  });
});
