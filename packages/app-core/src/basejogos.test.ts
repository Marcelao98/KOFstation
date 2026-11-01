// A base de jogos de verdade (apps/desktop/public/nucleos/jogos.js, baixada pelo `pnpm nucleos`) dá as mesmas respostas
// que o KofJogos do antigo. Com KOF_ANTIGO=<pasta do kofstation-old>, compara nome por nome com o código antigo.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { consulta, juntarItens, passa, type ArquivoDaPasta } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import { abrirBaseDeJogos } from './basejogos';

const ARQ = join(__dirname, '../../../apps/desktop/public/nucleos/jogos.js');
const tem = existsSync(ARQ);

const NOMES: [string, string][] = [
  ['snes', 'Super Mario World (USA)'],
  ['snes', 'Legend of Zelda, The - A Link to the Past (USA)'],
  ['snes', 'Chrono Trigger (USA)'],
  ['md', 'Sonic the Hedgehog (USA, Europe)'],
  ['nes', 'Super Mario Bros. 3 (USA)'],
  ['gb', 'Tetris (World) (Rev 1)'],
  ['gbc', 'Pokemon - Crystal Version (USA, Europe)'],
  ['gba', 'Metroid Fusion (USA)'],
  ['neogeo', 'kof98'],
  ['neogeo', 'mslug'],
  ['snes', 'Jogo Que Não Existe (Brasil)'],
];

describe.skipIf(!tem)('base de jogos', () => {
  it('acha pelo título, pelo artigo e pelo set do Neo Geo', async () => {
    const base = await abrirBaseDeJogos(readFileSync(ARQ, 'utf8'));
    const smw = base.info('snes', 'Super Mario World (USA)');
    expect(smw?.titulo).toMatch(/Mario World/);
    expect(smw?.ano).toBeGreaterThan(1989);
    expect(base.info('snes', 'Legend of Zelda, The - A Link to the Past (USA)')?.titulo).toMatch(/Zelda/);
    expect(base.info('neogeo', 'kof98')?.sistema).toBe('neogeo');
    expect(base.info('snes', 'Jogo Que Não Existe')).toBe(null);
    // busca com campo:valor e texto livre sobre a base
    const pasta = (nome: string): ArquivoDaPasta => ({
      path: `Games/snes/${nome}.sfc`,
      nome,
      arquivo: nome + '.sfc',
      ext: 'SFC',
      sistema: 'snes',
      chave: nome.toLowerCase(),
      variante: false,
      faixa: false,
      tamanho: 1,
    });
    const itens = juntarItens([], [pasta('Super Mario World (USA)'), pasta('Chrono Trigger (USA)')]);
    const achados = (t: string) => itens.filter((r) => passa(r, consulta(t), {}, base)).map((r) => r.nome);
    expect(achados('empresa:square')).toEqual(['Chrono Trigger (USA)']);
    expect(achados('nintendo plataforma')).toEqual(['Super Mario World (USA)']);
    expect(achados('ano:199')).toHaveLength(2);
    expect(achados('console:snes')).toHaveLength(2);
  });

  it.skipIf(!process.env.KOF_ANTIGO)('mesma resposta que o KofJogos do antigo', async () => {
    const base = await abrirBaseDeJogos(readFileSync(ARQ, 'utf8'));
    const web = join(process.env.KOF_ANTIGO ?? '', 'web');
    const ctx: Record<string, unknown> = { atob, DecompressionStream, Response, Blob, console, document: undefined };
    ctx.KofLibretro = { ARQUIVOS: { jogos: 'x' } };
    vm.createContext(ctx);
    vm.runInContext(readFileSync(join(web, 'neogeo-jogos.js'), 'utf8') + ';this.KofNeoGeoJogos=KofNeoGeoJogos', ctx);
    vm.runInContext(readFileSync(ARQ, 'utf8') + ';this.KofJogosDb=KofJogosDb', ctx);
    vm.runInContext(readFileSync(join(web, 'jogos.js'), 'utf8') + ';this.KofJogos=KofJogos', ctx);
    // o carregar() do antigo põe um <script>: aqui o KofJogosDb já está no contexto, então simula o onload
    (ctx as { document: unknown }).document = {
      createElement: () => ({}) as Record<string, unknown>,
      head: { appendChild: (s: { onload: () => void }) => s.onload() },
    };
    const antigo = ctx.KofJogos as { carregar(): Promise<boolean>; info(s: string, n: string): unknown };
    expect(await antigo.carregar()).toBe(true);
    for (const [s, n] of NOMES) expect(base.info(s as 'snes', n), n).toEqual(antigo.info(s, n));
  });
});
