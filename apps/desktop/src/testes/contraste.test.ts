// T.1: contraste dos 126 temas (WCAG) e as cores iguais às do antigo. O estilo.css novo é o do antigo com acréscimos; aqui
// cada tema é resolvido (variáveis do :root/Café + as do tema) e conferido:
//  - texto sobre fundo e sobre painel ≥ 4,5 (leitura normal); texto fraco e destaque sobre o painel ≥ 3 (texto grande/ícone);
//  - com KOF_ANTIGO, as cores de cada tema são exatamente as do estilo.css do antigo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMAS } from '@kof/domain';
import { describe, expect, it } from 'vitest';

const antigo = process.env.KOF_ANTIGO;
const css = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '');

/** id do tema → variáveis declaradas no bloco dele (o :root é junto do Café). */
function blocos(c: string): Map<string, Record<string, string>> {
  const m = new Map<string, Record<string, string>>();
  for (const b of css(c).matchAll(/((?:[^{}]*\[data-tema="[a-z0-9]+"\][^{}]*|:root[^{}]*))\{([^{}]*)\}/g)) {
    const alvos = [...(b[1] ?? '').matchAll(/\[data-tema="([a-z0-9]+)"\]\s*(,|$|\{)/g)];
    // só seletores que são exatamente o tema (sem descendentes como `[data-tema=x] .classe`)
    const seletor = (b[1] ?? '').trim();
    const ehTema = /^(:root\s*,\s*)?\[data-tema="[a-z0-9]+"\]$/.test(seletor);
    if (!ehTema) continue;
    const id = alvos[alvos.length - 1]?.[1];
    if (!id) continue;
    const vars: Record<string, string> = m.get(id) ?? {};
    for (const d of (b[2] ?? '').matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[d[1] ?? ''] = (d[2] ?? '').trim();
    m.set(id, vars);
  }
  return m;
}

function lum(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) return null;
  let h = m[1] ?? '';
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
}
function contraste(a: string, b: string): number | null {
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pares que ficam abaixo do mínimo **também no antigo** (as cores são idênticas, ver o teste abaixo): nesses temas o
 * texto não fica sobre aquele fundo (o CSS pinta o elemento com cor própria: `[data-tema="portatil"] #menu { color: … }`,
 * a faixa vermelha do Pokébola, etc.). A lista só pode encolher: tema novo ou mudança que piore o contraste falha.
 */
const CONHECIDOS = new Set([
  'portatil: --texto sobre --fundo',
  'portatil: --texto sobre --painel',
  'portatil: --fraco sobre --painel',
  'portatil: --destaque sobre --painel',
  'branco: --destaque sobre --painel',
  'classico98: --texto sobre --fundo',
  'luna: --texto sobre --fundo',
  'luna: --destaque sobre --painel',
  'pokebola: --texto sobre --fundo',
  'desenho: --texto sobre --fundo',
]);

const novoCss = readFileSync(join(import.meta.dirname, '../styles/antigo/estilo.css'), 'utf8');
const ids = TEMAS.flatMap(([, ts]) => ts.map((t) => t[0]));

describe('temas: contraste', () => {
  const novo = blocos(novoCss);
  const base = novo.get('cafe') ?? {};
  const resolvido = (id: string) => ({ ...base, ...(novo.get(id) ?? {}) });

  it('todos os 126 temas existem no CSS', () => {
    expect(ids.length).toBe(126);
    expect(ids.filter((id) => !novo.has(id))).toEqual([]);
  });

  it('texto sobre fundo e painel ≥ 4,5; texto fraco e destaque sobre o painel ≥ 3', () => {
    const ruins: string[] = [];
    const vistos = new Set<string>();
    for (const id of ids) {
      const v = resolvido(id);
      const checar = (a: string, b: string, minimo: number) => {
        const c = contraste(v[a] ?? '', v[b] ?? '');
        if (c !== null && c < minimo) {
          const chave = `${id}: ${a} sobre ${b}`;
          if (CONHECIDOS.has(chave)) vistos.add(chave);
          else ruins.push(`${chave} = ${c.toFixed(2)} (< ${minimo})`);
        }
      };
      checar('--texto', '--fundo', 4.5);
      checar('--texto', '--painel', 4.5);
      checar('--fraco', '--painel', 3);
      checar('--destaque', '--painel', 3);
    }
    expect(ruins, 'contraste baixo que o antigo não tinha').toEqual([]);
    expect(
      [...CONHECIDOS].filter((k) => !vistos.has(k)),
      'saiu da lista de conhecidos: tire daqui',
    ).toEqual([]);
  });
});

describe.skipIf(!antigo)('temas: as cores são as do antigo', () => {
  it('cada tema tem as mesmas variáveis de cor do estilo.css do antigo', () => {
    const velho = blocos(readFileSync(join(antigo ?? '', 'web/estilo.css'), 'utf8'));
    const novo = blocos(novoCss);
    const diferentes: string[] = [];
    for (const id of ids)
      for (const [k, v] of Object.entries(velho.get(id) ?? {}))
        if (novo.get(id)?.[k] !== v) diferentes.push(`${id} ${k}: antigo ${v} · novo ${novo.get(id)?.[k]}`);
    expect(diferentes).toEqual([]);
  });
});
