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

  // M (refazer) a): o celular que chega joga no J1 junto com o teclado do PC (o Wii Sports só ouve o Wiimote 1; a 1ª M
  // pôs o teclado numa vaga e o celular caiu no J2). O 2º celular vai pro J2; quem cai e volta pega a mesma vaga.
  it('o teclado divide o J1 com o 1º celular; o 2º vai pro J2; quem volta pega a mesma vaga', () => {
    const v: Vagas = { escolha: {}, sessao: {} };
    const um = ['teclado', 'cel:A'];
    expect(jogadorDe('teclado', um, v)).toBe(0);
    expect(jogadorDe('cel:A', um, v)).toBe(0);
    const dois = ['teclado', 'cel:A', 'cel:B'];
    expect(jogadorDe('cel:B', dois, v)).toBe(1);
    expect(jogadorDe('cel:A', ['teclado', 'cel:B', 'cel:A'], v)).toBe(0); // caiu e voltou
    const r = juntarJogadores(
      [
        { k: 'teclado', nome: 'Teclado', b: 1, e: null },
        { k: 'cel:A', nome: 'a', b: 2, e: null },
        { k: 'cel:B', nome: 'b', b: 4, e: null },
      ],
      v,
    );
    expect(r.j).toEqual([0, 0, 1]);
    expect(r.b).toEqual([3, 4, 0, 0]);
  });
});
