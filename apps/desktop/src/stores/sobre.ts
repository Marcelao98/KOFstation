// B.3: a ficha do jogo (sinopse e notas) da linha selecionada na biblioteca, com cache por sessão.
import { sobreOJogo } from '@kof/app-core';
import { metaDe, sistemaDoItem, tituloDoNome, type ItemBiblioteca, type SobreOJogo } from '@kof/domain';
import { create } from 'zustand';
import { usarBiblioteca } from './biblioteca';
import { servicos } from './servicos';

export type EstadoDaFicha =
  | { tipo: 'nada' }
  | { tipo: 'buscando' }
  | { tipo: 'achou'; sobre: SobreOJogo }
  | { tipo: 'nao-achou' }
  | { tipo: 'sem-rede'; motivo: string };

interface Ficha {
  chave: string;
  estado: EstadoDaFicha;
  pedir: (r: ItemBiblioteca | undefined) => void;
}

const guardadas = new Map<string, EstadoDaFicha>();
let relogio: ReturnType<typeof setTimeout> | undefined;

/** O que procurar: o título que a base reconheceu (o mais certo), senão o nome sem os rótulos. */
function alvo(r: ItemBiblioteca): { sistema: string; titulo: string } {
  const m = metaDe(r, usarBiblioteca.getState().base);
  return { sistema: m?.sistema ?? sistemaDoItem(r), titulo: m?.titulo || tituloDoNome(r.obra?.titulo ?? r.nome) };
}

export const usarFicha = create<Ficha>()((set, get) => ({
  chave: '',
  estado: { tipo: 'nada' },
  pedir: (r) => {
    clearTimeout(relogio);
    if (!r) return set({ chave: '', estado: { tipo: 'nada' } });
    const { sistema, titulo } = alvo(r);
    const chave = sistema + ':' + titulo;
    const ja = guardadas.get(chave);
    if (ja) return set({ chave, estado: ja });
    set({ chave, estado: { tipo: 'buscando' } });
    // espera a seleção parar (andar com as setas pela lista não dispara uma busca por linha)
    relogio = setTimeout(() => {
      void sobreOJogo(servicos().backend, sistema, titulo).then(
        (sobre) => {
          const estado: EstadoDaFicha = sobre ? { tipo: 'achou', sobre } : { tipo: 'nao-achou' };
          guardadas.set(chave, estado);
          if (get().chave === chave) set({ estado });
        },
        (e: unknown) => {
          // sem internet não fica guardado: tenta de novo na próxima vez
          if (get().chave === chave)
            set({ estado: { tipo: 'sem-rede', motivo: e instanceof Error ? e.message : String(e) } });
        },
      );
    }, 400);
  },
}));
