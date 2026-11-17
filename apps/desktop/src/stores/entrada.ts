// Os controles que valem agora (aplicarControles do antigo): o mapa do console e do jogo aberto, refeito ao abrir um jogo
// e quando a tela Controles muda alguma coisa. Sem jogo, vale o do SNES.
import { acoesDe, ANALOGICO, dicaDoDirecional, montarEntrada, type Entrada } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { depoisDeAbrirJogo, usarJogo } from './jogo';

export const sisAtual = (): string => usarJogo.getState().info?.sistema ?? 'snes';

export interface EstadoEntrada {
  entrada: Entrada;
  /** a tela Controles está esperando uma tecla ou um botão */
  capturando: { nome: string; tipo: 'tecla' | 'botao'; solto: boolean; ate: number } | null;
  aplicar: () => void;
}

const calcular = () =>
  montarEntrada((k) => config().ler(k), sisAtual(), usarJogo.getState().jogo ? usarJogo.getState().registro?.id : null);

export const usarEntrada = create<EstadoEntrada>()((set) => ({
  entrada: calcular(),
  capturando: null,
  aplicar: () => set({ entrada: calcular() }),
}));

/**
 * As marcas do console no <body>, como o abrirBytes do antigo (app.js 2479–2483), que o CSS do celular usa:
 * `data-sis` (L2/R2 só no PlayStation/N64, sem ⏪ no PS1/N64), `analogico` (o direcional de toque vira joystick: PS1/PS2/N64),
 * `so-ab` (console sem X/Y: GB, NES, SMS, GG, GBA) e `nativo` (núcleo nativo: sem ⏩).
 */
export function marcarConsole(sis: string, nativo: boolean): void {
  const b = document.body;
  b.dataset.sis = sis;
  b.classList.toggle('analogico', !!ANALOGICO[sis]);
  b.classList.toggle('so-ab', !acoesDe(sis).includes('X'));
  b.classList.toggle('nativo', nativo);
}

let dicaDada = false;
depoisDeAbrirJogo.add(() => {
  usarEntrada.getState().aplicar();
  // uma vez por abertura do app: no PS2 o direcional não está nas setas (os menus do cartão só leem ele)
  const dica = dicaDada ? null : dicaDoDirecional(usarEntrada.getState().entrada, sisAtual());
  if (dica) {
    dicaDada = true;
    usarAvisos.getState().avisar(dica, 6000);
  }
  marcarConsole(sisAtual(), !!(usarJogo.getState().jogo as { nativo?: boolean } | null)?.nativo);
});
