// 📱 O celular como Wiimote (W.6), do lado do CELULAR: lê o acelerômetro e o giroscópio (`devicemotion`; a página do
// APK é segura, então o navegador entrega sem pedir) e calcula a mira. O modo controle manda junto dos botões, no
// canal `pad`, só quando o jogo aberto no PC é de Wii.
import { acelDoCelular, giroDoCelular, Mira, type MovimentoWii } from '@kof/domain';
import { usarAvisos } from './avisos';
import { config } from './config';

const mira = new Mira();
let ligado = false;
let ultimo: MovimentoWii | null = null;
let quando = 0;
let antes = 0;
/** null = ainda não sabe; false = o celular não tem giroscópio (a mira vai pela inclinação) */
let giroscopio: boolean | null = null;
/** 22/11: o meio da mira é marcado no 1º botão apertado (não mais na posição em que o celular estava ao ligar) */
let esperandoBotao = false;
/** pra depuração: leituras do sensor no último segundo */
let leituras = 0;
let hz = 0;
let contouEm = 0;

function aoMexer(ev: DeviceMotionEvent) {
  const a = ev.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null || a.z == null) return;
  const acel = acelDoCelular(a.x, a.y, a.z);
  const r = ev.rotationRate;
  const giro =
    r && r.alpha != null && r.beta != null && r.gamma != null ? giroDoCelular(r.alpha, r.beta, r.gamma) : null;
  giroscopio = !!giro;
  const agora = performance.now();
  leituras++;
  if (agora - contouEm >= 1000) {
    hz = Math.round((leituras * 1000) / Math.max(1, agora - contouEm));
    leituras = 0;
    contouEm = agora;
  }
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
    mira.sensibilidade(sensibilidadeMira());
    mira.recentrar();
    esperandoBotao = true;
    leituras = 0;
    hz = 0;
    contouEm = performance.now();
    // calibrar é opcional: só oferece (o 🎯 da barra do controle)
    usarAvisos
      .getState()
      .avisar('🎮 Este celular é o Wiimote. Aponte pra TV e aperte um botão: ali é o meio da mira (🎯 calibra)', 6000);
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

/** Calibração (opcional): a sensibilidade da mira deste celular (1 = padrão), guardada nele. */
export function sensibilidadeMira(): number {
  const v = Number(config().ler('wiiSensibilidade') ?? '1');
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function guardarSensibilidadeMira(v: number): number {
  const s = Math.round(Math.max(0.25, Math.min(3, v)) * 100) / 100;
  config().guardar('wiiSensibilidade', String(s));
  mira.sensibilidade(s);
  return s;
}

/** Os sensores estão ligados (o celular é o Wiimote agora)? */
export const sensoresLigados = (): boolean => ligado;

/** O 1º botão apertado depois de ligar marca o meio da mira (o celular está apontado pra TV nessa hora). */
export function centrarNoBotao(botoes: number): void {
  if (!esperandoBotao || !botoes) return;
  esperandoBotao = false;
  mira.recentrar();
}

/** Mira pelo dedo (dx, dy em fração da área de arrastar). */
export function arrastarMira(dx: number, dy: number): void {
  const p = mira.arrastar(dx, dy);
  if (ultimo) ultimo = { ...ultimo, x: p.x, y: p.y };
}

/** Pra tela de depuração do Wiimote. */
export function depuracaoWiimote() {
  return {
    ligado,
    giroscopio,
    hz,
    forca: mira.forca,
    chacoalhando: mira.chacoalhando,
    meioMarcado: !esperandoBotao,
    sens: sensibilidadeMira(),
    mov: movimentoAgora(),
  };
}
