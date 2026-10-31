import { describe, expect, it } from 'vitest';
import { maisPerto, type Caixa } from './foco';

const c = (left: number, top: number): Caixa => ({ left, top, width: 100, height: 40 });
//  A(0,0)   B(200,0)
//  C(0,100) D(200,100)
const grade: [string, Caixa][] = [
  ['A', c(0, 0)],
  ['B', c(200, 0)],
  ['C', c(0, 100)],
  ['D', c(200, 100)],
];

describe('foco por controle (moverPad do antigo)', () => {
  it('anda na direção pedida', () => {
    expect(maisPerto(c(0, 0), grade.slice(1), 1, 0)).toBe('B');
    expect(maisPerto(c(0, 0), grade.slice(1), 0, 1)).toBe('C');
    expect(maisPerto(c(200, 100), grade.slice(0, 3), -1, 0)).toBe('C');
  });
  it('não volta pra trás e prefere quem está alinhado', () => {
    expect(maisPerto(c(0, 0), grade.slice(1), -1, 0)).toBeNull();
    expect(
      maisPerto(
        c(0, 0),
        [
          ['longe-alinhado', c(400, 0)],
          ['perto-torto', c(200, 100)],
        ],
        1,
        0,
      ),
    ).toBe('longe-alinhado');
  });
});
