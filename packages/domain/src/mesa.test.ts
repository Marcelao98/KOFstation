import { describe, expect, it } from 'vitest';
import { juntarJogadores, type Vagas } from './jogadores';
import type { AparelhoComPapel } from './arranjo';
import {
  arranjoDaMesa,
  chavesDaMesa,
  entrarNaMesa,
  estadoDaVaga,
  lerMensagemMesa,
  lerMesaGuardada,
  mesaDoArranjo,
  mesmoArranjo,
  mesaSozinho,
  porNunchuk,
  querMovimento,
  sairDaMesa,
  textoDoJogador,
  tiposDoConsole,
  validarMesa,
  vagaDe,
  vistaPara,
  type Mesa,
} from './mesa';

const EU = 'pc0';
const lista: AparelhoComPapel[] = [
  { id: EU, nome: 'Este PC', tipo: 'pc', online: true },
  { id: 'c1', nome: 'Moto', tipo: 'celular', online: true },
  { id: 'c2', nome: 'Galaxy', tipo: 'celular', online: true },
  { id: 'c3', nome: 'Xiaomi', tipo: 'celular', online: true },
  { id: 'c4', nome: 'iPhone', tipo: 'celular', online: false },
  { id: 'note', nome: 'Notebook', tipo: 'pc', online: true },
];
const nome = (id: string) => lista.find((x) => x.id === id)?.nome ?? '?';
const online = (id: string) => !!lista.find((x) => x.id === id)?.online;

function comQuatro(): Mesa {
  let m = mesaSozinho(EU, 'wii');
  for (const c of ['c1', 'c2', 'c3']) {
    const r = entrarNaMesa(m, c, 'wiimote');
    if ('falta' in r) throw new Error(r.falta);
    m = r.mesa;
  }
  return m;
}

describe('tipos de controle', () => {
  it('o Wiimote só no Wii; o GameCube no GameCube e no Wii', () => {
    expect(tiposDoConsole('wii', 'celular')).toEqual(['toque', 'wiimote', 'wiimote+nunchuk']);
    expect(tiposDoConsole('snes', 'celular')).toEqual(['toque']);
    expect(tiposDoConsole('gc', 'pc')).toEqual(['teclado', 'controle', 'gamecube']);
    expect(tiposDoConsole('ps2', 'pc')).toEqual(['teclado', 'controle']);
    expect(tiposDoConsole('wii', 'pc')).toContain('gamecube');
  });
});

describe('entrar e sair', () => {
  it('cada um pega a próxima vaga; a quinta não cabe', () => {
    const m = comQuatro();
    expect(m.jogadores.map((j) => j?.aparelho)).toEqual([EU, 'c1', 'c2', 'c3']);
    expect(entrarNaMesa(m, 'note', 'controle')).toEqual({ falta: 'as 4 vagas estão ocupadas' });
    // quem já está troca só o tipo
    const r = entrarNaMesa(m, 'c2', 'toque');
    expect('mesa' in r && r.vaga).toBe(2);
    expect('mesa' in r && r.mesa.jogadores[2]?.tipo).toBe('toque');
  });
  it('pedir uma vaga ocupada não toma o lugar de ninguém; pedir uma livre muda de vaga', () => {
    const m = sairDaMesa(comQuatro(), 1, EU);
    expect(entrarNaMesa(m, 'c3', 'toque', 2)).toEqual({ falta: 'o J3 já tem jogador' });
    const r = entrarNaMesa(m, 'c3', 'toque', 1);
    if (!('mesa' in r)) throw new Error('não entrou');
    expect(r.mesa.jogadores.map((j) => j?.aparelho ?? null)).toEqual([EU, 'c3', 'c2', null]);
  });
  it('sem ninguém, o núcleo volta a ser o J1', () => {
    let m = mesaSozinho(EU);
    m = sairDaMesa(m, 0, EU);
    expect(m.jogadores[0]).toEqual({ aparelho: EU, tipo: 'teclado' });
  });
});

describe('validar', () => {
  it('a mesa com 4 jogadores e tela no notebook serve (6 aparelhos)', () => {
    const m = { ...comQuatro(), tela: 'note' };
    expect(validarMesa(m, lista, EU, 'wii')).toEqual({ ok: true });
  });
  it('Wiimote sem calibrar fica com a vaga, mas os sensores só ligam calibrado ou de propósito', () => {
    const m = comQuatro();
    expect(validarMesa(m, lista, EU, 'wii')).toEqual({ ok: true });
    expect(querMovimento(m, 'c1', false)).toBe(false);
    expect(querMovimento(m, 'c1', true)).toBe(true);
    const j = m.jogadores.map((x) => (x && x.aparelho !== EU ? { ...x, semCalibrar: true } : x));
    expect(querMovimento({ ...m, jogadores: j }, 'c1', false)).toBe(true);
  });
  it('o tipo tem que valer pro console', () => {
    const m = comQuatro();
    expect(validarMesa(m, lista, EU, 'snes')).toEqual({
      ok: false,
      motivo: 'J2: Wiimote não vale nesse console',
    });
  });
  it('o jogador fora da rede não é erro (vaga reservada); a tela fora da rede é', () => {
    const r = entrarNaMesa(mesaSozinho(EU), 'c4', 'toque');
    if (!('mesa' in r)) throw new Error('não entrou');
    expect(validarMesa(r.mesa, lista, EU, 'snes')).toEqual({ ok: true });
    expect(validarMesa({ ...r.mesa, tela: 'c4' }, lista, EU, 'snes')).toEqual({
      ok: false,
      motivo: 'iPhone não está na rede agora',
    });
  });
  it('um celular não pode estar em duas vagas; o Nunchuk é outro celular', () => {
    const m = comQuatro();
    const duas = { ...m, jogadores: [m.jogadores[0] ?? null, m.jogadores[1] ?? null, m.jogadores[1] ?? null, null] };
    expect(validarMesa(duas, lista, EU, 'wii')).toEqual({ ok: false, motivo: 'J3: Moto já é o J2' });
    const mesmo = porNunchuk(m, 1, 'c1');
    expect(validarMesa(mesmo, lista, EU, 'wii')).toMatchObject({ ok: false });
    const pcNunchuk = porNunchuk(m, 1, 'note');
    expect(validarMesa(pcNunchuk, lista, EU, 'wii')).toEqual({
      ok: false,
      motivo: 'J2: o Nunchuk tem que ser um celular',
    });
  });
});

describe('Nunchuk em outro celular', () => {
  it('o celular do Nunchuk sai da vaga dele e soma com o Wiimote do jogador', () => {
    const m = porNunchuk(comQuatro(), 1, 'c3');
    expect(m.jogadores[1]).toEqual({ aparelho: 'c1', tipo: 'wiimote+nunchuk', nunchuk: 'c3' });
    expect(m.jogadores[3]).toBeNull();
    expect(vagaDe(m, 'c3')).toBe(1);
    expect(validarMesa(m, lista, EU, 'wii')).toEqual({ ok: true });
    expect(chavesDaMesa(m, EU)).toEqual({ 'cel:c1': 1, 'cel:c2': 2, 'cel:c3': 1 });
    // os botões e o analógico do Nunchuk chegam no J2, junto com o Wiimote
    const v: Vagas = { escolha: {}, sessao: {}, mesa: chavesDaMesa(m, EU) };
    const r = juntarJogadores(
      [
        { k: 'teclado', nome: 'teclado', b: 0, e: null },
        { k: 'cel:c1', nome: 'Moto', b: 1, e: null },
        { k: 'cel:c3', nome: 'Xiaomi', b: 4, e: [9000, 0, 0, 0] },
      ],
      v,
    );
    expect(r.j).toEqual([0, 1, 1]);
    expect(r.b[1]).toBe(5);
    expect(r.e[1]).toEqual([9000, 0, 0, 0]);
    // só o Wiimote manda movimento
    expect(querMovimento(m, 'c1', true)).toBe(true);
    expect(querMovimento(m, 'c3', true)).toBe(false);
    expect(querMovimento(m, 'c2', false)).toBe(false);
    expect(textoDoJogador(m, 1, nome)).toBe('Jogador 2: Moto + Xiaomi, Wiimote + Nunchuk');
    // tirar o Nunchuk
    expect(porNunchuk(m, 1, undefined).jogadores[1]).toEqual({ aparelho: 'c1', tipo: 'wiimote+nunchuk' });
  });
});

describe('a vaga da mesa vale antes da escolha e fica reservada', () => {
  it('um controle novo não pega a vaga de quem caiu', () => {
    const m = comQuatro();
    const v: Vagas = { escolha: {}, sessao: {}, mesa: chavesDaMesa(m, EU) };
    // o c2 (J3) caiu: o controle USB que entra agora não pega a vaga dele; o J1 do PC é o do teclado, que não
    // ocupa vaga (como sempre foi), então o USB vai pro J1
    const r = juntarJogadores(
      [
        { k: 'teclado', nome: 'teclado', b: 0, e: null },
        { k: 'cel:c1', nome: 'Moto', b: 0, e: null },
        { k: 'pad:Xbox#0', nome: 'Xbox', b: 0, e: null },
      ],
      v,
    );
    expect(r.j[2]).toBe(0);
    // o c2 volta: o J3 de novo
    expect(juntarJogadores([{ k: 'cel:c2', nome: 'Galaxy', b: 2, e: null }], v).j).toEqual([2]);
  });
  it('mostra "esperando" e "calibrar"', () => {
    const r = entrarNaMesa(mesaSozinho(EU, 'wii'), 'c4', 'wiimote');
    if (!('mesa' in r)) throw new Error('não entrou');
    const cel = (id: string) => id.startsWith('c');
    expect(estadoDaVaga(r.mesa.jogadores[1], online, () => false, cel)).toBe('esperando');
    expect(estadoDaVaga({ aparelho: 'c1', tipo: 'wiimote' }, online, () => false, cel)).toBe('calibrar');
    expect(estadoDaVaga({ aparelho: 'c1', tipo: 'wiimote' }, online, () => true, cel)).toBe('ok');
    expect(estadoDaVaga(null, online, () => true, cel)).toBe('livre');
  });
});

describe('a mesa e o arranjo da tarefa N andam juntos', () => {
  it('arranjo pronto → mesa: quem entrou pega vaga, quem saiu (na rede) libera, quem caiu fica reservado', () => {
    const m = comQuatro();
    expect(arranjoDaMesa(m)).toEqual({ nucleo: EU, tela: EU, controles: [EU, 'c1', 'c2', 'c3'] });
    expect(arranjoDaMesa(m, (id) => id !== 'c2').controles).toEqual([EU, 'c1', 'c3']);
    expect(mesmoArranjo(m, { nucleo: EU, tela: EU, controles: ['c3', EU, 'c1'] }, (id) => id !== 'c2')).toBe(true);
    // o PC sozinho: os celulares (na rede) saem
    expect(mesaDoArranjo({ nucleo: EU, tela: EU, controles: [EU] }, m, lista, EU).jogadores).toEqual([
      { aparelho: EU, tipo: 'teclado' },
      null,
      null,
      null,
    ]);
    // o c4 (fora da rede) tinha vaga: continua reservada
    const r = entrarNaMesa(mesaSozinho(EU), 'c4', 'toque');
    if (!('mesa' in r)) throw new Error('não entrou');
    const depois = mesaDoArranjo({ nucleo: EU, tela: EU, controles: [EU] }, r.mesa, lista, EU);
    expect(depois.jogadores[1]).toEqual({ aparelho: 'c4', tipo: 'toque' });
    // portátil com o Moto: ele entra com o tipo padrão do console
    const p = mesaDoArranjo({ nucleo: EU, tela: 'c1', controles: ['c1'] }, mesaSozinho(EU), lista, EU, 'wii');
    expect(p.tela).toBe('c1');
    // o PC saiu dos controles (está na rede): o celular pega o J1
    expect(p.jogadores).toEqual([{ aparelho: 'c1', tipo: 'wiimote' }, null, null, null]);
  });
});

describe('o canal mesa', () => {
  it('a vista de cada aparelho e o caminho de volta', () => {
    const m = porNunchuk({ ...comQuatro(), tela: 'note' }, 1, 'c3');
    const v = vistaPara(m, 'c3', nome, online, 'wii', 'jogo de teste');
    expect(v).toMatchObject({ voce: 1, tipo: 'wiimote+nunchuk', nunchuk: true, tela: false });
    expect(v.vagas[1]).toEqual({ nome: 'Moto + Xiaomi', tipo: 'wiimote+nunchuk', esperando: false });
    expect(lerMensagemMesa(JSON.stringify(v))).toEqual(v);
    expect(vistaPara(m, 'note', nome, online, 'wii', '')).toMatchObject({ voce: -1, tela: true });
  });
  it('os pedidos, conferidos', () => {
    expect(lerMensagemMesa('{"t":"entrar","tipo":"wiimote","vaga":2}')).toEqual({
      t: 'entrar',
      tipo: 'wiimote',
      vaga: 2,
    });
    expect(lerMensagemMesa('{"t":"entrar","tipo":"bazuca","vaga":9}')).toEqual({ t: 'entrar' });
    expect(lerMensagemMesa('{"t":"tela"}')).toEqual({ t: 'tela' });
    expect(lerMensagemMesa('{"t":"pong","n":12}')).toEqual({ t: 'pong', n: 12 });
    expect(lerMensagemMesa('{"t":"calibrado","ok":1}')).toEqual({ t: 'calibrado', ok: true });
    expect(lerMensagemMesa('torto')).toBeNull();
    expect(lerMensagemMesa('{"t":"bomba"}')).toBeNull();
  });
  it('a mesa guardada volta conferida', () => {
    const m = porNunchuk(comQuatro(), 1, 'c3');
    expect(lerMesaGuardada(JSON.stringify(m.jogadores))).toEqual(m.jogadores);
    expect(lerMesaGuardada('[{"aparelho":"x","tipo":"bazuca"}]')).toEqual([null, null, null, null]);
    expect(lerMesaGuardada('{')).toBeNull();
  });
});
