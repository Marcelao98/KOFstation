import { beforeEach, describe, expect, it } from 'vitest';
import { jogoPausadoPorTela, usarTelas } from './telas';

const t = () => usarTelas.getState();
beforeEach(() => usarTelas.setState({ atual: 'home', historico: [], temasAberto: false, temJogo: false }));

describe('pilha de telas (como o voltar() do antigo)', () => {
  it('Voltar anda pelo histórico', () => {
    t().abrir('biblioteca');
    t().abrir('guia');
    t().voltar();
    expect(t().atual).toBe('biblioteca');
    t().voltar();
    expect(t().atual).toBe('home');
  });
  it('sem histórico e sem jogo, o Voltar fica no Início', () => {
    t().voltar();
    expect(t().atual).toBe('home');
  });
  it('com jogo: do jogo o Voltar vai pro Início, e o Esc numa tela volta pro jogo', () => {
    usarTelas.setState({ temJogo: true, atual: 'jogo' });
    t().voltar();
    expect(t().atual).toBe('home');
    t().abrir('guia');
    t().sair();
    expect(t().atual).toBe('jogo');
  });
  it('a galeria de temas fica por cima e fecha primeiro', () => {
    t().abrir('guia');
    t().abrirTemas();
    expect(t().atual).toBe('guia');
    t().voltar();
    expect(t().temasAberto).toBe(false);
    expect(t().atual).toBe('guia');
  });
  it('jogo pausa com qualquer tela por cima', () => {
    expect(jogoPausadoPorTela({ atual: 'jogo', temasAberto: false })).toBe(false);
    expect(jogoPausadoPorTela({ atual: 'jogo', temasAberto: true })).toBe(true);
    expect(jogoPausadoPorTela({ atual: 'guia', temasAberto: false })).toBe(true);
  });
});
