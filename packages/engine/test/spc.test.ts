// M9.2: o .spc toca no Snes9x (entra no bloco SND de um estado) e volta pra .spc; mudo por voz pelas opções do Snes9x.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { ehSpc, estadoDoSpc, etiquetasSpc, montarWav, regsDoDsp, romQuieta, spcDoEstado } from '../src/spc';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { spcDeTeste } from './roms';

const tem = existsSync(`${PASTA_NUCLEOS}snes9x.js`);

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
