// O #aviso do antigo: uma linha que some sozinha (1,8 s) ou um erro que fica até fechar.
import { create } from 'zustand';

export interface Avisos {
  texto: string | null;
  erro: boolean;
  avisar: (t: string, ms?: number) => void;
  avisarErro: (t: string) => void;
  fechar: () => void;
}

let relogio: ReturnType<typeof setTimeout> | undefined;
export const usarAvisos = create<Avisos>()((set, get) => ({
  texto: null,
  erro: false,
  avisar: (texto, ms = 1800) => {
    if (get().erro && get().texto) return; // um erro na tela não some por causa de um aviso comum
    clearTimeout(relogio);
    set({ texto, erro: false });
    relogio = setTimeout(() => set({ texto: null }), ms);
  },
  avisarErro: (texto) => {
    clearTimeout(relogio);
    set({ texto, erro: true });
    relogio = setTimeout(() => set({ texto: null, erro: false }), 120000);
  },
  fechar: () => set({ texto: null, erro: false }),
}));
