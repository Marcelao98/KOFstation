// Armazém em memória pros testes (as mesmas regras das lojas do Rust).
import type { Armazem, Loja } from './armazem';

export function armazemDeMemoria(): Armazem {
  const m = new Map<string, [unknown, Uint8Array]>();
  const k = (l: Loja, c: string) => `${l}\u0000${c}`;
  return {
    listar: async <M>(l: Loja, p?: string) =>
      [...m]
        .filter(([x]) => x.startsWith(l + '\u0000') && x.slice(l.length + 1).startsWith(p ?? ''))
        .map(([x, [meta, b]]) => ({ key: x.slice(l.length + 1), meta: structuredClone(meta) as M, size: b.length })),
    pegar: async (l, c) => m.get(k(l, c))?.[1].slice() ?? null,
    meta: async <M>(l: Loja, c: string) => (m.has(k(l, c)) ? (structuredClone(m.get(k(l, c))?.[0]) as M) : null),
    por: async (l, c, meta, d) => void m.set(k(l, c), [structuredClone(meta), d?.slice() ?? new Uint8Array(0)]),
    apagar: async (l, c) => void m.delete(k(l, c)),
  };
}
