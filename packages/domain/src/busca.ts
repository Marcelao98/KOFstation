// Busca da biblioteca (app.js 3304–3353 do antigo): texto livre (acha nome, console, gênero, empresa, série, ano),
// `campo:valor` (empresa:square_enix pra nome com espaço), facetas com contagem e ordenar.
import { sistemaDoItem, type InfoDaBase, type ItemBiblioteca } from './biblioteca';
import type { BaseDeJogos } from './basejogos';
import { normal } from './rom';
import { SISTEMAS } from './sistemas';

const ehZip = (r: ItemBiblioteca) => !r.jogo && /\.zip$/i.test(r.pasta?.arquivo ?? '');
/** O console do item (zip sem registro: o que a base disser). */
export const sisDe = (r: ItemBiblioteca): string => (ehZip(r) && r.meta ? r.meta.sistema : sistemaDoItem(r));
const sistema = (id: string) => SISTEMAS.find((s) => s.id === id);

/** O que a base sabe do item (guarda em r.meta) e o texto da busca (r.busca). */
export function metaDe(r: ItemBiblioteca, base: BaseDeJogos | null): InfoDaBase | null {
  if (r.meta !== undefined) return r.meta;
  if (!base) return null;
  const m = (r.meta = base.info(
    ehZip(r) ? null : sistemaDoItem(r),
    r.jogo ? r.jogo.nome || r.nome : r.nome,
    r.jogo?.crc,
  ));
  const S = sistema(sisDe(r));
  r.busca =
    (r.chave || '') +
    ' ' +
    normal(
      (S ? S.nome + ' ' + S.curto + ' ' : '') +
        (m ? [m.titulo, m.generos.join(' '), m.publicou, m.desenvolveu, m.serie, m.ano || ''].join(' ') : ''),
    );
  return m;
}

export const decada = (a: number): string => String(Math.floor(a / 10) * 10);
const JOGADORES: Record<string, string> = { 1: 'só 1 jogador', 2: '2 ou mais jogadores', 4: '4 ou mais jogadores' };

export type FacetaId = 'sis' | 'genero' | 'empresa' | 'decada' | 'jogadores' | 'serie';
export interface Faceta {
  id: FacetaId;
  nome: string;
  valores: (r: ItemBiblioteca) => string[];
  rotulo?: (v: string) => string;
}

export const FACETAS: readonly Faceta[] = [
  { id: 'sis', nome: 'Console', valores: (r) => [sisDe(r)], rotulo: (v) => sistema(v)?.nome ?? v },
  { id: 'genero', nome: 'Gênero', valores: (r) => (r.meta ? r.meta.generos : []) },
  {
    id: 'empresa',
    nome: 'Empresa',
    valores: (r) => (r.meta ? [...new Set([r.meta.publicou, r.meta.desenvolveu].filter(Boolean))] : []),
  },
  {
    id: 'decada',
    nome: 'Década',
    valores: (r) => (r.meta?.ano ? [decada(r.meta.ano)] : []),
    rotulo: (v) => 'anos ' + (Number(v) < 2000 ? v.slice(2) : v),
  },
  {
    id: 'jogadores',
    nome: 'Jogadores',
    valores: (r) => {
      const n = r.meta ? r.meta.jogadores : 0;
      return n ? ([n === 1 && '1', n >= 2 && '2', n >= 4 && '4'].filter(Boolean) as string[]) : [];
    },
    rotulo: (v) => JOGADORES[v] ?? v,
  },
  { id: 'serie', nome: 'Série', valores: (r) => (r.meta?.serie ? [r.meta.serie] : []) },
];

export type Ordem = 'padrao' | 'nome' | 'ano' | 'tempo';
export const ORDENS: readonly [Ordem, string][] = [
  ['padrao', 'Recentes primeiro'],
  ['nome', 'Nome'],
  ['ano', 'Ano'],
  ['tempo', 'Mais jogados'],
];

const CAMPOS: Record<string, FacetaId | 'ano'> = {
  ano: 'ano',
  empresa: 'empresa',
  genero: 'genero',
  console: 'sis',
  sistema: 'sis',
  serie: 'serie',
  jogadores: 'jogadores',
};

export interface Consulta {
  livres: string[];
  campos: [FacetaId | 'ano', string][];
}

export function consulta(texto: string): Consulta {
  const livres: string[] = [];
  const campos: Consulta['campos'] = [];
  for (const p of texto.split(/\s+/).filter(Boolean)) {
    const m = /^([^:]+):(.+)$/.exec(p);
    const c = m && CAMPOS[normal(m[1] ?? '')];
    if (c && m) campos.push([c, normal(m[2] ?? '')]);
    else livres.push(...normal(p).split(' ').filter(Boolean));
  }
  return { livres, campos };
}

export type Filtros = Partial<Record<FacetaId, string>>;

export function passa(
  r: ItemBiblioteca,
  q: Consulta,
  filtros: Filtros,
  base: BaseDeJogos | null,
  ignorar?: FacetaId,
): boolean {
  const m = metaDe(r, base);
  const txt = r.busca || r.chave || '';
  if (!q.livres.every((w) => txt.includes(w))) return false;
  for (const [c, v] of q.campos) {
    if (c === 'ano') {
      if (!m || !String(m.ano).startsWith(v)) return false;
      continue;
    }
    if (c === 'sis') {
      const S = sistema(sisDe(r));
      if (!S || !normal(S.nome + ' ' + S.curto).includes(v)) return false;
      continue;
    }
    const f = FACETAS.find((x) => x.id === c);
    if (f && !f.valores(r).some((x) => normal(x).includes(v))) return false;
  }
  for (const f of FACETAS) {
    const alvo = filtros[f.id];
    if (f.id !== ignorar && alvo && !f.valores(r).includes(alvo)) return false;
  }
  return true;
}

const colar = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }).compare;

/** Ordena no lugar (padrão = a ordem de chegada: recentes primeiro). `tempo` = ms jogados do jogo. */
export function ordenar(l: ItemBiblioteca[], ordem: Ordem, tempo: (id: string) => number = () => 0): void {
  if (ordem === 'padrao') return;
  const t = (r: ItemBiblioteca) => (r.jogo ? tempo(r.jogo.id) : 0);
  const k = { nome: () => 0, ano: (r: ItemBiblioteca) => r.meta?.ano || 9999, tempo: (r: ItemBiblioteca) => -t(r) }[
    ordem
  ];
  l.sort((a, b) => k(a) - k(b) || colar(a.nome || '', b.nome || ''));
}

/** Opções de uma faceta com a contagem (os outros filtros e a busca valendo; só este fica de fora). */
export function opcoesDaFaceta(
  id: FacetaId,
  itens: readonly ItemBiblioteca[],
  q: Consulta,
  filtros: Filtros,
  base: BaseDeJogos | null,
  soPrincipais: boolean,
): [string, string, number][] {
  const f = FACETAS.find((x) => x.id === id);
  if (!f) return [];
  const n = new Map<string, number>();
  for (const r of itens) {
    if ((soPrincipais && r.variante) || !passa(r, q, filtros, base, id)) continue;
    for (const v of f.valores(r)) n.set(v, (n.get(v) ?? 0) + 1);
  }
  const op: [string, string, number][] = [...n].map(([v, c]) => [v, f.rotulo ? f.rotulo(v) : v, c]);
  op.sort(
    id === 'decada' || id === 'jogadores' ? (a, b) => colar(a[0], b[0]) : (a, b) => b[2] - a[2] || colar(a[1], b[1]),
  );
  op.unshift(['', 'Todos', 0]);
  return op;
}
