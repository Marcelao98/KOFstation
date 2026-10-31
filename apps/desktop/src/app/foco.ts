// Navegação por controle (D19): o `moverPad` do antigo em função pura. Dado o retângulo do botão atual e dos outros,
// escolhe o mais perto na direção pedida: anda (na direção) + 2,5 × lado (desvio). Ignora quem anda ≤ 2 px.
export interface Caixa {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function maisPerto<T>(
  atual: Caixa,
  candidatos: readonly (readonly [T, Caixa])[],
  dx: number,
  dy: number,
): T | null {
  const ax = atual.left + atual.width / 2;
  const ay = atual.top + atual.height / 2;
  let melhor: T | null = null;
  let nota = Infinity;
  for (const [item, r] of candidatos) {
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const anda = dx ? (cx - ax) * dx : (cy - ay) * dy;
    if (anda <= 2) continue;
    const lado = dx ? Math.abs(cy - ay) : Math.abs(cx - ax);
    const n = anda + lado * 2.5;
    if (n < nota) {
      nota = n;
      melhor = item;
    }
  }
  return melhor;
}

/** Tempo até repetir segurando o direcional (antigo: 380 ms na 1ª vez, depois 110 ms). */
export const REPETE_PRIMEIRA_MS = 380;
export const REPETE_MS = 110;
