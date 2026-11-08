// Capas oficiais e modo sofá (grade de capas em tela cheia, feita pro controle).
import { criarCapas, type Capas } from '@kof/app-core';
import type { ItemBiblioteca, SistemaId } from '@kof/domain';
import { create } from 'zustand';
import { config } from './config';
import { servicos } from './servicos';

const ler = (k: string) => config().ler(k);
const guardar = (k: string, v: string) => config().guardar(k, v);

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

/** Capa oficial de um jogo só pelo nome e console (a jukebox: `srcCapa({nome})` do antigo). Pede se ainda não tem. */
export function capaPorNome(nome: string, sistema: SistemaId): string | null {
  const item: ItemBiblioteca = {
    nome,
    chave: nome,
    pasta: { path: '', nome, arquivo: nome, ext: '', sistema, chave: nome, variante: false, faixa: false, tamanho: 0 },
  };
  const c = capasDoApp();
  const url = c.url(item);
  if (!url) c.pedir(item);
  return url;
}
