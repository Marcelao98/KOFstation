// Os controles que valem agora (aplicarControles do antigo): o mapa do console e do jogo aberto, refeito ao abrir um jogo
// e quando a tela Controles muda alguma coisa. Sem jogo, vale o do SNES.
import { montarEntrada, type Entrada } from '@kof/domain';
import { create } from 'zustand';
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

depoisDeAbrirJogo.add(() => usarEntrada.getState().aplicar());
