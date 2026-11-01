// Armazém: as lojas de dados do app (jogos, saves, estados, autos, stats...), que no antigo eram o IndexedDB `kofnes`
// e agora são arquivos do Rust (comandos store.*). Cada registro tem metadados (JSON, vêm na listagem) e bytes
// (opcionais, lidos só quando precisa).
import { paraBackendError, type Backend } from './backend';

export type Loja = 'jogos' | 'saves' | 'estados' | 'autos' | 'stats' | 'musicas' | 'capas' | 'visual' | 'roms';

export interface Registro<M> {
  key: string;
  meta: M;
  /** tamanho dos bytes (0 = sem) */
  size: number;
}

export interface Armazem {
  listar<M>(loja: Loja, prefixo?: string): Promise<Registro<M>[]>;
  /** os bytes do registro; null se não existe */
  pegar(loja: Loja, chave: string): Promise<Uint8Array | null>;
  /** só os metadados; null se não existe */
  meta<M>(loja: Loja, chave: string): Promise<M | null>;
  por(loja: Loja, chave: string, meta: unknown, dados?: Uint8Array): Promise<void>;
  apagar(loja: Loja, chave: string): Promise<void>;
}

export function criarArmazem(b: Backend): Armazem {
  const tratar = async <T>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch (e) {
      const be = paraBackendError(e);
      if (be.code === 'NOT_FOUND') return null;
      throw be;
    }
  };
  return {
    listar: <M>(store: Loja, prefix?: string) =>
      b.chamar<Registro<M>[]>('store.list', prefix ? { store, prefix } : { store }),
    pegar: (store, key) => tratar(b.lerBinario('store.get', { store, key })),
    meta: <M>(store: Loja, key: string) => tratar(b.chamar<M>('store.meta', { store, key })),
    por: async (store, key, meta, dados) => {
      await b.enviarBinario('store.put', { store, key, meta }, dados ?? new Uint8Array(0));
    },
    apagar: async (store, key) => {
      await b.chamar('store.delete', { store, key });
    },
  };
}
