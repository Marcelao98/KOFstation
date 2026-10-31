// O "controle virtual" do KOFstation: todos os aparelhos (teclado, controle USB/Bluetooth, celular) viram os bits do
// registrador do controle do Super Nintendo, como no app.js do kofstation-old. Menus e jogos leem esses bits.

export const BOTAO = {
  B: 0x8000,
  Y: 0x4000,
  Select: 0x2000,
  Start: 0x1000,
  Cima: 0x0800,
  Baixo: 0x0400,
  Esquerda: 0x0200,
  Direita: 0x0100,
  A: 0x0080,
  X: 0x0040,
  L: 0x0020,
  R: 0x0010,
  L2: 0x0008, // bits livres do registrador, usados pelo PlayStation
  R2: 0x0004,
} as const;

export const DIRECIONAL = BOTAO.Cima | BOTAO.Baixo | BOTAO.Esquerda | BOTAO.Direita;

/** Índice do botão na Gamepad API (mapeamento "standard") → bit. É o `BOTOES` padrão do antigo. */
export const BOTOES_PADRAO: readonly (readonly [indice: number, bit: number])[] = [
  [0, BOTAO.B],
  [1, BOTAO.A],
  [2, BOTAO.Y],
  [3, BOTAO.X],
  [4, BOTAO.L],
  [5, BOTAO.R],
  [6, BOTAO.L2],
  [7, BOTAO.R2],
  [8, BOTAO.Select],
  [9, BOTAO.Start],
  [12, BOTAO.Cima],
  [13, BOTAO.Baixo],
  [14, BOTAO.Esquerda],
  [15, BOTAO.Direita],
];

/** O mínimo de um controle da Gamepad API que importa aqui (dá pra testar sem navegador). */
export interface ControleLido {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}

/**
 * Bits de um controle, como o `estado()` do antigo: botões pelo mapa, e o analógico esquerdo aperta o direcional
 * (menos nos consoles de analógico "puro", como o N64).
 */
export function bitsDoControle(
  g: ControleLido,
  mapa: readonly (readonly [number, number])[] = BOTOES_PADRAO,
  analogicoPuro = false,
): number {
  let b = 0;
  for (const [i, bit] of mapa) if (g.buttons[i]?.pressed) b |= bit;
  if (!analogicoPuro) {
    const x = g.axes[0] ?? 0;
    const y = g.axes[1] ?? 0;
    if (x < -0.5) b |= BOTAO.Esquerda;
    if (x > 0.5) b |= BOTAO.Direita;
    if (y < -0.5) b |= BOTAO.Cima;
    if (y > 0.5) b |= BOTAO.Baixo;
  }
  return b;
}

/** Cima+baixo e esquerda+direita juntos não existem no console: os dois saem. */
export function semOpostos(b: number): number {
  if ((b & (BOTAO.Cima | BOTAO.Baixo)) === (BOTAO.Cima | BOTAO.Baixo)) b &= ~(BOTAO.Cima | BOTAO.Baixo);
  if ((b & (BOTAO.Esquerda | BOTAO.Direita)) === (BOTAO.Esquerda | BOTAO.Direita))
    b &= ~(BOTAO.Esquerda | BOTAO.Direita);
  return b;
}

/** Teclas padrão do jogo (o BOTOES_SNES do antigo): código da tecla → bit. */
export const TECLAS_PADRAO: Readonly<Record<string, number>> = {
  ArrowUp: BOTAO.Cima,
  ArrowDown: BOTAO.Baixo,
  ArrowLeft: BOTAO.Esquerda,
  ArrowRight: BOTAO.Direita,
  KeyZ: BOTAO.B,
  KeyX: BOTAO.A,
  KeyA: BOTAO.Y,
  KeyS: BOTAO.X,
  KeyQ: BOTAO.L,
  KeyW: BOTAO.R,
  Enter: BOTAO.Start,
  ShiftLeft: BOTAO.Select,
  KeyE: BOTAO.L2,
  KeyR: BOTAO.R2,
};
