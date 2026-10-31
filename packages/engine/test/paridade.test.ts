// M2.1: o adaptador novo (SessaoLibretro) dá a MESMA imagem e o MESMO som que o adaptador do app antigo
// (web/nucleo.js), quadro a quadro, com os mesmos núcleos, ROMs e botões. A referência do antigo está em
// referencia.json (gerada por gerar-referencia.test.ts com KOF_ANTIGO=<pasta do kofstation-old>).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SistemaId } from '@kof/domain';
import { SessaoLibretro } from '../src/libretro';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { botoesNoQuadro, CASOS, Hasher, hash, MARCAS, QUADROS, type Resultado } from './roms';

export async function rodarNovo(sistema: SistemaId, rom: Uint8Array): Promise<Resultado> {
  const s = new SessaoLibretro(sistema);
  await s.iniciar(fabricaNode(s.config.nucleo));
  const info = s.carregar(rom);
  const som = new Hasher();
  const quadros: Record<string, string> = {};
  for (let i = 0; i < QUADROS; i++) {
    s.pad[0] = botoesNoQuadro(i);
    const { audio } = s.rodar();
    som.add(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength));
    if (MARCAS.includes(i)) quadros[i] = hash(new Uint8Array(s.quadro.buffer));
  }
  return {
    largura: s.info.largura,
    altura: s.info.altura,
    fps: +info.fps.toFixed(3),
    taxaAudio: Math.round(info.taxaAudio),
    quadros,
    som: som.valor,
    amostras: som.n / 2,
  };
}

const REF = new URL('./referencia.json', import.meta.url);
const temNucleos = existsSync(`${PASTA_NUCLEOS}snes9x.js`);

describe.skipIf(!temNucleos)('paridade com o adaptador do app antigo', () => {
  const ref = JSON.parse(readFileSync(REF, 'utf8')) as Record<string, Resultado>;
  for (const c of CASOS)
    it(`${c.sistema}: mesma imagem e mesmo som em ${QUADROS} quadros`, async () => {
      const novo = await rodarNovo(c.sistema, c.rom());
      expect(novo).toEqual(ref[c.sistema]);
      expect(novo.amostras).toBeGreaterThan(0);
    }, 30_000);
});
