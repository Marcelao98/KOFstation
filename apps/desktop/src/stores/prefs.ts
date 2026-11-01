// Preferências da interface (o tema), no arquivo de configurações (chave `tema`, a mesma do antigo).
import { TEMA_PADRAO, TODOS_TEMAS } from '@kof/domain';
import { create } from 'zustand';
import { config } from './config';

const ler = (): string => {
  const t = config().ler('tema');
  return t && TODOS_TEMAS.some(([id]) => id === t) ? t : TEMA_PADRAO;
};

export interface Prefs {
  /** o tema escolhido (o que fica salvo) */
  tema: string;
  /** o tema na tela agora: igual ao escolhido, ou o que está sendo experimentado na galeria/showcase */
  temaNaTela: string;
  escolherTema: (id: string) => void;
  experimentarTema: (id: string) => void;
  desfazerExperimento: () => void;
}

export const usarPrefs = create<Prefs>()((set, get) => {
  const tema = ler();
  return {
    tema,
    temaNaTela: tema,
    escolherTema: (id) => {
      config().guardar('tema', id);
      set({ tema: id, temaNaTela: id });
    },
    experimentarTema: (id) => set({ temaNaTela: id }),
    desfazerExperimento: () => set({ temaNaTela: get().tema }),
  };
});
