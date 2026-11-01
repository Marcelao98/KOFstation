import { describe, expect, it } from 'vitest';
import { montarArquivos } from './kofgames';

describe('arquivos da Kof Games', () => {
  it('sistema, faixas do CD e variantes como no lerPasta do antigo', () => {
    const l = montarArquivos([
      { path: 'Games/psx/Jogo.cue', size: 100, modified: 1 },
      { path: 'Games/psx/Jogo (Track 1).bin', size: 400 << 20, modified: 1 },
      { path: 'Games/psx/Outro (Track 2).bin', size: 10, modified: 1 },
      { path: 'Games/snes/Mario [h1].sfc', size: 10, modified: 1 },
      { path: 'Games/Mario.zip', size: 10, modified: 1, zip: [{ nome: 'Mario.nes', tamanho: 9, crc: 'aa' }] },
    ]);
    expect(l.map((a) => [a.sistema, a.faixa, a.variante])).toEqual([
      ['ps1', false, false],
      ['ps1', true, false],
      ['md', true, false],
      ['snes', false, true],
      ['nes', false, false],
    ]);
    expect(l[3]?.chave).toBe('mario h1');
    expect(l[4]?.ext).toBe('ZIP');
  });
});
