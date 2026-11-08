import { describe, expect, it } from 'vitest';
import { enderecoDoControle, linhaDoJogo, padDaRede, padDoServidor, padPraRede } from './celular';

describe('celular como controle (formatos do antigo)', () => {
  it('canal pad: ida e volta', () => {
    const t = padPraRede(0x8081, [32767, -32767, 0, 16384]);
    const p = padDaRede(t);
    expect(p.b).toBe(0x8081);
    expect(p.e).toEqual([32767, -32767, 0, 16513]); // int8 no caminho: perde um pouco, como no antigo
    expect(padDaRede('0,0')).toEqual({ b: 0, e: [0, 0, 0, 0] });
  });
  it('6 bytes do servidor do APK', () => {
    expect(padDoServidor(new Uint8Array([0x81, 0x80, 127, 0x81, 0, 0]))).toEqual({
      b: 0x8081,
      e: [32767, -32767, 0, 0],
    });
    expect(padDoServidor(new Uint8Array([1, 2]))).toBeNull();
  });
  it('endereço e senha, e a linha do jogo', () => {
    expect(enderecoDoControle('192.168.0.15 4821')).toEqual({ url: 'ws://192.168.0.15:8642', senha: '4821' });
    expect(enderecoDoControle(' 10.0.0.2:9000 1234 ')).toEqual({ url: 'ws://10.0.0.2:9000', senha: '1234' });
    expect(enderecoDoControle('celular 12')).toBeNull();
    expect(linhaDoJogo('snes', 'Jogo\tcom tab')).toBe('JOGO snes\tJogo com tab');
  });
});
