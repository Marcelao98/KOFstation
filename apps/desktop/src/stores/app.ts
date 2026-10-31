// O que o app sabe do backend (app.info), carregado na abertura.
import type { AppInfo } from '@kof/contracts';
import { create } from 'zustand';

export interface EstadoApp {
  info: AppInfo | null;
  setInfo: (i: AppInfo) => void;
}
export const usarApp = create<EstadoApp>()((set) => ({ info: null, setInfo: (info) => set({ info }) }));
