import { describe, expect, it } from 'vitest';
import { bytesDoCapturado, capturado, estadosDe, guardarEstado, lerEstado, limitarEstados } from './estados';
import { armazemDeMemoria } from './teste-memoria';

describe('savestates (formato do antigo)', () => {
  it('capturado = {s9x, lr, d} no Snes9x e {lr, d} nos outros; outro núcleo é recusado', () => {
    const e = new Uint8Array([1, 2, 255]);
    expect(capturado('snes9x', e)).toEqual({ s9x: 1, lr: 'snes9x', d: 'AQL/' });
    expect(capturado('gambatte', e)).toEqual({ lr: 'gambatte', d: 'AQL/' });
    expect(bytesDoCapturado(capturado('gambatte', e), 'gambatte')).toEqual(e);
    expect(() => bytesDoCapturado(capturado('gambatte', e), 'mgba')).toThrow('outro núcleo');
    expect(() => bytesDoCapturado({ d: 'AA==' }, 'snes9x')).toThrow('Kof');
  });
  it('guarda, lista do mais novo pro mais velho e respeita o limite', async () => {
    const arm = armazemDeMemoria();
    for (const q of [1, 2, 3])
      await guardarEstado(arm, { jogo: 'J|1', nome: 'J', quando: q }, 'fceumm', new Uint8Array([q]));
    await guardarEstado(arm, { jogo: 'K|2', nome: 'K', quando: 9 }, 'fceumm', new Uint8Array([9]));
    expect((await estadosDe(arm, 'J|1')).map((e) => e.quando)).toEqual([3, 2, 1]);
    expect(await limitarEstados(arm, 'J|1', 2)).toBe(1);
    expect((await estadosDe(arm, 'J|1')).map((e) => e.quando)).toEqual([3, 2]);
    expect(bytesDoCapturado(await lerEstado(arm, 'J|1/3'), 'fceumm')).toEqual(new Uint8Array([3]));
    expect((await estadosDe(arm)).length).toBe(3);
  });
});
