// 📱 O celular como Wiimote (W.6), do lado do CELULAR: lê o acelerômetro e o giroscópio (`devicemotion`; a página do
// APK é segura, então o navegador entrega sem pedir) e calcula a mira. O modo controle manda junto dos botões, no
// canal `pad`, só quando a vaga deste celular na 🎲 Mesa é Wiimote e ele está calibrado (M.4: nada liga sozinho).
// A calibração (M.4) vale aqui, antes de mandar: a mira, o chacoalhar e a posição (de lado, canhoto).
import {
  acelDoCelular,
  ajusteDaMira,
  Chacoalho,
  eixosDaPosicao,
  giroDoCelular,
  lerCalibracao,
  Mira,
  type CalibracaoWii,
  type MovimentoWii,
} from '@kof/domain';
import { config } from './config';

// a configuração carrega depois dos módulos: a calibração guardada é lida no primeiro uso
let calibracao: CalibracaoWii | null | undefined;
const mira = new Mira();
const chacoalho = new Chacoalho();
function cal(): CalibracaoWii | null {
  if (calibracao === undefined) {
    calibracao = lerCalibracao(config().ler('wiimote.calibracao'));
    mira.ajustar(ajusteDaMira(calibracao));
    chacoalho.ajustar(calibracao?.ganhoChacoalhar ?? 1);
  }
  return calibracao;
}
let ligado = false;
let ultimo: MovimentoWii | null = null;
let quando = 0;
let antes = 0;
/** null = ainda não sabe; false = o celular não tem giroscópio (a mira vai pela inclinação) */
let giroscopio: boolean | null = null;
/** quem mais quer os sensores agora (o assistente de calibração mede com eles ligados) */
const ouvintes = new Set<(m: MovimentoWii, cru: { x: number; y: number }) => void>();

function aoMexer(ev: DeviceMotionEvent) {
  const a = ev.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null || a.z == null) return;
  const pos = cal() ?? { mao: 'destro' as const, posicao: 'apontar' as const };
  const cru = eixosDaPosicao(acelDoCelular(a.x, a.y, a.z), pos);
  const r = ev.rotationRate;
  const giro =
    r && r.alpha != null && r.beta != null && r.gamma != null
      ? eixosDaPosicao(giroDoCelular(r.alpha, r.beta, r.gamma), pos)
      : null;
  giroscopio = !!giro;
  const agora = performance.now();
  const dt = antes ? (agora - antes) / 1000 : 0;
  antes = agora;
  const p = mira.atualizar(cru, giro, dt);
  ultimo = { acel: chacoalho.aplicar(cru), giro: giro ?? [0, 0, 0], x: p.x, y: p.y };
  quando = agora;
  for (const f of ouvintes) f(ultimo, mira.angulos());
}

function escutar() {
  const quer = ligado || ouvintes.size > 0;
  if (typeof window === 'undefined') return;
  removeEventListener('devicemotion', aoMexer);
  if (quer) addEventListener('devicemotion', aoMexer);
  else ultimo = null;
}

/** Liga ou desliga os sensores (ligar recentra a mira: como o celular está agora é o meio da tela). */
export function ligarSensores(sim: boolean): void {
  if (sim === ligado) return;
  ligado = sim;
  cal();
  if (sim) {
    mira.recentrar();
    antes = 0;
  }
  escutar();
}

/** Os sensores estão indo pro PC agora? */
export const sensoresLigados = (): boolean => ligado;

/** O assistente de calibração ouve os sensores (devolve como parar). */
export function ouvirSensores(f: (m: MovimentoWii, cru: { x: number; y: number }) => void): () => void {
  ouvintes.add(f);
  escutar();
  return () => {
    ouvintes.delete(f);
    escutar();
  };
}

/** O movimento de agora, ou null se os sensores calaram (mais de 150 ms). */
export function movimentoAgora(): MovimentoWii | null {
  return ligado && ultimo && performance.now() - quando < 150 ? ultimo : null;
}

/** O celular tem giroscópio? (null até o primeiro movimento) */
export const temGiroscopio = (): boolean | null => giroscopio;

/** Recentrar a mira (o meio da tela é pra onde o celular aponta agora). */
export const recentrarMira = (): void => mira.recentrar();

/** A calibração deste celular (null = nunca calibrou). */
export const calibracaoAtual = (): CalibracaoWii | null => cal();

/** Guarda a calibração (ou apaga, com null) e já usa. */
export function guardarCalibracao(c: CalibracaoWii | null): void {
  calibracao = c;
  if (c) config().guardar('wiimote.calibracao', JSON.stringify(c));
  else config().apagar('wiimote.calibracao');
  mira.ajustar(ajusteDaMira(c));
  chacoalho.ajustar(c?.ganhoChacoalhar ?? 1);
  mira.recentrar();
}

/** Pro assistente: a mira medindo sem borda (os ângulos crus) ou com um ajuste de teste. */
export function ajustarMiraDeTeste(a: Parameters<Mira['ajustar']>[0] | null): void {
  mira.ajustar(a ?? ajusteDaMira(cal()));
  mira.recentrar();
}
