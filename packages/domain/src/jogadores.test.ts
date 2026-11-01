import { describe, expect, it } from 'vitest';
import { escolherJogador, jogadorDe, juntarJogadores, nomeDoPad, type Vagas } from './jogadores';

describe('jogadores 2 a 4 (regra do jogadores.js do antigo)', () => {
  it('teclado é o J1; controles pegam as vagas na ordem; a escolha vale pelo nome do controle', () => {
    const v: Vagas = { escolha: {}, sessao: {} };
    const l = ['teclado', 'pad:Xbox#0', 'pad:8BitDo#1'];
    expect(jogadorDe('teclado', l, v)).toBe(0);
    expect(jogadorDe('pad:Xbox#0', l, v)).toBe(0);
    expect(jogadorDe('pad:8BitDo#1', l, v)).toBe(1);
    escolherJogador(v, 'pad:Xbox#0', 2);
    expect(v.escolha).toEqual({ 'pad:Xbox': 2 });
    expect(jogadorDe('pad:Xbox#3', ['pad:Xbox#3'], v)).toBe(2); // outro slot, mesmo controle
    const r = juntarJogadores(
      [
        { k: 'teclado', nome: 'Teclado', b: 1, e: null },
        { k: 'pad:Xbox#0', nome: 'x', b: 2, e: [5, 0, 0, 0] },
        { k: 'pad:8BitDo#1', nome: 'y', b: 4, e: null },
      ],
      v,
    );
    expect(r.b).toEqual([1, 4, 2, 0]);
    expect(r.e[2]).toEqual([5, 0, 0, 0]);
    expect(nomeDoPad('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)')).toBe('🎮 Xbox Wireless Controller');
  });
});
