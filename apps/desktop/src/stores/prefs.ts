// Preferências da interface. Por enquanto o tema fica no armazenamento do navegador (conveniência deste aparelho); no
// M4 as configurações passam pro arquivo em Kof Games/Config, pelo backend.
import { TEMA_PADRAO, TODOS_TEMAS } from '@kof/domain';
import { create } from 'zustand';

const CHAVE = 'kofstation.tema';
const ler = (): string => {
  try {
    const t = localStorage.getItem(CHAVE);
    return t && TODOS_TEMAS.some(([id]) => id === t) ? t : TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO; // armazenamento bloqueado (janela anônima): fica o padrão
  }
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
      try {
        localStorage.setItem(CHAVE, id);
      } catch {
        // sem armazenamento: o tema vale só até fechar (o aviso não é necessário, nada se perde)
      }
      set({ tema: id, temaNaTela: id });
    },
    experimentarTema: (id) => set({ temaNaTela: id }),
    desfazerExperimento: () => set({ temaNaTela: get().tema }),
  };
});
