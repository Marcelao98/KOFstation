import { describe, expect, it } from 'vitest';
import { dadosDaEntrada, ehZip, listarZip } from './zip';

// zip mínimo com um arquivo guardado (sem compressão): "jogo.nes" = "ABC"
function zipSimples(): Uint8Array {
  const nome = new TextEncoder().encode('jogo.nes');
  const dados = new TextEncoder().encode('ABC');
  const local = new Uint8Array(30 + nome.length + dados.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint32(18, 3, true);
  lv.setUint32(22, 3, true);
  lv.setUint16(26, nome.length, true);
  local.set(nome, 30);
  local.set(dados, 30 + nome.length);
  const central = new Uint8Array(46 + nome.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint32(20, 3, true);
  cv.setUint32(24, 3, true);
  cv.setUint16(28, nome.length, true);
  central.set(nome, 46);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(10, 1, true);
  fv.setUint32(16, local.length, true);
  const z = new Uint8Array(local.length + central.length + fim.length);
  z.set(local);
  z.set(central, local.length);
  z.set(fim, local.length + central.length);
  return z;
}

describe('zip', () => {
  it('lista e lê o arquivo guardado', () => {
    const z = zipSimples();
    expect(ehZip(z)).toBe(true);
    const [e] = listarZip(z);
    expect(e?.nome).toBe('jogo.nes');
    if (!e) throw new Error('sem entrada');
    expect(new TextDecoder().decode(dadosDaEntrada(z, e))).toBe('ABC');
  });
  it('arquivo cortado dá erro claro', () => {
    expect(() => listarZip(zipSimples().subarray(0, 40))).toThrow(/cortado/);
  });
});
