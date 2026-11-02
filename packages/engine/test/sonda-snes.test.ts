// M11b N.4: o Snes9x com a sonda (tools/remendos/snes9x-sonda.patch) toca IGUAL ao Snes9x publicado do antigo (mesmo
// .spc, som byte a byte) e entrega a onda de cada uma das 8 vozes (a jukebox mostra Ondas e Notas) e o mudo por voz.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro, type FabricaDeNucleo } from '../src/libretro';
import { Musica } from '../src/musica';
import { estadoDoSpc, romQuieta } from '../src/spc';
import { fabricaDoArquivo, PASTA_NUCLEOS } from './nucleo-node';
import { spcDeTeste } from './roms';

const PUBLICADO = `${PASTA_NUCLEOS}snes9x.js`;
const COM_SONDA = fileURLToPath(new URL('../../../third_party/cores/wasm/snes9x-sonda.js', import.meta.url));
const tem = existsSync(PUBLICADO) && existsSync(COM_SONDA);

async function tocar(fabrica: FabricaDeNucleo, quadros: number) {
  const s = new SessaoLibretro('snes');
  await s.iniciar(fabrica);
  s.carregar(romQuieta());
  for (let i = 0; i < 5; i++) s.rodarSoSom();
  s.carregarEstado(estadoDoSpc(spcDeTeste(), s.salvarEstado()));
  const som: number[] = [];
  for (let q = 0; q < quadros; q++) som.push(...s.rodarSoSom());
  return { s, som };
}

describe.skipIf(!tem)('Snes9x com sonda', () => {
  it('o som sai byte a byte igual ao Snes9x publicado do antigo', async () => {
    const a = await tocar(fabricaDoArquivo(PUBLICADO, 'snes9x'), 60);
    const b = await tocar(fabricaDoArquivo(COM_SONDA, 'snes9x'), 60);
    expect(a.som.length).toBeGreaterThan(30000);
    expect(b.som).toEqual(a.som);
    expect(a.s.modulo._lr_canais?.() ?? 0).toBe(0); // o publicado não tem sonda
    expect(b.s.modulo._lr_canais?.()).toBe(8);
  });

  it('ondas: a voz 0 tem a quadrada, as outras 7 em silêncio; mudo cala só ela', async () => {
    const fab = fabricaDoArquivo(COM_SONDA, 'snes9x');
    const m = await Musica.abrir({ sistema: 'snes', spc: spcDeTeste() }, fab);
    expect(m.temOndas).toBe(true);
    expect(m.canais).toBe(8);
    expect(m.taxaOnda).toBe(32000);
    for (let i = 0; i < 20; i++) m.quadro();
    const ondas = m.ondas();
    const tam = ondas.length / 8;
    const voz = (v: number) => [...ondas.subarray(v * tam, (v + 1) * tam)];
    const v0 = voz(0);
    expect(Math.max(...v0)).toBeGreaterThan(4000);
    expect(Math.min(...v0)).toBeLessThan(-4000);
    for (let v = 1; v < 8; v++) expect(voz(v).every((x) => x === 0)).toBe(true);
    const niveis = m.niveis(ondas);
    expect(niveis[0]).toBeGreaterThan(0.5); // ENVX da voz 0 (as barras)

    m.mudar(1); // voz 0 muda: silêncio na saída, mas a onda continua na sonda (a jukebox mostra a voz calada)
    for (let i = 0; i < 5; i++) m.quadro(); // o som já gerado antes do mudo (buffer do Snes9x) sai primeiro
    let pico = 0;
    for (let i = 0; i < 10; i++) for (const x of m.quadro()) pico = Math.max(pico, Math.abs(x));
    expect(pico).toBeLessThan(5);
    expect(Math.max(...[...m.ondas()].slice(0, tam))).toBeGreaterThan(4000);
    m.mudar(0);
    for (let i = 0; i < 5; i++) m.quadro();
    pico = 0;
    for (let i = 0; i < 10; i++) for (const x of m.quadro()) pico = Math.max(pico, Math.abs(x));
    expect(pico).toBeGreaterThan(1000);
  });
});
