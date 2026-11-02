// M9.2: o .spc toca no Snes9x (entra no bloco SND de um estado) e volta pra .spc; mudo por voz pelas opções do Snes9x.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { ehSpc, estadoDoSpc, etiquetasSpc, montarWav, regsDoDsp, romQuieta, spcDoEstado } from '../src/spc';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';

const tem = existsSync(`${PASTA_NUCLEOS}snes9x.js`);

/** .spc feito aqui: o SPC700 parado num laço e a voz 0 soando uma onda quadrada (BRR) em laço. */
function spcDeTeste(envx = 0x7f): Uint8Array {
  const u8 = new Uint8Array(0x10200);
  const ass = 'SNES-SPC700 Sound File Data v0.30';
  for (let i = 0; i < ass.length; i++) u8[i] = ass.charCodeAt(i);
  u8[0x21] = 26;
  u8[0x22] = 26;
  u8[0x23] = 26;
  u8[0x24] = 30;
  u8.set([0x00, 0x02, 0, 0, 0, 0x02, 0xef], 0x25); // PC = $0200, PSW = Z, SP = $EF
  const tit = 'Quadrada';
  for (let i = 0; i < tit.length; i++) u8[0x2e + i] = tit.charCodeAt(i);
  '090'.split('').forEach((c, i) => (u8[0xa9 + i] = c.charCodeAt(0)));
  '05000'.split('').forEach((c, i) => (u8[0xac + i] = c.charCodeAt(0)));
  const ram = u8.subarray(0x100, 0x10100);
  ram.set([0x2f, 0xfe], 0x200); // BRA $
  ram.set([0x00, 0x04, 0x00, 0x04], 0x300); // diretório: amostra 0 começa e volta em $0400
  ram.set([0xc3, 0x77, 0x77, 0x77, 0x77, 0x88, 0x88, 0x88, 0x88], 0x400); // BRR: fim + laço
  const r = u8.subarray(0x10100, 0x10180);
  r.set([0x7f, 0x7f, 0x00, 0x10, 0x00], 0); // voz 0: volume, tom $1000, amostra 0
  r[0x05] = 0x00; // ADSR desligado
  r[0x07] = 0x7f; // GAIN direto
  r[0x08] = envx; // ENVX: estava soando?
  r[0x0c] = 0x7f;
  r[0x1c] = 0x7f; // volume geral
  r[0x5d] = 0x03; // diretório em $0300
  r[0x6c] = 0x20; // FLG: sem escrever eco
  return u8;
}

async function tocar(
  spc: Uint8Array,
  opcoes: Record<string, string> = {},
): Promise<{ rms: number; s: SessaoLibretro }> {
  const s = new SessaoLibretro('snes');
  await s.iniciar(fabricaNode('snes9x'), opcoes);
  s.carregar(romQuieta());
  for (let i = 0; i < 5; i++) s.rodarSoSom();
  s.carregarEstado(estadoDoSpc(spc, s.salvarEstado()));
  let soma = 0;
  let n = 0;
  for (let q = 0; q < 30; q++) {
    const a = s.rodarSoSom();
    for (let i = 0; i < a.length; i++) soma += (a[i] ?? 0) ** 2;
    n += a.length;
  }
  return { rms: Math.sqrt(soma / Math.max(1, n)), s };
}

describe.skipIf(!tem)('.spc no Snes9x', () => {
  it('etiqueta ID666 e assinatura', () => {
    const u8 = spcDeTeste();
    expect(ehSpc(u8)).toBe(true);
    expect(ehSpc(u8.subarray(0, 100))).toBe(false);
    expect(etiquetasSpc(u8)).toMatchObject({ titulo: 'Quadrada', segundos: 90, fadeMs: 5000 });
  });

  it('a voz que estava soando é religada e toca; sem ela, silêncio', async () => {
    const { rms } = await tocar(spcDeTeste());
    expect(rms).toBeGreaterThan(500);
    const mudo = await tocar(spcDeTeste(0));
    expect(mudo.rms).toBeLessThan(5);
  });

  it('mudo da voz pela opção do Snes9x', async () => {
    const { rms } = await tocar(spcDeTeste(), { snes9x_sndchan_volume_1: '0' });
    expect(rms).toBeLessThan(5);
  });

  it('volta pra .spc com a RAM, os registradores do DSP e a etiqueta', async () => {
    const original = spcDeTeste();
    const { s } = await tocar(original);
    const st = s.salvarEstado();
    expect(regsDoDsp(st)?.[0x08]).toBeGreaterThan(0); // envelope da voz 0 (as barras da jukebox)
    const volta = spcDoEstado(st, { titulo: 'Volta', jogo: 'Teste', segundos: 60, fadeMs: 1000 });
    expect(ehSpc(volta)).toBe(true);
    expect(etiquetasSpc(volta)).toMatchObject({ titulo: 'Volta', jogo: 'Teste', segundos: 60, fadeMs: 1000 });
    expect([...volta.subarray(0x100 + 0x300, 0x100 + 0x409)]).toEqual([
      ...original.subarray(0x100 + 0x300, 0x100 + 0x409),
    ]);
    expect(volta[0x10100 + 0x5d]).toBe(0x03);
  });

  it('.wav: cabeçalho RIFF de 44 bytes', () => {
    const w = montarWav(new Int16Array([1, -1, 2, -2]), 32000);
    expect(w.length).toBe(52);
    expect(String.fromCharCode(...w.subarray(0, 4), ...w.subarray(8, 12))).toBe('RIFFWAVE');
    expect(new DataView(w.buffer).getUint32(24, true)).toBe(32000);
  });
});
