// Controle de toque do celular (M14.2): estado do que os dedos seguram e as preferências (as chaves do antigo:
// ctlModelo, ctlTam, ctlOpa, ctlVibrar, ctlCanhoto). Os dedos escrevem em `toque`; o laço de entrada
// (hooks/useEntradaDoJogo) lê daqui junto do teclado e dos controles.
import { create } from 'zustand';
import { config } from './config';

export const MODELOS = [
  ['classico', 'Clássico SNES'],
  ['moderno', 'Moderno'],
  ['minimo', 'Minimalista'],
  ['arcade', 'Arcade'],
  ['portatil', 'Portátil'],
  ['tema', 'Segue o tema'],
] as const;
export type ModeloId = (typeof MODELOS)[number][0];

/** O que os dedos seguram agora: bits do registrador do SNES, eixos do analógico e os atalhos do controle. */
export const toque = { bits: 0, eixos: [0, 0, 0, 0] as number[], rebobinar: false, turbo: false };

export interface PrefsDeToque {
  modelo: ModeloId;
  tam: number;
  opa: number;
  vibrar: boolean;
  canhoto: boolean;
}

const num = (k: string, p: number, min: number, max: number): number => {
  const v = parseFloat(config().ler(k) ?? '');
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : p;
};

export const PADRAO_DE_TOQUE: PrefsDeToque = { modelo: 'classico', tam: 1, opa: 1, vibrar: true, canhoto: false };

function ler(): PrefsDeToque {
  const m = config().ler('ctlModelo');
  return {
    modelo: MODELOS.find(([k]) => k === m)?.[0] ?? 'classico',
    tam: num('ctlTam', 1, 0.7, 1.4),
    opa: num('ctlOpa', 1, 0.25, 1),
    vibrar: config().ler('ctlVibrar') !== '0',
    canhoto: config().ler('ctlCanhoto') === '1',
  };
}

interface EstadoDeToque extends PrefsDeToque {
  mudar: (p: Partial<PrefsDeToque>) => void;
  restaurar: () => void;
}

export const usarToque = create<EstadoDeToque>()((set) => ({
  ...ler(),
  mudar: (p) => {
    const c = config();
    if (p.modelo !== undefined) c.guardar('ctlModelo', p.modelo);
    if (p.tam !== undefined) c.guardar('ctlTam', String(p.tam));
    if (p.opa !== undefined) c.guardar('ctlOpa', String(p.opa));
    if (p.vibrar !== undefined) c.guardar('ctlVibrar', p.vibrar ? '1' : '0');
    if (p.canhoto !== undefined) c.guardar('ctlCanhoto', p.canhoto ? '1' : '0');
    set(p);
  },
  restaurar: () => {
    for (const k of ['ctlModelo', 'ctlTam', 'ctlOpa', 'ctlVibrar', 'ctlCanhoto']) config().apagar(k);
    set({ ...PADRAO_DE_TOQUE });
  },
}));

/** Os dedos soltaram tudo (saiu do app, abriu uma tela). */
export function soltarToque() {
  toque.bits = 0;
  toque.eixos[0] = toque.eixos[1] = toque.eixos[2] = toque.eixos[3] = 0;
  toque.rebobinar = false;
  toque.turbo = false;
}
