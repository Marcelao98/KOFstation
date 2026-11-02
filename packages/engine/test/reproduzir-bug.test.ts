// Reproduz um pacote do caçador de bugs (kofbug-*.json.gz) com a SUA ROM (a ROM não vai no pacote). Não roda no
// `pnpm test`: só pelo `pnpm bug <pacote> <rom>` (tools/reproduzir-bug.mjs), que passa os dois por variável de ambiente.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { reproduzir } from '../src/bug';
import { SessaoLibretro } from '../src/libretro';
import type { ReplayDoBug } from '../src/mensagens';
import { fabricaNode } from './nucleo-node';
import type { SistemaId } from '@kof/domain';

const { KOF_BUG, KOF_ROM } = process.env;

describe.skipIf(!KOF_BUG || !KOF_ROM)('reproduzir pacote de bug', () => {
  it('chega na mesma imagem', async () => {
    const pac = JSON.parse(gunzipSync(readFileSync(String(KOF_BUG))).toString()) as {
      jogo: { sha1: string; sistema: SistemaId };
      replay: ReplayDoBug;
    };
    const rom = new Uint8Array(readFileSync(String(KOF_ROM)));
    console.log('ROM confere com o pacote:', createHash('sha1').update(rom).digest('hex') === pac.jogo.sha1);
    const s = new SessaoLibretro(pac.jogo.sistema);
    await s.iniciar(fabricaNode(s.config.nucleo));
    s.carregar(rom);
    const r = reproduzir(s, pac.replay);
    console.log(`quadros: ${pac.replay.quadros} · replay ${r.assinatura} · pacote ${pac.replay.agora.assinatura}`);
    expect(r.igual).toBe(true);
  });
});
