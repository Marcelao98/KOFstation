import { describe, expect, it } from 'vitest';
import { notaEm100, resumoDasNotas, titulosParaBuscar } from './sobre';

describe('ficha do jogo (B.3)', () => {
  it('títulos a procurar: artigo na frente e " - " como ":"', () => {
    expect(titulosParaBuscar('Legend of Zelda, The - A Link to the Past')).toEqual([
      'The Legend of Zelda - A Link to the Past',
      'The Legend of Zelda: A Link to the Past',
      'Legend of Zelda, The - A Link to the Past',
      'Legend of Zelda, The: A Link to the Past',
    ]);
    expect(titulosParaBuscar('Chrono Trigger')).toEqual(['Chrono Trigger']);
    expect(titulosParaBuscar('  ')).toEqual([]);
  });

  it('nota em 0–100', () => {
    expect(notaEm100('97%')).toBe(97);
    expect(notaEm100('8.5/10')).toBe(85);
    expect(notaEm100('8,5 / 10')).toBe(85);
    expect(notaEm100('4/5')).toBe(80);
    expect(notaEm100('87/100')).toBe(87);
    expect(notaEm100('A-')).toBe(92);
    expect(notaEm100('B+')).toBe(88);
    expect(notaEm100('muito bom')).toBeNull();
    expect(notaEm100('3/0')).toBeNull();
  });

  it('resumo: média das que deu pra entender e quem deu', () => {
    expect(
      resumoDasNotas([
        { valor: '97%', por: 'Gen4' },
        { valor: '9/10', por: 'Revista X' },
        { valor: '???', por: 'Outra' },
      ]),
    ).toEqual({ media: 94, quantas: 2, por: ['Gen4', 'Revista X'] });
    expect(resumoDasNotas([])).toBeNull();
    expect(resumoDasNotas([{ valor: 'nada' }])).toBeNull();
  });
});
