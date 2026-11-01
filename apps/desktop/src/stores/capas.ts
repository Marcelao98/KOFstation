// Capas oficiais e modo sofá (grade de capas em tela cheia, feita pro controle).
import { criarCapas, type Capas } from '@kof/app-core';
import { create } from 'zustand';
import { servicos } from './servicos';

const ler = (k: string) => {
  try {
    return localStorage.getItem('kofstation.' + k);
  } catch {
    return null;
  }
};
const guardar = (k: string, v: string) => {
  try {
    localStorage.setItem('kofstation.' + k, v);
  } catch {
    // sem armazenamento: vale até fechar
  }
};

export interface EstadoCapas {
  /** muda quando chega uma capa (as telas redesenham) */
  versao: number;
  ligadas: boolean;
  sofa: boolean;
  alternarCapas: () => void;
  alternarSofa: () => void;
}

export const usarCapas = create<EstadoCapas>()((set, get) => ({
  versao: 0,
  ligadas: ler('capas') !== '0',
  sofa: ler('sofa') === '1',
  alternarCapas: () => {
    const ligadas = !get().ligadas;
    guardar('capas', ligadas ? '1' : '0');
    set({ ligadas, versao: get().versao + 1 });
  },
  alternarSofa: () => {
    const sofa = !get().sofa;
    guardar('sofa', sofa ? '1' : '0');
    set({ sofa });
    document.body.classList.toggle('sofa', sofa);
    if (sofa && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined); // sem tela cheia: segue em janela
  },
}));

let capas: Capas | null = null;
let aviso: ReturnType<typeof setTimeout> | undefined;
export function capasDoApp(): Capas {
  capas ??= criarCapas(
    servicos().backend,
    () => {
      clearTimeout(aviso); // várias capas chegando juntas: redesenha uma vez só
      aviso = setTimeout(() => usarCapas.setState({ versao: usarCapas.getState().versao + 1 }), 60);
    },
    () => usarCapas.getState().ligadas,
  );
  return capas;
}
