import { describe, expect, it } from 'vitest';
import { armazemDeMemoria } from './teste-memoria';
import { assentarRascunhos, lerSaveDoJogo, rascunharSave, type Rascunhos } from './bateria';
import { lerSaveGuardado } from './saves';

function rascunhos(): Rascunhos {
  const m = new Map<string, string>();
  return {
    ler: (k) => m.get(k) ?? null,
    gravar: (k, t) => void m.set(k, t),
    apagar: (k) => void m.delete(k),
    chaves: () => [...m.keys()],
  };
}

describe('save de bateria', () => {
  it('rascunho na hora, assentado na loja depois, anterior guardado', async () => {
    const arm = armazemDeMemoria();
    const r = rascunhos();
    const b = new Uint8Array(32768).fill(0xff);
    b[0] = 7;
    rascunharSave(r, 'sram.X.1', b);
    expect(await lerSaveDoJogo(arm, r, 'sram.X.1')).toEqual(b);
    expect(await assentarRascunhos(arm, r, 'pc')).toBe(1);
    expect(r.chaves()).toEqual([]);
    expect(await lerSaveDoJogo(arm, r, 'sram.X.1')).toEqual(b);
    const b2 = b.slice();
    b2[1] = 8;
    rascunharSave(r, 'sram.X.1', b2);
    await assentarRascunhos(arm, r, 'pc');
    const s = await lerSaveGuardado(arm, 'sram.X.1');
    expect(s?.anterior?.hash).toBeTruthy();
    expect(await lerSaveDoJogo(arm, r, 'sram.X.1')).toEqual(b2);
  });
});
