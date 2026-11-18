import { describe, expect, it } from 'vitest';
import {
  b64,
  bytesDoCapturado,
  capturado,
  capturadoDoTexto,
  deB64,
  estadosDe,
  textoDoCapturado,
  guardarEstado,
  lerEstado,
  limitarEstados,
} from './estados';
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
  it('o texto do estado é o mesmo do JSON.stringify e volta igual (rápido pros estados de dezenas de MB)', () => {
    const grande = Uint8Array.from({ length: 3 * 0x8000 * 2 + 7 }, (_, i) => (i * 131) & 255);
    for (const [nucleo, e] of [
      ['snes9x', new Uint8Array([1, 2, 255])],
      ['pcsx2', grande],
      ['pcsx2', new Uint8Array(0)],
    ] as const) {
      const t = textoDoCapturado(nucleo, e);
      expect(t).toBe(JSON.stringify(capturado(nucleo, e)));
      expect(capturadoDoTexto(t)).toEqual(capturado(nucleo, e));
      expect(deB64(b64(e))).toEqual(e);
    }
    // a volta sem o toBase64 nativo (pedaços múltiplos de 3) dá o mesmo base64
    const semNativo = Object.assign(grande.slice(), { toBase64: undefined });
    expect(b64(semNativo)).toBe(Buffer.from(grande).toString('base64'));
    // outro formato (o d não é o último campo) vai pelo JSON.parse
    expect(capturadoDoTexto('{"d":"AQL/","lr":"x"}')).toEqual({ d: 'AQL/', lr: 'x' });
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

describe('salvar automático: intervalo', () => {
  it('núcleo nativo: no mínimo 2 minutos; o resto, o que a pessoa escolheu (igual ao antigo)', async () => {
    const { autoSegundos } = await import('./estados');
    expect(autoSegundos(30, true)).toBe(120);
    expect(autoSegundos(15, true)).toBe(120);
    expect(autoSegundos(60, true)).toBe(120);
    expect(autoSegundos(30, false)).toBe(30);
    expect(autoSegundos(15, false)).toBe(15);
  });
});
