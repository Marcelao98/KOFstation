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

/** Até quanto o fps do console pode diferir do monitor pra rodar travado no vsync (1 quadro por vsync, o som corrige). */
export const TRAVA_MAXIMA = 0.01;

export interface RitmoDoVsync {
  /** Quantos quadros rodar neste vsync, dado o tempo desde o anterior (ms, pelo relógio do requestAnimationFrame). */
  passo(ms: number): number;
  /** Velocidade do jogo em relação ao fps certo do console (travado num monitor de 60 Hz, GB = 60/59,73). */
  readonly fator: number;
  readonly travado: boolean;
  /** Recomeça sem correr atrás do tempo (pausa, rebobinar, voltou a ter vsync). */
  zerar(): void;
}

/**
 * Ritmo pelo vsync (o laco() do antigo, que rodava no requestAnimationFrame): a página avisa cada vsync e o núcleo roda
 * os quadros que couberem. Se o monitor tem quase o fps do console (diferença até 1%: GB 59,73 ou NES 60,1 num monitor de
 * 60 Hz; ou o dobro, num de 120 Hz), trava em 1 quadro por vsync (ou a cada 2), sem quadro repetido nem pulado; o jogo anda até 1% mais rápido ou mais lento e o
 * reamostrador do som compensa (`fator`). Sem trava (monitor de 144 Hz, PAL de 50), soma o tempo como o antigo. A sobra
 * começa em meio quadro: um vsync que chega um pouco antes ou depois não vira 0 ou 2 quadros.
 */
export function criarRitmoDoVsync(fps: number): RitmoDoVsync {
  if (!(fps > 0)) throw new RangeError(`fps inválido: ${fps}`);
  const certoMs = 1000 / fps;
  const ultimos: number[] = [];
  let periodo = 0; // período do vsync medido, 0 = ainda não sabe
  let quadroMs = certoMs;
  let sobra = certoMs / 2;
  let travado = false;
  const medir = (ms: number) => {
    if (!(ms > 2 && ms < 60)) return; // aba escondida, engasgo: não é o vsync
    ultimos.push(ms);
    if (ultimos.length > 60) ultimos.shift();
    if (ultimos.length < 8) return;
    const ord = [...ultimos].sort((a, b) => a - b);
    // média dos que estão perto da mediana (um vsync perdido ou um tranco não entram; o tremido se anula)
    const mediana = ord[ord.length >> 1] ?? 0;
    const perto = ord.filter((x) => Math.abs(x / mediana - 1) < 0.4);
    periodo = perto.reduce((a, b) => a + b, 0) / perto.length;
    const k = Math.max(1, Math.round(certoMs / periodo)); // 120 Hz: 1 quadro a cada 2 vsyncs
    const trava = periodo > 0 && Math.abs((k * periodo) / certoMs - 1) <= TRAVA_MAXIMA;
    const novo = trava ? k * periodo : certoMs;
    if (trava !== travado || Math.abs(novo - quadroMs) > 0.02) {
      // mudou de verdade (outro monitor, a medida assentou): a sobra fica na mesma fase
      sobra = (sobra / quadroMs) * novo;
      quadroMs = novo;
      travado = trava;
    }
  };
  return {
    passo(ms) {
      medir(ms);
      sobra += Math.max(0, Math.min(ms, 100));
      let n = Math.floor(sobra / quadroMs);
      if (n > MAX_QUADROS_POR_PASSO) {
        n = MAX_QUADROS_POR_PASSO;
        sobra = quadroMs / 2; // engasgou: não tenta recuperar o atraso todo (igual ao antigo)
      } else sobra -= n * quadroMs;
      return n;
    },
    get fator() {
      return certoMs / quadroMs;
    },
    get travado() {
      return travado;
    },
    zerar() {
      sobra = quadroMs / 2;
    },
  };
}
