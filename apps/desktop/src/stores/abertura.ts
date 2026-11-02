// A abertura da primeira vez (app.js 2104–2204 do antigo): aparece uma vez pra todo mundo (boasVindas = '2' depois de
// vista); Ajuda → Boas-vindas reabre. Nos testes automáticos só aparece se o teste pedir (window.__kofAbertura).
import { create } from 'zustand';
import { config } from './config';
import { usarJogo } from './jogo';
import { usarJukebox } from './jukebox';
import { usarTelas } from './telas';

export interface Abertura {
  aberta: boolean;
  abrir: () => void;
  fechar: (fimDoGuia: boolean) => void;
}

export const usarAbertura = create<Abertura>()((set, get) => ({
  aberta: false,
  abrir: () => {
    const j = usarJogo.getState();
    if (j.jogo && !j.pausaManual) j.alternarPausa();
    set({ aberta: true });
    void usarJukebox.getState().tocarInicio(true); // o Air (Bach) em violino
  },
  fechar: (fimDoGuia) => {
    if (!get().aberta) return;
    set({ aberta: false });
    config().guardar('boasVindas', '2');
    if (fimDoGuia && !usarJogo.getState().jogo) {
      usarJukebox.getState().pararInicio();
      usarTelas.getState().abrir('home');
      void usarJukebox.getState().tocarInicio();
    }
  },
}));

/** Na abertura do app: mostra a abertura se ainda não viu. */
export function primeiraVez(): void {
  if (config().ler('boasVindas') === '2') return;
  if (navigator.webdriver && !(globalThis as { __kofAbertura?: boolean }).__kofAbertura) return;
  usarAbertura.getState().abrir();
}
