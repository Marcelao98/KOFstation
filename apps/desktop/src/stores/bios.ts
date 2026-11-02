// 🔑 BIOS dos consoles (abrirBiosTela/pedirBios/escolherBios do antigo): a lista dos consoles com BIOS, escolher ou
// trocar; e o "falta a BIOS" ao abrir um jogo de Neo Geo sem o neogeo.zip (escolhida, o jogo abre).
import { guardarBios, listarBios, registrar, textoDoErro, type BiosGuardada } from '@kof/app-core';
import type { SistemaId } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { servicos } from './servicos';
import { usarTelas } from './telas';

export interface Bios {
  lista: BiosGuardada[];
  /** abriu por falta da BIOS desse console */
  falta: SistemaId | null;
  mostrar: () => Promise<void>;
  pedir: (sistema: SistemaId, depois: () => Promise<unknown>) => Promise<void>;
  escolher: (sistema?: SistemaId) => void;
  /** relê o que está guardado (sem mudar o motivo da tela) */
  atualizar: () => Promise<void>;
  fechar: () => void;
}

let esperando: (() => Promise<unknown>) | null = null;

export const usarBios = create<Bios>()((set, get) => ({
  lista: [],
  falta: null,
  mostrar: async () => {
    esperando = null;
    set({ falta: null });
    usarTelas.getState().abrir('bios-tela');
    await recarregar();
  },
  pedir: async (sistema, depois) => {
    esperando = depois;
    set({ falta: sistema });
    usarTelas.getState().abrir('bios-tela');
    await recarregar();
  },
  escolher: (pedido) => {
    const e = document.createElement('input');
    e.type = 'file';
    e.onchange = async () => {
      const f = e.files?.[0];
      if (!f) return;
      const av = usarAvisos.getState();
      try {
        const b = await guardarBios(servicos().armazem, f.name, new Uint8Array(await f.arrayBuffer()), pedido);
        av.avisar(`✅ BIOS guardada (${b.nome})`, 4000);
        await recarregar();
        const depois = esperando;
        if (depois && get().falta === b.sistema) {
          esperando = null;
          set({ falta: null });
          usarTelas.getState().sair();
          await depois();
        }
      } catch (er) {
        registrar('warn', 'bios', textoDoErro(er));
        av.avisarErro(er instanceof Error ? er.message : String(er));
      }
    };
    e.click();
  },
  atualizar: () => recarregar(),
  fechar: () => {
    esperando = null;
    set({ falta: null });
    usarTelas.getState().sair();
  },
}));

async function recarregar() {
  try {
    usarBios.setState({ lista: await listarBios(servicos().armazem) });
  } catch (e) {
    registrar('warn', 'bios', textoDoErro(e));
  }
}
