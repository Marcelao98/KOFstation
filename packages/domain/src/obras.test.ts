import { describe, expect, it } from 'vitest';
import type { ItemBiblioteca, RegistroJogo } from './biblioteca';
import { agruparEmObras, chaveDaVersao, rotulosDoNome, sobreAVersao } from './obras';

const pasta = (nome: string, ext = 'sfc', entrada?: string): ItemBiblioteca => ({
  nome,
  chave: nome.toLowerCase(),
  pasta: {
    path: `Games/snes/${entrada ? 'Varias.zip' : nome + '.' + ext}`,
    nome,
    arquivo: (entrada ?? nome) + '.' + ext,
    ext: ext.toUpperCase(),
    sistema: 'snes',
    chave: nome.toLowerCase(),
    variante: /\[[bh]/.test(nome),
    faixa: false,
    tamanho: 1,
    ...(entrada ? { entrada: entrada + '.' + ext } : {}),
  },
});
const jogado = (nome: string, ultimo: number): ItemBiblioteca => ({
  nome,
  chave: nome.toLowerCase(),
  jogo: { id: nome, nome, arquivo: nome + '.sfc', sistema: 'snes', titulo: nome, tamanho: 1, ultimo } as RegistroJogo,
});

describe('obra × versões (B.1)', () => {
  it('rótulos do nome', () => {
    expect(rotulosDoNome('Super Mario World (USA) (Rev 1) [T+Por]')).toEqual(['USA', 'Rev 1', 'T+Por']);
    expect(rotulosDoNome('Tetris')).toEqual([]);
  });

  it('rótulo e peso de cada versão', () => {
    expect(sobreAVersao('Jogo (USA)')).toMatchObject({ rotulo: 'EUA', pt: false });
    expect(sobreAVersao('Jogo (USA, Europe) (Rev 1)').rotulo).toBe('EUA, Europa · Rev 1');
    expect(sobreAVersao('Jogo (USA) [T+Por by Fulano]')).toMatchObject({
      rotulo: 'EUA · Tradução PT-BR por Fulano',
      pt: true,
    });
    expect(sobreAVersao('Jogo (Japan) [T-Eng]').rotulo).toBe('Japão · Tradução inglês');
    expect(sobreAVersao('Jogo (Brazil) (PT-BR)').pt).toBe(true);
    expect(sobreAVersao('Jogo (U) [!]').rotulo).toBe('EUA');
    expect(sobreAVersao('Jogo (U) [b1]').rotulo).toBe('EUA · cópia ruim');
    expect(sobreAVersao('Jogo (Europe) (Beta)').rotulo).toBe('Europa · Beta');
    expect(sobreAVersao('Jogo (Hack) Kaizo').rotulo).toBe('Hack');
    expect(sobreAVersao('Jogo (Europe) (En,Fr,De)').rotulo).toBe('Europa');
    expect(sobreAVersao('Jogo').rotulo).toBe('Original');
    // a ordem de preferência: tradução PT > Brasil > EUA > Europa > Japão > beta > cópia ruim
    const p = (n: string) => sobreAVersao(n).peso;
    expect(p('J (USA) [T+Por]')).toBeGreaterThan(p('J (Brazil)'));
    expect(p('J (Brazil)')).toBeGreaterThan(p('J (USA)'));
    expect(p('J (USA)')).toBeGreaterThan(p('J (Europe)'));
    expect(p('J (Europe)')).toBeGreaterThan(p('J (Japan)'));
    expect(p('J (USA) (Rev 1)')).toBeGreaterThan(p('J (USA)'));
    expect(p('J (Japan)')).toBeGreaterThan(p('J (USA) (Beta)'));
    expect(p('J (USA) (Beta)')).toBeGreaterThan(p('J (U) [b1]'));
  });

  it('agrupa por console e título; a principal é a de maior peso', () => {
    const l = agruparEmObras([
      pasta('Super Mario World (Japan)'),
      pasta('Super Mario World (USA)'),
      pasta('Super Mario World (Europe) (Rev 1)'),
      pasta('Tetris Attack (USA)'),
    ]);
    expect(l).toHaveLength(2);
    const smw = l.find((r) => r.obra);
    expect(smw?.nome).toBe('Super Mario World (USA)');
    expect(smw?.obra?.titulo).toBe('Super Mario World');
    expect(smw?.obra?.versoes.map((v) => v.nome)).toEqual([
      'Super Mario World (USA)',
      'Super Mario World (Europe) (Rev 1)',
      'Super Mario World (Japan)',
    ]);
    expect(l.find((r) => r.nome.startsWith('Tetris'))?.obra).toBeUndefined();
  });

  it('o artigo no fim ("Legend of Zelda, The") é a mesma obra', () => {
    const l = agruparEmObras([
      pasta('Legend of Zelda, The - A Link to the Past (USA)'),
      pasta('The Legend of Zelda - A Link to the Past (Europe)'),
    ]);
    expect(l).toHaveLength(1);
  });

  it('a jogada por último vence o peso; a escolhida da última vez vence tudo', () => {
    const itens = [jogado('Jogo (Japan)', 50), pasta('Jogo (USA)'), jogado('Jogo (Europe)', 10)];
    expect(agruparEmObras(itens)[0]?.nome).toBe('Jogo (Japan)');
    const usa = chaveDaVersao(itens[1] as ItemBiblioteca);
    expect(agruparEmObras(itens, (k) => (k === 'snes:jogo' ? usa : null))[0]?.nome).toBe('Jogo (USA)');
  });

  it('as ROMs de dentro de um zip são versões separadas (chave com a entrada)', () => {
    const a = pasta('Jogo (USA)', 'sfc', 'Jogo (USA)');
    const b = pasta('Jogo (USA) [T+Por]', 'sfc', 'Jogo (USA) [T+Por]');
    expect(chaveDaVersao(a)).not.toBe(chaveDaVersao(b));
    const l = agruparEmObras([a, b]);
    expect(l).toHaveLength(1);
    expect(l[0]?.nome).toBe('Jogo (USA) [T+Por]');
  });
});
