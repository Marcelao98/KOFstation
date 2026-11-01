import { describe, expect, it } from 'vitest';
import { planejarOrganizacao, type ItemDoInventario } from './organizar';

const a = (path: string, extra: Partial<ItemDoInventario> = {}): ItemDoInventario => ({
  path,
  nome: path.split('/').pop() ?? path,
  tamanho: 1000,
  ...extra,
});

describe('plano de organização (regra do organizar do antigo)', () => {
  it('soltos, novos, CD inteiro, faixas do .cue e pasta errada', () => {
    const plano = planejarOrganizacao({
      dirs: ['Games/snes', 'Games/gba', 'Games/psx', 'Novos/CD Jogo', 'Novos/coisas', 'Games/minhas'],
      files: [
        a('Games/Zelda.sfc'),
        a('Games/leia-me.txt'),
        a('Games/snes/Mario.sfc'),
        a('Games/gba/Errado.sfc'),
        a('Games/gba/Pokemon.zip', { zip: [{ nome: 'Pokemon.gba', tamanho: 1, crc: '0' }] }),
        a('Novos/Sonic.md'),
        a('Novos/Jogo.cue', { cue: ['Jogo (Track 1).bin'] }),
        a('Novos/Jogo (Track 1).bin', { tamanho: 400 << 20 }),
        a('Novos/CD Jogo/CD.cue', { cue: ['CD.bin'] }),
        a('Novos/CD Jogo/CD.bin'),
        a('Novos/coisas/Tetris.gb'),
        a('Games/minhas/Metroid.gba'),
      ],
    });
    expect(plano.moves).toEqual([
      { from: 'Games/minhas/Metroid.gba', to: 'Games/gba', reason: 'solto' },
      { from: 'Games/Zelda.sfc', to: 'Games/snes', reason: 'solto' },
      { from: 'Novos/CD Jogo', to: 'Games/psx', reason: 'cd' },
      { from: 'Novos/coisas/Tetris.gb', to: 'Games/gb', reason: 'novo' },
      { from: 'Novos/Sonic.md', to: 'Games/megadrive', reason: 'novo' },
      { from: 'Novos/Jogo (Track 1).bin', to: 'Games/psx', reason: 'faixa-do-cd' },
      { from: 'Novos/Jogo.cue', to: 'Games/psx', reason: 'novo' },
      { from: 'Games/gba/Errado.sfc', to: 'Games/snes', reason: 'pasta-errada' },
    ]);
    expect(plano.limpar).toEqual(['Games/minhas', 'Novos/coisas']);
  });
  it('tudo no lugar: plano vazio', () => {
    const p = planejarOrganizacao({ dirs: ['Games/snes'], files: [a('Games/snes/Mario.sfc')] });
    expect(p.moves).toEqual([]);
  });
});
