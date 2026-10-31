// Pilha de telas (FRONTEND.md §4). Igual ao antigo: uma tela por vez no palco, com histórico pro Voltar; a galeria de
// temas abre POR CIMA da tela atual (ela continua visível e muda de cor ao vivo). 'jogo' = nenhuma tela (o jogo, ou o
// palco vazio quando não tem jogo).
import { create } from 'zustand';

export type TelaId =
  | 'home'
  | 'biblioteca'
  | 'estados'
  | 'jukebox'
  | 'estatisticas'
  | 'guia'
  | 'teclas'
  | 'bios-tela'
  | 'aparelhos'
  | 'jogadores';

export interface Telas {
  atual: TelaId | 'jogo';
  historico: (TelaId | 'jogo')[];
  temasAberto: boolean;
  temJogo: boolean;
  abrir: (t: TelaId | 'jogo') => void;
  voltar: () => void;
  sair: () => void;
  abrirTemas: () => void;
  fecharTemas: () => void;
}

export const usarTelas = create<Telas>()((set, get) => ({
  atual: 'home',
  historico: [],
  temasAberto: false,
  temJogo: false,
  abrir: (t) => {
    const { atual, historico } = get();
    if (t === atual) return;
    set({ atual: t, historico: [...historico, atual], temasAberto: false });
  },
  // o mesmo do voltar() do antigo: do jogo vai pro Início; senão volta pra última tela diferente da atual (o jogo só
  // entra quando não sobra tela, pra não ficar indo e vindo)
  voltar: () => {
    const { atual, historico, temasAberto, temJogo } = get();
    if (temasAberto) return set({ temasAberto: false });
    if (atual === 'jogo') return set({ atual: 'home', historico: [...historico, 'jogo'] });
    let i = historico.length - 1;
    while (i >= 0 && (historico[i] === 'jogo' || historico[i] === atual)) i--;
    if (i >= 0) set({ atual: historico[i] as TelaId, historico: historico.slice(0, i) });
    else set({ atual: temJogo ? 'jogo' : 'home', historico: [] });
  },
  // Esc numa tela: com jogo volta pro jogo; sem jogo, vai pro Início (sairDaTela do antigo)
  sair: () => {
    const { temasAberto, temJogo, atual } = get();
    if (temasAberto) return set({ temasAberto: false });
    if (temJogo) get().abrir('jogo');
    else if (atual !== 'home') get().abrir('home');
  },
  abrirTemas: () => set({ temasAberto: true }),
  fecharTemas: () => set({ temasAberto: false }),
}));

/** O jogo fica pausado sempre que alguma tela estiver por cima (regra do antigo). */
export const jogoPausadoPorTela = (t: Pick<Telas, 'atual' | 'temasAberto'>): boolean =>
  t.atual !== 'jogo' || t.temasAberto;
