// Filtros da biblioteca (#bib-filtros, #bib-pop) e os botõezinhos da ficha (#info-meta). Chegam com a base de jogos
// no M3.5.
import type { ItemBiblioteca } from '@kof/domain';

export const popAberto = (): boolean => false;
export function teclaDoPop(e: KeyboardEvent): void {
  void e;
}
export function FiltrosDaBiblioteca() {
  return null;
}
export function MetaDoJogo(p: { item: ItemBiblioteca | undefined }) {
  void p;
  return <p id="info-meta" hidden></p>;
}
