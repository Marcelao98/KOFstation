// Jogadores 2 a 4 (web/jogadores.js do antigo): cada aparelho (teclado, cada controle) vai pra um jogador. A escolha fica
// guardada pelo nome do controle (sem o número do slot); sem escolha, o que já pegou nesta sessão; senão a primeira vaga
// livre. O teclado é sempre do Jogador 1 (se não escolher outro) e não ocupa vaga.

export const JOG_CORES = ['#e84545', '#3d8bfd', '#27c26c', '#f2b632'] as const;

export interface Aparelho {
  /** 'teclado' ou 'pad:<id>#<índice>' */
  k: string;
  nome: string;
  b: number;
  e: number[] | null;
}

export interface Vagas {
  /** escolha guardada: nome do aparelho (sem #slot) → jogador 0..3 */
  escolha: Record<string, number>;
  /** o que cada aparelho pegou nesta sessão */
  sessao: Record<string, number>;
}

const base = (k: string) => k.replace(/#\d+$/, '');

/** De que jogador (0..3) é o aparelho `k`, com os `ligados` agora. Pode anotar em `v.sessao`. */
export function jogadorDe(k: string, ligados: readonly string[], v: Vagas): number {
  if (k === 'teclado') return v.escolha.teclado ?? 0;
  const e = v.escolha[base(k)];
  if (e !== undefined) return e;
  const s = v.sessao[k];
  if (s !== undefined) return s;
  const usados = new Set(
    ligados
      .filter((x) => x !== k && x !== 'teclado' && (v.sessao[x] !== undefined || v.escolha[base(x)] !== undefined))
      .map((x) => v.escolha[base(x)] ?? v.sessao[x]),
  );
  let j = 0;
  while (usados.has(j) && j < 3) j++;
  v.sessao[k] = j;
  return j;
}

export const nomeDoPad = (id: string): string =>
  '🎮 ' +
  (id
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32) || 'Controle');

/** Os botões e analógicos de cada jogador neste quadro. */
export function juntarJogadores(
  l: readonly Aparelho[],
  v: Vagas,
): { b: number[]; e: (number[] | null)[]; j: number[] } {
  const ks = l.map((a) => a.k);
  const b = [0, 0, 0, 0];
  const e: (number[] | null)[] = [null, null, null, null];
  const j = l.map((a) => {
    const n = jogadorDe(a.k, ks, v);
    b[n] = (b[n] ?? 0) | a.b;
    if (a.e && a.e.some((x) => x) && !e[n]) e[n] = a.e;
    return n;
  });
  return { b, e, j };
}

/** Escolher o jogador de um aparelho (guardado pelo nome, sem o slot). */
export function escolherJogador(v: Vagas, k: string, j: number): void {
  v.escolha[k === 'teclado' ? 'teclado' : base(k)] = j;
  v.sessao = Object.fromEntries(Object.entries(v.sessao).filter(([x]) => x !== k));
}
