// Modo de jogo (alegria/normal/raiz/hardcore), a pergunta ao abrir um jogo e as regras que valem agora.
import { modoValido, nomeModo, rebobNormalDe, regrasDoModo, type ModoId, type RegrasDoModo } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { trocarRegraDeEstados } from './estados';
import { depoisDeAbrirJogo, usarJogo } from './jogo';

export interface EstadoModo {
  modo: ModoId;
  regras: RegrasDoModo;
  /** a escolha do modo está na tela (#modo-tela) */
  perguntando: boolean;
  mudar: (m: ModoId, quieto?: boolean) => void;
  perguntar: () => void;
  escolher: (m: ModoId, perguntarDeNovo: boolean) => void;
  aplicar: () => void;
}

const calcular = (m: ModoId) => regrasDoModo(m, rebobNormalDe(config().ler('rebobLimite')));
let perguntado = { id: '', quando: 0 };

export const usarModo = create<EstadoModo>()((set, get) => {
  const modo = modoValido(config().ler('modo'));
  return {
    modo,
    regras: calcular(modo),
    perguntando: false,
    aplicar: () => {
      const regras = calcular(get().modo);
      set({ regras });
      document.body.dataset.modo = get().modo;
      if (!regras.turbo) usarJogo.getState().jogo?.turbo(false);
    },
    mudar: (m, quieto) => {
      config().guardar('modo', m);
      set({ modo: m });
      get().aplicar();
      if (!quieto) usarAvisos.getState().avisar('modo ' + nomeModo(m), 2000);
    },
    perguntar: () => {
      get().aplicar();
      if (config().ler('modoPerguntar') === '0') return;
      // testes automáticos: só o teste dos modos quer ver a escolha (window.__kofModo), como no antigo
      if (navigator.webdriver && !(window as { __kofModo?: boolean }).__kofModo) return;
      const id = usarJogo.getState().registro?.id ?? '';
      if (perguntado.id === id && Date.now() - perguntado.quando < 10000) return; // o mesmo jogo reaberto logo em seguida
      perguntado = { id, quando: Date.now() };
      set({ perguntando: true });
    },
    escolher: (m, perguntarDeNovo) => {
      if (!perguntarDeNovo) {
        config().guardar('modoPerguntar', '0');
        usarAvisos
          .getState()
          .avisar('não vou mais perguntar: o modo fica em Estados salvos → Opções de emulação', 4000);
      }
      set({ perguntando: false });
      get().mudar(m, false);
    },
  };
});

trocarRegraDeEstados(() => usarModo.getState().regras.estados);
queueMicrotask(() => usarModo.getState().aplicar());
depoisDeAbrirJogo.add(() => usarModo.getState().perguntar());
