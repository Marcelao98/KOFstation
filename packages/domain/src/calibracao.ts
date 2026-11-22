// 🎯 A calibração do celular-Wiimote (tarefa M.4): o assistente mede no celular e as contas ficam aqui (puras,
// testadas com movimentos gravados). O celular aplica antes de mandar: a mira (meio, cantos, zona morta, suavização)
// e o chacoalhar (o celular fraco vira um chacoalhão de Wiimote). Guardada por aparelho (no celular), com
// "recalibrar" e "recentrar" num botão.
import type { AjusteDaMira } from './wiimote';

export type Mao = 'destro' | 'canhoto';
/** `apontar`: a ponta pra TV, como um Wiimote em pé; `de-lado`: deitado na horizontal, como o Wiimote de lado */
export type Posicao = 'apontar' | 'de-lado';

export interface CalibracaoWii {
  versao: 1;
  /** quanto o celular gira (rad) do meio até a borda da tela */
  arcoX: number;
  arcoY: number;
  zonaMorta: number;
  suavizar: number;
  /** quanto aumentar o chacoalhar (1 = nada) */
  ganhoChacoalhar: number;
  mao: Mao;
  posicao: Posicao;
  /** o celular tinha giroscópio na calibração (sem ele, a mira vai pela inclinação, e os arcos são outros) */
  giroscopio: boolean;
}

const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const GRAU = Math.PI / 180;

/** Os limites do que faz sentido: girar menos de 5° pra borda treme demais; mais de 80° cansa o braço. */
export const ARCO_MIN = 5 * GRAU;
export const ARCO_MAX = 80 * GRAU;

/**
 * Os arcos a partir dos cantos apontados (os ângulos crus da mira, com o meio em 0,0). Dois cantos opostos bastam;
 * com os quatro, a média. null se os cantos estão perto demais do meio (não apontou).
 */
export function arcosDosCantos(cantos: readonly { x: number; y: number }[]): { arcoX: number; arcoY: number } | null {
  if (cantos.length < 2) return null;
  const mx = cantos.reduce((a, c) => a + Math.abs(c.x), 0) / cantos.length;
  const my = cantos.reduce((a, c) => a + Math.abs(c.y), 0) / cantos.length;
  if (mx < ARCO_MIN / 2 || my < ARCO_MIN / 2) return null;
  // os cantos têm que estar dos dois lados do meio (senão ele apontou duas vezes pro mesmo lugar)
  const lados = new Set(cantos.map((c) => Math.sign(c.x)));
  if (lados.size < 2) return null;
  return { arcoX: lim(mx, ARCO_MIN, ARCO_MAX), arcoY: lim(my, ARCO_MIN, ARCO_MAX) };
}

/** O tamanho do Wiimote chacoalhado de verdade (g acima da gravidade): o que os jogos esperam pra contar. */
export const CHACOALHAR_WIIMOTE = 2.5;

/** O ganho do chacoalhar a partir dos picos medidos (g acima da gravidade, um por chacoalhada). */
export function ganhoDoChacoalhar(picos: readonly number[]): number {
  const bons = picos.filter((p) => p > 0.3);
  if (!bons.length) return 1;
  const media = bons.reduce((a, b) => a + b, 0) / bons.length;
  return Math.round(lim(CHACOALHAR_WIIMOTE / media, 1, 4) * 100) / 100;
}

/**
 * Conta as chacoalhadas no assistente: um pico acima de `sobe` g (além da gravidade) que volta abaixo de `desce`.
 * Devolve o pico de cada uma.
 */
export class ContadorDeChacoalhadas {
  picos: number[] = [];
  private pico = 0;
  constructor(
    private sobe = 0.8,
    private desce = 0.3,
  ) {}
  /** acel em g (com a gravidade) */
  medir(acel: readonly number[]): number {
    const forca = Math.abs(Math.hypot(acel[0] ?? 0, acel[1] ?? 0, acel[2] ?? 0) - 1);
    if (forca > this.pico) this.pico = forca;
    if (this.pico >= this.sobe && forca < this.desce) {
      this.picos.push(this.pico);
      this.pico = 0;
    } else if (this.pico < this.sobe && forca < this.desce) this.pico = 0;
    return this.picos.length;
  }
}

/**
 * Aplica o ganho do chacoalhar: a gravidade fica (um filtro lento acha onde ela está); o que passa dela é o
 * chacoalhar, multiplicado. Parado, nada muda (a mira e a inclinação continuam certas).
 */
export class Chacoalho {
  private g: [number, number, number] | null = null;
  constructor(private ganho = 1) {}
  ajustar(ganho: number): void {
    this.ganho = ganho;
  }
  aplicar(a: readonly [number, number, number]): [number, number, number] {
    const g = (this.g ??= [a[0], a[1], a[2]]);
    for (let i = 0; i < 3; i++) g[i] = (g[i] ?? 0) + ((a[i] ?? 0) - (g[i] ?? 0)) * 0.05;
    if (this.ganho === 1) return [a[0], a[1], a[2]];
    return [0, 1, 2].map((i) => (g[i] ?? 0) + ((a[i] ?? 0) - (g[i] ?? 0)) * this.ganho) as [number, number, number];
  }
}

/**
 * De lado com a mão esquerda, o celular fica com a ponta pro outro lado: meia-volta nos eixos X e Y (aceleração e
 * giroscópio), pra o jogo ver o Wiimote de lado do jeito certo. Em pé e destro, nada muda.
 */
export function eixosDaPosicao(
  v: readonly [number, number, number],
  c: Pick<CalibracaoWii, 'mao' | 'posicao'>,
): [number, number, number] {
  if (c.posicao === 'de-lado' && c.mao === 'canhoto') return [-v[0], -v[1], v[2]];
  return [v[0], v[1], v[2]];
}

export const ajusteDaMira = (c: CalibracaoWii | null): AjusteDaMira =>
  c ? { arcoX: c.arcoX, arcoY: c.arcoY, zonaMorta: c.zonaMorta, suavizar: c.suavizar } : {};

/** A calibração guardada, conferida (null = nunca calibrou, ou guardado torto). */
export function lerCalibracao(t: string | null | undefined): CalibracaoWii | null {
  if (!t) return null;
  let o: Partial<CalibracaoWii>;
  try {
    o = JSON.parse(t) as Partial<CalibracaoWii>;
  } catch {
    return null; // guardado torto: calibra de novo
  }
  const n = (v: unknown, a: number, b: number, d: number) =>
    typeof v === 'number' && Number.isFinite(v) ? lim(v, a, b) : d;
  if (!o || o.versao !== 1) return null;
  return {
    versao: 1,
    arcoX: n(o.arcoX, ARCO_MIN, ARCO_MAX, 25 * GRAU),
    arcoY: n(o.arcoY, ARCO_MIN, ARCO_MAX, 18 * GRAU),
    zonaMorta: n(o.zonaMorta, 0, 0.5, 0.03),
    suavizar: n(o.suavizar, 0, 0.9, 0.3),
    ganhoChacoalhar: n(o.ganhoChacoalhar, 1, 4, 1),
    mao: o.mao === 'canhoto' ? 'canhoto' : 'destro',
    posicao: o.posicao === 'de-lado' ? 'de-lado' : 'apontar',
    giroscopio: !!o.giroscopio,
  };
}

/** O resumo pra mostrar ("mira 24°×17°, zona 3%, chacoalhar ×1,8, destro, apontando"). */
export function textoDaCalibracao(c: CalibracaoWii): string {
  const g = (r: number) => Math.round(r / GRAU) + '°';
  return [
    `mira ${g(c.arcoX)}×${g(c.arcoY)}`,
    `zona ${Math.round(c.zonaMorta * 100)}%`,
    `suave ${Math.round(c.suavizar * 100)}%`,
    `chacoalhar ×${c.ganhoChacoalhar.toFixed(1).replace('.', ',')}`,
    c.mao,
    c.posicao === 'de-lado' ? 'de lado' : 'apontando',
  ].join(', ');
}

/** Acertou o alvo do teste? (a mira e o alvo de -1 a 1; o raio em fração da tela) */
export const acertou = (mira: { x: number; y: number }, alvo: { x: number; y: number }, raio = 0.15): boolean =>
  Math.hypot(mira.x - alvo.x, mira.y - alvo.y) <= raio;
