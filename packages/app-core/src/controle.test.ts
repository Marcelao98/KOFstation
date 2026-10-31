import { describe, expect, it } from 'vitest';
import { observarControle } from './controle';

describe('observarControle', () => {
  it('avisa o que foi apertado agora, e não repete o "novo" segurando', () => {
    const sequencia = [0, 0x0080, 0x0080, 0x0080 | 0x0100, 0];
    let i = 0;
    let passo = () => {};
    const eventos: [number, number][] = [];
    const parar = observarControle(
      { ler: () => sequencia[i++] ?? 0 },
      (b, n) => eventos.push([b, n]),
      (f) => {
        passo = f;
        return () => {};
      },
    );
    for (let k = 0; k < sequencia.length; k++) passo();
    parar();
    expect(eventos).toEqual([
      [0x0080, 0x0080],
      [0x0080, 0],
      [0x0180, 0x0100],
      [0, 0],
    ]);
  });
});
