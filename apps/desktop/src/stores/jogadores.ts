// Jogadores 2 a 4: as vagas (escolha guardada em `jogadores`, como no antigo, e a da sessão) e o aviso quando um
// controle novo entra ("🎮 Xbox = Jogador 2").
import { escolherJogador, type Vagas } from '@kof/domain';
import { create } from 'zustand';
import { config } from './config';

const lerEscolha = (): Record<string, number> => {
  try {
    const v = JSON.parse(config().ler('jogadores') ?? '{}') as unknown;
    return v && typeof v === 'object' ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
};

export const vagas: Vagas = { escolha: lerEscolha(), sessao: {} };
/** aparelhos já avisados nesta sessão */
export const vistos = new Set<string>();

export interface EstadoJogadores {
  versao: number;
  escolher: (k: string, j: number) => void;
}

export const usarJogadores = create<EstadoJogadores>()((set, get) => ({
  versao: 0,
  escolher: (k, j) => {
    escolherJogador(vagas, k, j);
    config().guardar('jogadores', JSON.stringify(vagas.escolha));
    set({ versao: get().versao + 1 });
  },
}));
