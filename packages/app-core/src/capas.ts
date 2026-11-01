// Capas: pede ao Rust (cover.get), no máximo 3 de cada vez, e guarda a URL de cada uma na memória. Sem rede ou sem
// capa: o app usa o print de quando parou.
import { acervoDoItem, nomesDaCapa, type ItemBiblioteca } from '@kof/domain';
import type { Backend } from './backend';

export interface Capas {
  /** URL da capa oficial já carregada (null = ainda não / não tem) */
  url(r: ItemBiblioteca): string | null;
  /** pede a capa (baixa se precisar); `chegou` é chamado quando ela aparecer */
  pedir(r: ItemBiblioteca): void;
}

export function criarCapas(b: Backend, chegou: (nome: string) => void, ligadas: () => boolean): Capas {
  const urls = new Map<string, string | null>();
  const buscando = new Set<string>();
  let ativos = 0;
  const fila: (() => void)[] = [];
  const vaga = () =>
    new Promise<void>((ok) => {
      if (ativos < 3) {
        ativos++;
        ok();
      } else fila.push(ok);
    });
  const liberar = () => {
    const p = fila.shift();
    if (p) p();
    else ativos--;
  };
  const chave = (r: ItemBiblioteca) => `${acervoDoItem(r).acervo}|${r.nome}`;
  return {
    url: (r) => (ligadas() ? (urls.get(chave(r)) ?? null) : null),
    pedir(r) {
      const k = chave(r);
      if (!ligadas() || !r.nome || urls.has(k) || buscando.has(k)) return;
      buscando.add(k);
      void (async () => {
        const { acervo } = acervoDoItem(r);
        await vaga();
        try {
          const png = await b.lerBinario('cover.get', { acervo, chave: r.nome, nomes: nomesDaCapa(r) });
          urls.set(k, URL.createObjectURL(new Blob([png as Uint8Array<ArrayBuffer>], { type: 'image/png' })));
          chegou(r.nome);
        } catch {
          urls.set(k, null); // sem capa (ou sem rede): fica o print; o Rust lembra a falha por 7 dias
        } finally {
          buscando.delete(k);
          liberar();
        }
      })();
    },
  };
}
