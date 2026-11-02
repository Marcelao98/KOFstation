// M10.4: o pacote do caçador de bugs reproduz quadro a quadro (mesma assinatura da imagem).
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assinaturaDoQuadro, reproduzir } from '../src/bug';
import { SessaoLibretro } from '../src/libretro';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { botoesNoQuadro, romMd } from './roms';

const b64 = (u8: Uint8Array) => Buffer.from(u8).toString('base64');

describe.skipIf(!existsSync(`${PASTA_NUCLEOS}genplus.js`))('caçador de bugs', () => {
  it('estado do marco + botões = a mesma imagem', async () => {
    const s = new SessaoLibretro('md');
    await s.iniciar(fabricaNode('genplus'));
    s.carregar(romMd());
    for (let i = 0; i < 20; i++) s.rodar();
    const estado = s.salvarEstado();
    const entradas: number[] = [];
    for (let i = 0; i < 120; i++) {
      const b = botoesNoQuadro(i);
      entradas.push(b);
      s.pad[0] = b;
      s.rodar();
    }
    const replay = {
      estado: b64(estado),
      entradas: b64(new Uint8Array(Uint16Array.from(entradas).buffer)),
      quadros: entradas.length,
      agora: { estado: b64(s.salvarEstado()), assinatura: assinaturaDoQuadro(s.quadro, entradas.length) },
    };
    const outra = new SessaoLibretro('md');
    await outra.iniciar(fabricaNode('genplus'));
    outra.carregar(romMd());
    expect(reproduzir(outra, replay).igual).toBe(true);
  });
});
