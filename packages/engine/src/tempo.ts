// Ritmo dos quadros (o laco() do app.js antigo): cada console tem o seu fps (GB 59,73, NES 60,1...) e o monitor tem o
// dele. A cada passo soma o tempo e roda quantos quadros couberem, no máximo 4 de uma vez pra não travar se engasgar.

export const MAX_QUADROS_POR_PASSO = 4;

export interface Relogio {
  /** Quantos quadros do console rodar agora, dado o tempo do passo em ms. */
  passo(ms: number): number;
}

export function criarRelogio(fps: number): Relogio {
  if (!(fps > 0)) throw new RangeError(`fps inválido: ${fps}`);
  const quadroMs = 1000 / fps;
  let sobra = 0;
  return {
    passo(ms) {
      sobra += Math.max(0, ms);
      let n = Math.floor(sobra / quadroMs);
      if (n > MAX_QUADROS_POR_PASSO) {
        n = MAX_QUADROS_POR_PASSO;
        sobra = 0; // engasgou: não tenta recuperar o atraso todo (igual ao antigo)
      } else sobra -= n * quadroMs;
      return n;
    },
  };
}
