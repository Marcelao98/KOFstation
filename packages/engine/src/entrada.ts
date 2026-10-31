// Lê os controles da Gamepad API e junta tudo nos bits do controle virtual (domain/controle).
import { BOTOES_PADRAO, bitsDoControle, semOpostos, type ControleLido } from '@kof/domain';

export function bitsDeTodos(
  controles: Iterable<ControleLido | null>,
  mapa: readonly (readonly [number, number])[] = BOTOES_PADRAO,
  analogicoPuro = false,
): number {
  let b = 0;
  for (const g of controles) if (g) b |= bitsDoControle(g, mapa, analogicoPuro);
  return semOpostos(b);
}

/** Os controles do navegador agora (lista vazia se a Gamepad API não existir). */
export const controlesDoNavegador = (): (ControleLido | null)[] =>
  typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
