// Showcase dos temas (lento 3,5 s / rápido 0,5 s por tema), como no antigo: passa pelos temas filtrados na galeria,
// "Ficar com este" escolhe o da tela, "Parar"/Esc volta pro de antes.
import { TODOS_TEMAS, nomeDoTema, type Tema } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { usarPrefs } from './prefs';

export interface Showcase {
  ativo: boolean;
  lista: readonly Tema[];
  i: number;
  iniciar: (lista: readonly Tema[], ms: number) => void;
  parar: (ficar: boolean) => void;
}

let relogio: ReturnType<typeof setInterval> | undefined;
let fim: ReturnType<typeof setTimeout> | undefined;

export const usarShowcase = create<Showcase>()((set, get) => ({
  ativo: false,
  lista: [],
  i: 0,
  iniciar: (lista, ms) => {
    if (get().ativo) return;
    clearTimeout(fim);
    const l = lista.length ? lista : TODOS_TEMAS;
    const i0 = Math.max(
      0,
      l.findIndex(([id]) => id === usarPrefs.getState().tema),
    );
    const html = document.documentElement.classList;
    html.add('showcase');
    html.toggle('showcase-rapido', ms < 1000);
    const passar = (i: number) => {
      const t = l[i % l.length];
      if (t) usarPrefs.getState().experimentarTema(t[0]);
      set({ i });
    };
    set({ ativo: true, lista: l });
    passar(i0);
    relogio = setInterval(() => passar(get().i + 1), ms);
  },
  parar: (ficar) => {
    if (!get().ativo) return;
    clearInterval(relogio);
    const p = usarPrefs.getState();
    if (ficar) {
      p.escolherTema(p.temaNaTela);
      usarAvisos.getState().avisar('🎨 tema: ' + (nomeDoTema(p.temaNaTela) ?? p.temaNaTela));
    } else p.desfazerExperimento();
    set({ ativo: false });
    fim = setTimeout(() => document.documentElement.classList.remove('showcase', 'showcase-rapido'), 700);
  },
}));
