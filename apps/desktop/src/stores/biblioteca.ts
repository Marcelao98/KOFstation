// A biblioteca (☕ Biblioteca do antigo): jogos já abertos + a pasta Kof Games, busca, seleção e o que acontece ao
// jogar. A pasta é lida uma vez por sessão (em segundo plano); "Reler e organizar" lê de novo.
import {
  aplicarPlano,
  bytesDaPasta,
  bytesDoJogo,
  escolherRaiz,
  listarJogos,
  obterRaiz,
  paraBackendError,
  planejarKofGames,
  registrar,
  textoDoErro,
  varrerKofGames,
  type ArquivoKof,
  type InfoRaiz,
} from '@kof/app-core';
import { carregarBaseDeJogos } from '@kof/app-core';
import {
  consulta,
  juntarItens,
  ordenar,
  ORDENS,
  passa,
  type BaseDeJogos,
  type FacetaId,
  type Filtros,
  type ItemBiblioteca,
  type Ordem,
  type RegistroJogo,
} from '@kof/domain';
import type { Plano } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { usarJogo } from './jogo';
import { servicos } from './servicos';
import { usarTelas } from './telas';

const lerConfig = (k: string) => {
  try {
    return localStorage.getItem('kofstation.' + k);
  } catch {
    return null;
  }
};
const guardarConfig = (k: string, v: string) => {
  try {
    localStorage.setItem('kofstation.' + k, v);
  } catch {
    // sem armazenamento: vale até fechar
  }
};

export interface Biblioteca {
  itens: ItemBiblioteca[];
  visiveis: ItemBiblioteca[];
  selecionada: number;
  texto: string;
  soPrincipais: boolean;
  escondidas: number;
  /** linha de estado (#bib-estado) */
  estado: string;
  raiz: InfoRaiz | null;
  pasta: ArquivoKof[] | null;
  lendo: boolean;
  /** quantos estados salvos cada jogo tem (💾 N na lista) */
  contagem: Record<string, number>;
  plano: Plano | null;
  pedirPasta: boolean;
  base: BaseDeJogos | null;
  filtros: Filtros;
  ordem: Ordem;
  mudarFiltro: (id: FacetaId, v: string) => void;
  mudarOrdem: (o: Ordem) => void;
  mostrar: (relerPasta?: boolean) => Promise<void>;
  filtrar: (texto: string) => void;
  selecionar: (i: number) => void;
  jogar: (doZero?: boolean, r?: ItemBiblioteca) => Promise<void>;
  alternarPrincipais: () => void;
  abrirPedirPasta: () => void;
  fecharPedirPasta: () => void;
  usarPasta: (caminho: string) => Promise<boolean>;
  organizar: () => Promise<void>;
  aplicarOrganizacao: () => Promise<void>;
  cancelarOrganizacao: () => void;
  montarLista: () => void;
}

let organizado = false;
let lendoPasta: Promise<void> | null = null;

export const usarBiblioteca = create<Biblioteca>()((set, get) => ({
  itens: [],
  visiveis: [],
  selecionada: 0,
  texto: '',
  soPrincipais: lerConfig('soPrincipais') !== '0',
  escondidas: 0,
  estado: '',
  raiz: null,
  pasta: null,
  lendo: false,
  contagem: {},
  plano: null,
  pedirPasta: false,
  base: null,
  filtros: {},
  ordem: ((o) => (ORDENS.some(([k]) => k === o) ? o : 'padrao') as Ordem)(lerConfig('bibOrdem')),
  mudarFiltro: (id, v) => {
    set({ filtros: { ...get().filtros, [id]: v }, selecionada: 0 });
    get().montarLista();
  },
  mudarOrdem: (ordem) => {
    guardarConfig('bibOrdem', ordem);
    set({ ordem, selecionada: 0 });
    get().montarLista();
  },

  montarLista: () => {
    const { itens, texto, soPrincipais, filtros, base, ordem } = get();
    const q = consulta(texto);
    let escondidas = 0;
    const visiveis = itens.filter((r) => {
      if (!passa(r, q, filtros, base)) return false;
      if (soPrincipais && r.variante) {
        escondidas++;
        return false;
      }
      return true;
    });
    ordenar(visiveis, ordem);
    const selecionada = Math.max(0, Math.min(get().selecionada, visiveis.length - 1));
    set({ visiveis, escondidas, selecionada });
  },

  mostrar: async (relerPasta = false) => {
    const { armazem, backend } = servicos();
    let jogos: RegistroJogo[] = [];
    try {
      jogos = await listarJogos(armazem);
      const contagem: Record<string, number> = {};
      for (const e of await armazem.listar<{ jogo: string }>('estados'))
        if (e.meta?.jogo) contagem[e.meta.jogo] = (contagem[e.meta.jogo] ?? 0) + 1;
      set({ contagem });
    } catch (e) {
      registrar('warn', 'biblioteca', `sem o registro dos jogos: ${textoDoErro(e)}`);
    }
    const atual = usarJogo.getState().registro?.id;
    const juntar = () => {
      const antes = get().visiveis[get().selecionada];
      const itens = juntarItens(jogos, get().pasta ?? []);
      set({ itens });
      get().montarLista();
      const k = antes ? get().visiveis.indexOf(antes) : -1;
      const j = get().visiveis.findIndex((r) => r.jogo?.id === atual);
      if (k < 0 && j >= 0) set({ selecionada: j });
    };
    set({ texto: '', selecionada: 0, filtros: {} });
    juntar();
    if (!get().base)
      void carregarBaseDeJogos(new URL('nucleos/jogos.js', document.baseURI)).then((base) => {
        if (!base) return;
        set({ base });
        juntar();
      });
    if (get().pasta && !relerPasta) return;
    if (lendoPasta) return lendoPasta;
    lendoPasta = (async () => {
      try {
        const raiz = await obterRaiz(backend);
        set({ raiz });
        if (!raiz.path || !raiz.ok) return;
        if (!organizado || relerPasta) {
          organizado = true;
          await get().organizar();
        }
        set({ lendo: true, estado: '📁 lendo Kof Games/Games…' });
        set({ pasta: await varrerKofGames(backend) });
        juntar();
      } catch (e) {
        const b = paraBackendError(e);
        if (b.code !== 'ROOT_MISSING') usarAvisos.getState().avisarErro(`não consegui ler a Kof Games: ${b.message}`);
      } finally {
        set({ lendo: false, estado: '' });
        lendoPasta = null;
      }
    })();
    return lendoPasta;
  },

  filtrar: (texto) => {
    set({ texto, selecionada: 0 });
    get().montarLista();
  },
  selecionar: (i) => set({ selecionada: Math.max(0, Math.min(i, get().visiveis.length - 1)) }),

  jogar: async (doZero = false, item) => {
    const r = item ?? get().visiveis[get().selecionada];
    if (!r) return;
    const { backend, armazem } = servicos();
    try {
      void doZero; // "começar do zero" só muda alguma coisa com o Continuar (M5.3)
      if (r.jogo) {
        const aberto = await bytesDoJogo(backend, armazem, r.jogo);
        await usarJogo.getState().abrirJogo(aberto, r.jogo.path ? { path: r.jogo.path } : {});
      } else if (r.pasta) {
        const aberto = await bytesDaPasta(backend, r.pasta);
        await usarJogo.getState().abrirJogo(aberto, { path: r.pasta.path });
      }
    } catch (e) {
      usarAvisos.getState().avisarErro(e instanceof Error ? e.message : paraBackendError(e).message);
    }
  },

  alternarPrincipais: () => {
    const soPrincipais = !get().soPrincipais;
    guardarConfig('soPrincipais', soPrincipais ? '1' : '0');
    set({ soPrincipais });
    get().montarLista();
  },

  abrirPedirPasta: () => set({ pedirPasta: true }),
  fecharPedirPasta: () => set({ pedirPasta: false }),
  usarPasta: async (caminho) => {
    try {
      const raiz = await escolherRaiz(servicos().backend, caminho);
      set({ raiz, pedirPasta: false, pasta: null });
      organizado = false;
      usarAvisos.getState().avisar(`📁 pasta Kof Games: ${raiz.path ?? caminho}`, 3500);
      usarTelas.getState().abrir('biblioteca');
      await get().mostrar(true);
      return true;
    } catch (e) {
      const b = paraBackendError(e);
      const msg: Record<string, string> = {
        INNER_FOLDER: 'essa é uma pasta de dentro: escolha a pasta Kof Games (a de cima)',
        NOT_A_DIRECTORY: 'isso é um arquivo, não uma pasta',
        NOT_FOUND: 'essa pasta não existe (nem a de cima dela)',
        PERMISSION_DENIED: 'sem permissão pra escrever nessa pasta',
        INVALID_ARGS: 'use o caminho completo da pasta (ex.: /home/você/Kof Games)',
      };
      usarAvisos.getState().avisar(msg[b.code] ?? `não deu: ${b.message}`, 5000);
      return false;
    }
  },

  organizar: async () => {
    try {
      set({ estado: '📁 conferindo a pasta Kof Games…' });
      const plano = await planejarKofGames(servicos().backend);
      if (plano.moves.length) set({ plano });
    } catch (e) {
      registrar('warn', 'kofgames', `não planejei a organização: ${textoDoErro(e)}`);
    } finally {
      set({ estado: '' });
    }
  },
  aplicarOrganizacao: async () => {
    const plano = get().plano;
    if (!plano) return;
    set({ plano: null });
    try {
      const r = await aplicarPlano(servicos().backend, plano);
      const n = r.done.length;
      if (n)
        usarAvisos
          .getState()
          .avisar(`📁 ${n} ${n > 1 ? 'itens foram' : 'item foi'} pro lugar certo em Kof Games/Games`, 4000);
      if (r.failed.length) {
        registrar('warn', 'kofgames', 'movimentos que falharam', { falhas: r.failed });
        usarAvisos.getState().avisar(`⚠ ${r.failed.length} não deu pra mover (detalhes no log)`, 5000);
      }
      set({ pasta: null });
      await get().mostrar(true);
    } catch (e) {
      usarAvisos.getState().avisarErro(`não consegui organizar: ${paraBackendError(e).message}`);
    }
  },
  cancelarOrganizacao: () => set({ plano: null }),
}));
