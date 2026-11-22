import { describe, expect, it } from 'vitest';
import {
  aparelhosDoArranjo,
  lerFicha,
  lerOrdemPapel,
  montarArranjo,
  papeisDe,
  qualArranjo,
  semQuemCaiu,
  sugerirArranjo,
  textoDaFicha,
  trocarPapel,
  validarArranjo,
  type AparelhoComPapel,
} from './arranjo';

const EU = 'pc0';
const lista: AparelhoComPapel[] = [
  { id: EU, nome: 'Este PC', tipo: 'pc', online: true },
  { id: 'cel1', nome: 'Moto', tipo: 'celular', online: true },
  { id: 'note', nome: 'Notebook', tipo: 'pc', online: true },
  { id: 'cel2', nome: 'Galaxy', tipo: 'celular', online: false },
];

describe('arranjos prontos', () => {
  it('PC sozinho tem os três papéis no mesmo aparelho', () => {
    const r = montarArranjo('sozinho', lista, EU);
    expect(r).toEqual({ arranjo: { nucleo: EU, tela: EU, controles: [EU] } });
    if ('arranjo' in r) expect(papeisDe(r.arranjo, EU)).toEqual(['nucleo', 'tela', 'controle']);
  });
  it('TV + celular, portátil e três aparelhos usam quem está na rede', () => {
    expect(montarArranjo('tv', lista, EU)).toEqual({ arranjo: { nucleo: EU, tela: EU, controles: ['cel1'] } });
    expect(montarArranjo('portatil', lista, EU)).toEqual({
      arranjo: { nucleo: EU, tela: 'cel1', controles: ['cel1'] },
    });
    expect(montarArranjo('tres', lista, EU)).toEqual({ arranjo: { nucleo: EU, tela: 'note', controles: ['cel1'] } });
  });
  it('sem aparelho na rede diz o que falta', () => {
    const so = lista.filter((x) => x.id === EU);
    expect(montarArranjo('tv', so, EU)).toEqual({ falta: 'nenhum celular na rede agora' });
    expect('falta' in montarArranjo('tres', lista.slice(0, 2), EU)).toBe(true);
  });
  it('reconhece o arranjo pra acender o botão', () => {
    for (const id of ['sozinho', 'tv', 'portatil', 'tres']) {
      const r = montarArranjo(id, lista, EU);
      if ('arranjo' in r) expect(qualArranjo(r.arranjo, lista, EU)).toBe(id);
    }
  });
});

describe('validar', () => {
  it('no máximo 6 aparelhos (núcleo, tela e 4 jogadores) e todos na rede', () => {
    const sete = { nucleo: EU, tela: 'note', controles: ['cel1', 'cel2', 'c3', 'c4', 'c5'] };
    expect(aparelhosDoArranjo(sete)).toHaveLength(7);
    expect(validarArranjo(sete, lista, EU)).toEqual({ ok: false, motivo: 'no máximo 6 aparelhos de cada vez' });
    expect(validarArranjo({ nucleo: EU, tela: 'cel2', controles: [EU] }, lista, EU)).toEqual({
      ok: false,
      motivo: 'Galaxy não está na rede agora',
    });
  });
  it('o PS2 e o Wii só rodam com o núcleo no PC', () => {
    const cel = [{ id: 'c', nome: 'Moto', tipo: 'celular', online: true }];
    expect(validarArranjo({ nucleo: 'c', tela: 'c', controles: ['c'] }, cel, 'c', 'wii')).toEqual({
      ok: false,
      motivo: 'Moto não roda esse console (só no PC)',
    });
    expect(validarArranjo({ nucleo: EU, tela: 'cel1', controles: ['cel1'] }, lista, EU, 'ps2')).toEqual({ ok: true });
  });
  it('precisa de controle e o núcleo é este aparelho', () => {
    expect(validarArranjo({ nucleo: EU, tela: EU, controles: [] }, lista, EU).ok).toBe(false);
    expect(validarArranjo({ nucleo: 'note', tela: EU, controles: [EU] }, lista, EU).ok).toBe(false);
  });
});

describe('quando um aparelho cai', () => {
  const nome = (id: string) => lista.find((x) => x.id === id)?.nome ?? id;
  it('a tela que caiu volta pro núcleo e o controle que caiu sai', () => {
    const r = semQuemCaiu({ nucleo: EU, tela: 'note', controles: ['cel1'] }, (id) => id === 'cel1', nome);
    expect(r?.arranjo).toEqual({ nucleo: EU, tela: EU, controles: ['cel1'] });
    expect(r?.aviso).toContain('a imagem voltou pra cá');
    const s = semQuemCaiu({ nucleo: EU, tela: 'cel1', controles: ['cel1'] }, () => false, nome);
    expect(s?.arranjo).toEqual({ nucleo: EU, tela: EU, controles: [EU] });
  });
  it('ninguém caiu: nada muda', () => {
    expect(semQuemCaiu({ nucleo: EU, tela: 'cel1', controles: ['cel1'] }, () => true, nome)).toBeNull();
  });
});

describe('papel avulso e sugestão', () => {
  it('trocar a tela e ligar/desligar um controle (sempre sobra um)', () => {
    const a = { nucleo: EU, tela: EU, controles: [EU] };
    expect(trocarPapel(a, 'tela', 'note').tela).toBe('note');
    expect(trocarPapel(a, 'controle', 'cel1').controles).toEqual([EU, 'cel1']);
    expect(trocarPapel(a, 'controle', EU).controles).toEqual([EU]);
    expect(trocarPapel(a, 'nucleo', 'note')).toBe(a);
  });
  it('PS2 e Wii sugerem o núcleo no PC', () => {
    expect(sugerirArranjo('wii', 'pc')).toBe('sozinho');
    expect(sugerirArranjo('ps2', 'celular')).toBe('');
  });
});

describe('ficha', () => {
  it('lê a ficha que veio pela rede e escreve a linha curta', () => {
    const f = lerFicha(
      JSON.stringify({
        tipo: 'pc',
        sistema: 'Linux',
        cpus: 8,
        memoriaGb: 8,
        tela: '1920×1080',
        controles: ['X'],
        consoles: ['ps2'],
      }),
    );
    expect(textoDaFicha(f)).toBe('PC · Linux · 8 núcleos · 8 GB · 1920×1080 · 1 controle');
  });
  it('ficha torta ou de aparelho antigo = desconhecida', () => {
    expect(lerFicha('não é json')).toBeNull();
    expect(lerFicha('{"tipo":"tv"}')).toBeNull();
    expect(textoDaFicha(null)).toBe('ficha desconhecida');
  });
  it('a ordem de papel', () => {
    expect(lerOrdemPapel('{"t":"papel","tela":true}')).toEqual({ t: 'papel', tela: true, controle: false });
    expect(lerOrdemPapel('x')).toBeNull();
  });
});
