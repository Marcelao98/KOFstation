import { describe, expect, it } from 'vitest';
import { BOTAO } from './controle';
import { acoesDe, eixosDoTeclado, gravarNaCamada, mapaDe, montarEntrada, nomeTecla, tecladoBits } from './entrada';

const cfg = (v: Record<string, unknown>) => (k: string) => (k in v ? JSON.stringify(v[k]) : null);

describe('controles em camadas (regras do antigo)', () => {
  it('ações por console', () => {
    expect(acoesDe('nes')).toEqual(['Cima', 'Baixo', 'Esquerda', 'Direita', 'B', 'A', 'Select', 'Start']);
    expect(acoesDe('snes')).not.toContain('L2');
    expect(acoesDe('ps1')).toContain('AD→');
    expect(acoesDe('n64')).toContain('AE↑');
    expect(acoesDe('n64')).not.toContain('AD↑');
  });
  it('geral → console → jogo; tecla repetida sai da ação antiga', () => {
    const ler = cfg({ teclas: { A: 'KeyK' }, 'teclas.snes': { B: 'KeyK' }, 'teclas.jogo.J|1': { Start: 'Space' } });
    const g = mapaDe(ler, 'teclas', 'geral');
    expect(g.A).toBe('KeyK');
    const s = mapaDe(ler, 'teclas', 'snes', 'J|1');
    expect(s.B).toBe('KeyK');
    expect(s.A).toBe(''); // KeyK foi pro B
    expect(s.Start).toBe('Space');
    const e = montarEntrada(ler, 'snes', 'J|1');
    expect(e.teclas.KeyK).toBe(BOTAO.B);
    expect(e.botoes).toContainEqual([0, BOTAO.B]);
  });
  it('analógico no teclado: setas = esquerdo, IJKL = direito, direcional em TFGH; PS1 misto aperta o direcional', () => {
    const e = montarEntrada(cfg({}), 'ps1');
    expect(e.mapa['AE↑']).toBe('ArrowUp');
    expect(e.mapa.Cima).toBe('KeyT');
    expect(e.teclasEixo.KeyL).toEqual([2, 1]);
    const ex = eixosDoTeclado(['ArrowLeft', 'KeyI'], e.teclasEixo);
    expect(ex).toEqual([-32767, 0, 0, -32767]);
    expect(tecladoBits(0, ex, 'misto')).toBe(BOTAO.Esquerda);
    expect(tecladoBits(0, ex, 'puro')).toBe(0);
    expect(eixosDoTeclado(['KeyZ'], e.teclasEixo)).toBe(null);
  });
  it('gravar troca com a ação que já tinha a tecla', () => {
    const [k, cam] = gravarNaCamada(cfg({}), 'teclas', 'snes', null, 'A', 'KeyZ');
    expect(k).toBe('teclas.snes');
    expect(cam).toEqual({ B: 'KeyX', A: 'KeyZ' });
    expect(nomeTecla('KeyZ')).toBe('Z');
    expect(nomeTecla('ShiftLeft')).toBe('Shift esq.');
  });
});
