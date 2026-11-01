// Capa do jogo na ficha: o print de quando parou (capa oficial chega no M3.6).
import type { ItemBiblioteca } from '@kof/domain';

export const srcCapa = (r: ItemBiblioteca): string | null => r.jogo?.capa ?? null;

export function Capa({ item }: { item: ItemBiblioteca | undefined }) {
  const src = item ? srcCapa(item) : null;
  return <img id="capa-img" alt="" hidden={!src} src={src ?? undefined} />;
}
