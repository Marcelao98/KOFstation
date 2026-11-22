// 🖱 O mouse vira o ponteiro do Wiimote (tarefa W.4): com um jogo de Wii aberto, o mouse sobre a imagem manda a
// posição (de -1 a 1 dos dois lados) e os botões (esquerdo = A, do meio = chacoalhar). O direito continua abrindo o
// menu, como em todo console (o Marcelo, 22/11): o B do Wiimote fica no teclado/controle.
import { usarJogo } from './jogo';

interface ComPonteiro {
  ponteiro(x: number, y: number, botoes: number, dentro: boolean): void;
}

/** O jogo aberto recebe o ponteiro? (só o Wii no núcleo nativo) */
export function querPonteiro(): ComPonteiro | null {
  const j = usarJogo.getState();
  if (j.info?.sistema !== 'wii') return null;
  const s = j.jogo as Partial<ComPonteiro> | null;
  return s && typeof s.ponteiro === 'function' ? (s as ComPonteiro) : null;
}

/** Onde o mouse está na imagem: x e y de -1 a 1 e se está dentro. */
export function posicaoNaImagem(
  r: { left: number; top: number; width: number; height: number },
  cx: number,
  cy: number,
): { x: number; y: number; dentro: boolean } {
  const x = r.width ? ((cx - r.left) / r.width) * 2 - 1 : 0;
  const y = r.height ? ((cy - r.top) / r.height) * 2 - 1 : 0;
  return {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y)),
    dentro: Math.abs(x) <= 1 && Math.abs(y) <= 1,
  };
}

// botões do mouse (MouseEvent.buttons: 1 esquerdo, 4 do meio) → bits do ponteiro (0 esq, 2 meio); o direito fica pro menu
const bits = (b: number) => (b & 1) | (b & 4);

let ultimo = { x: 0, y: 0, b: 0, dentro: false };
function mandar(e: MouseEvent) {
  const alvo = querPonteiro();
  const tela = document.getElementById('tela');
  if (!alvo || !tela) return false;
  const p = posicaoNaImagem(tela.getBoundingClientRect(), e.clientX, e.clientY);
  const b = p.dentro ? bits(e.buttons) : 0;
  if (p.x === ultimo.x && p.y === ultimo.y && b === ultimo.b && p.dentro === ultimo.dentro) return p.dentro;
  ultimo = { x: p.x, y: p.y, b, dentro: p.dentro };
  alvo.ponteiro(p.x, p.y, b, p.dentro);
  return p.dentro;
}

/** Liga o mouse como ponteiro (main.tsx, uma vez). */
export function ligarPonteiro(): void {
  addEventListener('mousemove', mandar, { passive: true });
  addEventListener('mousedown', (e: MouseEvent) => {
    if (mandar(e) && e.button === 1) e.preventDefault(); // o do meio não vira "rolar a página"
  });
  addEventListener('mouseup', mandar);
}
