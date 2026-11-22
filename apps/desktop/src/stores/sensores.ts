// 📱 O celular como Wiimote (W.6), do lado do CELULAR: lê o acelerômetro e o giroscópio (`devicemotion`; a página do
// APK é segura, então o navegador entrega sem pedir) e calcula a mira. O modo controle manda junto dos botões, no
// canal `pad`, só quando o jogo aberto no PC é de Wii.
import { acelDoCelular, giroDoCelular, Mira, type MovimentoWii } from '@kof/domain';

const mira = new Mira();
let ligado = false;
let ultimo: MovimentoWii | null = null;
let quando = 0;
let antes = 0;
/** null = ainda não sabe; false = o celular não tem giroscópio (a mira vai pela inclinação) */
let giroscopio: boolean | null = null;

function aoMexer(ev: DeviceMotionEvent) {
  const a = ev.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null || a.z == null) return;
  const acel = acelDoCelular(a.x, a.y, a.z);
  const r = ev.rotationRate;
  const giro =
    r && r.alpha != null && r.beta != null && r.gamma != null ? giroDoCelular(r.alpha, r.beta, r.gamma) : null;
  giroscopio = !!giro;
  const agora = performance.now();
  const dt = antes ? (agora - antes) / 1000 : 0;
  antes = agora;
  const p = mira.atualizar(acel, giro, dt);
  ultimo = { acel, giro: giro ?? [0, 0, 0], x: p.x, y: p.y };
  quando = agora;
}

/** Liga ou desliga os sensores (ligar recentra a mira: como o celular está agora é o meio da tela). */
export function ligarSensores(sim: boolean): void {
  if (sim === ligado || typeof window === 'undefined') return;
  ligado = sim;
  if (sim) {
    mira.recentrar();
    antes = 0;
    addEventListener('devicemotion', aoMexer);
  } else {
    removeEventListener('devicemotion', aoMexer);
    ultimo = null;
  }
}

/** O movimento de agora, ou null se os sensores calaram (mais de 150 ms). */
export function movimentoAgora(): MovimentoWii | null {
  return ultimo && performance.now() - quando < 150 ? ultimo : null;
}

/** O celular tem giroscópio? (null até o primeiro movimento) */
export const temGiroscopio = (): boolean | null => giroscopio;

/** Recentrar a mira (o meio da tela é pra onde o celular aponta agora). */
export const recentrarMira = (): void => mira.recentrar();
