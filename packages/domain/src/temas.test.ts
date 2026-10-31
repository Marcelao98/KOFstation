import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMA_PADRAO, TODOS_TEMAS, TEMAS, contarCategorias, nomeDoTema, temasFiltrados } from './temas';

describe('temas (iguais ao antigo)', () => {
  it('126 temas, ids únicos e sem hífen', () => {
    expect(TODOS_TEMAS).toHaveLength(126);
    const ids = TODOS_TEMAS.map(([id]) => id);
    expect(new Set(ids).size).toBe(126);
    expect(ids.every((id) => /^[a-z0-9]+$/.test(id))).toBe(true);
  });
  it('o padrão é o Café queimado', () => {
    expect(TEMA_PADRAO).toBe('cafe');
    expect(nomeDoTema('cafe')).toBe('☕ Café queimado');
  });
  it('cada tema tem o seu bloco no estilo.css do antigo', () => {
    const css = readFileSync(new URL('../../../apps/desktop/src/styles/antigo/estilo.css', import.meta.url), 'utf8');
    const faltando = TODOS_TEMAS.map(([id]) => id).filter((id) => !css.includes(`[data-tema="${id}"]`));
    expect(faltando).toEqual([]);
  });
  it('busca sem acento por nome, categoria e descrição', () => {
    expect(
      temasFiltrados('todos', 'cafe')
        .flatMap(([, l]) => l)
        .map(([id]) => id),
    ).toContain('cafe');
    expect(temasFiltrados('todos', 'CAFÉ QUEIMADO').flatMap(([, l]) => l)).toHaveLength(1);
    expect(temasFiltrados('todos', 'xyzzy')).toEqual([]);
    expect(temasFiltrados('Café', '')).toHaveLength(1);
  });
  it('contagem das categorias soma o total', () => {
    const c = contarCategorias('');
    expect(c[0]).toEqual({ categoria: 'todos', n: 126 });
    expect(c.slice(1).reduce((s, x) => s + x.n, 0)).toBe(126);
    expect(c).toHaveLength(TEMAS.length + 1);
  });
});
