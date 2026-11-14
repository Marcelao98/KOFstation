// Controle virtual na tela do celular (#ctl do antigo, web/android.js): multitoque, 6 modelos, direcional que vira
// analógico nos consoles que têm. Cada dedo (pointerId) segura um botão; deslizar de um botão pro outro troca. Os bits
// vão pra `stores/toque` e o laço de entrada junta com o teclado e os controles. O desenho é o CSS do antigo
// (styles/celular.css), então a marcação (classes cb/dpad/shoulder/pill/face, data-b) é a mesma.
import { ANALOGICO, BOTAO } from '@kof/domain';
import { useEffect, useRef } from 'react';
import { emModoCelular } from '../app/celular';
import { usarJogo } from '../stores/jogo';
import { usarModo } from '../stores/modo';
import { usarRebob } from '../stores/rebob';
import { menuDoPc, usarMC } from '../stores/modoControle';
import { usarTelas } from '../stores/telas';
import { soltarToque, toque, usarToque } from '../stores/toque';

const BITS: Record<string, number> = {
  A: BOTAO.A,
  B: BOTAO.B,
  X: BOTAO.X,
  Y: BOTAO.Y,
  L: BOTAO.L,
  R: BOTAO.R,
  L2: BOTAO.L2,
  R2: BOTAO.R2,
  Start: BOTAO.Start,
  Select: BOTAO.Select,
};

/** Nome de cada botão no console do jogo aberto (o botão do SNES por baixo continua o mesmo: é o que o núcleo recebe). */
export const ROTULOS: Record<string, Record<string, string>> = {
  md: { Y: 'A', B: 'B', A: 'C', L: 'X', X: 'Y', R: 'Z', Select: 'MODE' },
  sms: { B: '1', A: '2', Start: 'PAUSE' },
  gg: { B: '1', A: '2' },
  neogeo: { B: 'A', A: 'B', Y: 'C', X: 'D', Select: 'FICHA' },
  ps1: { B: '✕', A: '○', Y: '□', X: '△', L: 'L1', R: 'R1' },
  ps2: { B: '✕', A: '○', Y: '□', X: '△', L: 'L1', R: 'R1' },
  n64: { B: 'A', Y: 'B', X: 'C▲', A: 'C▼', L: 'Z', R: 'R', L2: 'C◀', R2: 'C▶', Select: 'L' },
};

export const rotuloDe = (sistema: string, b: string): string =>
  ROTULOS[sistema]?.[b] ?? (b === 'Select' ? 'SELECT' : b === 'Start' ? 'START' : b);

/** Posição do dedo no direcional → bits de direção (zona morta no meio) e analógico. */
export function direcionalDoDedo(
  r: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
) {
  const dx = (x - (r.left + r.width / 2)) / (r.width / 2);
  const dy = (y - (r.top + r.height / 2)) / (r.height / 2);
  const d = Math.hypot(dx, dy);
  const mx = Math.max(-1, Math.min(1, dx));
  const my = Math.max(-1, Math.min(1, dy));
  let bits = 0;
  let nome = '';
  if (d > 0.22) {
    if (dx < -0.38) {
      bits |= BOTAO.Esquerda;
      nome += 'l ';
    }
    if (dx > 0.38) {
      bits |= BOTAO.Direita;
      nome += 'r ';
    }
    if (dy < -0.38) {
      bits |= BOTAO.Cima;
      nome += 'u ';
    }
    if (dy > 0.38) {
      bits |= BOTAO.Baixo;
      nome += 'd ';
    }
  }
  return { bits, nome: nome.trim(), ax: d > 1 ? dx / d : mx, ay: d > 1 ? dy / d : my };
}

interface Dedo {
  b: string;
  el: HTMLElement;
  dir: number;
}

export function ControleDeToque() {
  const raiz = useRef<HTMLDivElement>(null);
  const { modelo, tam, opa, canhoto, vibrar } = usarToque();
  const sisPc = usarMC((c) => c.sis);
  const emControle = usarMC((c) => c.ativo);
  const sistema = usarJogo((j) => j.info?.sistema ?? 'snes');
  const sisDosRotulos = emControle ? sisPc || 'ps1' : sistema;
  const temJogo = usarJogo((j) => !!j.jogo);
  const naTelaDoJogo = usarTelas((t) => t.atual) === 'jogo';
  const jogando = (temJogo && naTelaDoJogo) || emControle;

  useEffect(() => {
    document.body.classList.toggle('cel-jogo', jogando);
    document.body.classList.toggle('canhoto', canhoto);
    if (!jogando) soltarToque();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => {
      document.body.classList.remove('cel-jogo', 'canhoto');
    };
  }, [jogando, canhoto]);

  useEffect(() => {
    const ctl = raiz.current;
    if (!ctl) return;
    const dedos = new Map<number, Dedo>();
    const recalcular = () => {
      let b = 0;
      for (const f of dedos.values()) b |= (BITS[f.b] ?? 0) | f.dir;
      toque.bits = b;
    };
    const vibra = () => {
      if (usarToque.getState().vibrar && navigator.vibrate) navigator.vibrate(8);
    };
    const dir8 = (el: HTMLElement, x: number, y: number): number => {
      const r = direcionalDoDedo(el.getBoundingClientRect(), x, y);
      el.style.setProperty('--kx', String(r.ax));
      el.style.setProperty('--ky', String(r.ay));
      el.dataset.dir = r.nome;
      const an = ANALOGICO[usarJogo.getState().info?.sistema ?? 'snes'];
      if (an) {
        toque.eixos[0] = r.ax;
        toque.eixos[1] = r.ay;
        if (an === 'puro') return 0; // N64/PS2: só o analógico
      }
      return r.bits;
    };
    const soltar = (id: number) => {
      const f = dedos.get(id);
      if (!f) return;
      f.el.classList.remove('on');
      if (f.b === 'dpad') {
        f.el.dataset.dir = '';
        f.el.style.setProperty('--kx', '0');
        f.el.style.setProperty('--ky', '0');
        toque.eixos[0] = toque.eixos[1] = 0;
      }
      if (f.b === 'rew') usarRebob.setState({ tecla: false });
      if (f.b === 'turbo') usarJogo.getState().jogo?.turbo(false);
      dedos.delete(id);
      recalcular();
    };
    const apertar = (id: number, c: HTMLElement, x: number, y: number) => {
      const b = c.dataset.b ?? '';
      const f: Dedo = { b, el: c, dir: 0 };
      dedos.set(id, f);
      c.classList.add('on');
      vibra();
      const j = usarJogo.getState();
      if (b === 'dpad') f.dir = dir8(c, x, y);
      if (b === 'rew') usarRebob.setState({ tecla: true });
      if (b === 'turbo' && usarModo.getState().regras.turbo) j.jogo?.turbo(true);
      if (b === 'menu') {
        dedos.delete(id);
        c.classList.remove('on');
        if (usarMC.getState().ativo) return menuDoPc(); // jogando no PC: o menu é o do PC
        if (j.jogo && !j.rapidoAberto) j.abrirRapido();
        else if (j.rapidoAberto) j.fecharRapido();
        return;
      }
      recalcular();
    };
    const alvoSob = (x: number, y: number) =>
      (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('#ctl .cb') ?? null;
    const desce = (e: PointerEvent) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('.cb');
      if (!c) return;
      e.preventDefault();
      try {
        ctl.setPointerCapture(e.pointerId);
      } catch {
        // sem captura de ponteiro (o toque segue funcionando enquanto o dedo está sobre o controle)
      }
      apertar(e.pointerId, c, e.clientX, e.clientY);
    };
    const move = (e: PointerEvent) => {
      const f = dedos.get(e.pointerId);
      if (!f) return;
      if (f.b === 'dpad') {
        f.dir = dir8(f.el, e.clientX, e.clientY);
        recalcular();
        return;
      }
      const c = alvoSob(e.clientX, e.clientY);
      if (c && c !== f.el && c.dataset.b !== 'dpad' && c.dataset.b !== 'menu') {
        soltar(e.pointerId);
        apertar(e.pointerId, c, e.clientX, e.clientY);
      }
    };
    const solta = (e: PointerEvent) => soltar(e.pointerId);
    const soltarTudo = () => {
      for (const id of [...dedos.keys()]) soltar(id);
      soltarToque();
    };
    const semMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const escondeu = () => document.hidden && soltarTudo();
    ctl.addEventListener('pointerdown', desce);
    ctl.addEventListener('pointermove', move);
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) ctl.addEventListener(t, solta);
    ctl.addEventListener('contextmenu', semMenu);
    addEventListener('blur', soltarTudo);
    document.addEventListener('visibilitychange', escondeu);
    return () => {
      ctl.removeEventListener('pointerdown', desce);
      ctl.removeEventListener('pointermove', move);
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) ctl.removeEventListener(t, solta);
      ctl.removeEventListener('contextmenu', semMenu);
      removeEventListener('blur', soltarTudo);
      document.removeEventListener('visibilitychange', escondeu);
      soltarTudo();
    };
  }, []);

  if (!emModoCelular()) return null;
  const botao = (cls: string, b: string, rotulo?: string) => (
    <div className={`cb ${cls}`} data-b={b} role={rotulo ? 'button' : undefined}>
      {rotulo}
    </div>
  );
  const faixaOpa = modelo === 'minimo' ? Math.min(opa, 0.6) : opa;
  return (
    <div
      id="ctl"
      ref={raiz}
      className={`skin-${modelo}`}
      aria-label="controle virtual"
      data-vibrar={vibrar ? '1' : '0'}
      style={{ '--esc': tam, '--opa': faixaOpa } as React.CSSProperties}
    >
      <div className="cb dpad" data-b="dpad" data-dir="">
        {['h', 'v', 'u', 'd', 'l', 'r', 'k'].map((c) => (
          <i key={c} className={c} />
        ))}
      </div>
      {botao('shoulder', 'L', rotuloDe(sisDosRotulos, 'L'))}
      {botao('shoulder', 'R', rotuloDe(sisDosRotulos, 'R'))}
      {botao('shoulder', 'L2', rotuloDe(sisDosRotulos, 'L2'))}
      {botao('shoulder', 'R2', rotuloDe(sisDosRotulos, 'R2'))}
      {botao('pill', 'Select', rotuloDe(sisDosRotulos, 'Select'))}
      {botao('pill', 'Start', rotuloDe(sisDosRotulos, 'Start'))}
      {botao('face', 'Y', rotuloDe(sisDosRotulos, 'Y'))}
      {botao('face', 'X', rotuloDe(sisDosRotulos, 'X'))}
      {botao('face', 'B', rotuloDe(sisDosRotulos, 'B'))}
      {botao('face', 'A', rotuloDe(sisDosRotulos, 'A'))}
      {botao('menu', 'menu', '☰')}
      {botao('rew', 'rew', '⏪')}
      {botao('turbo', 'turbo', '⏩')}
    </div>
  );
}
