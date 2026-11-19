// A ficha do jogo (B.3): as contas puras em volta do `jogo.sobre` (Wikidata + Wikipédia). Os nomes que vale procurar
// e as notas da crítica numa escala só.

/** O que o `jogo.sobre` devolve (null = o Wikidata não tem o jogo com artigo). */
export interface SobreOJogo {
  sinopse: string;
  lingua: 'pt' | 'en';
  /** o artigo da Wikipédia (o crédito: CC BY-SA) */
  url: string;
  wikidata: string;
  notas: { valor: string; por?: string }[];
}

/**
 * Os títulos a procurar (no máximo 4): o da base costuma vir como "Legend of Zelda, The - A Link to the Past"; no
 * Wikidata é "The Legend of Zelda: A Link to the Past".
 */
export function titulosParaBuscar(titulo: string): string[] {
  const t = titulo.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const artigo = /^(.*?), (The|A|An)\b(.*)$/.exec(t);
  const frente = artigo ? `${artigo[2] ?? ''} ${artigo[1] ?? ''}${artigo[3] ?? ''}` : t;
  const doisPontos = (s: string) => s.replace(/ - /g, ': ');
  return [...new Set([frente, doisPontos(frente), t, doisPontos(t)])].slice(0, 4);
}

/** Uma nota como veio ("97%", "8.5/10", "4/5", "87/100", "A-") em 0–100; null = não entendi. */
export function notaEm100(valor: string): number | null {
  const v = valor.trim().replace(',', '.');
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(v);
  if (pct) return limitar(Number(pct[1]));
  const fr = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(v);
  if (fr) {
    const de = Number(fr[2]);
    return de > 0 ? limitar((Number(fr[1]) / de) * 100) : null;
  }
  const letras: Record<string, number> = { A: 95, B: 85, C: 75, D: 65, E: 55, F: 40 };
  const l = /^([A-F])([+-]?)$/.exec(v.toUpperCase());
  if (l) return (letras[l[1] ?? ''] ?? 0) + (l[2] === '+' ? 3 : l[2] === '-' ? -3 : 0);
  return null;
}

const limitar = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

/** A nota da ficha: a média das que deu pra entender (e quantas), ou null sem nenhuma. */
export function resumoDasNotas(notas: readonly { valor: string; por?: string }[]): {
  media: number;
  quantas: number;
  por: string[];
} | null {
  const ok = notas.map((n) => ({ n: notaEm100(n.valor), por: n.por ?? '' })).filter((x) => x.n !== null);
  if (!ok.length) return null;
  const media = Math.round(ok.reduce((a, x) => a + (x.n ?? 0), 0) / ok.length);
  return { media, quantas: ok.length, por: [...new Set(ok.map((x) => x.por).filter(Boolean))] };
}
