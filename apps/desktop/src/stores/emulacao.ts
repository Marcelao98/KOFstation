// Opções de emulação por console (M16.4): perfil geral → console → jogo, guardadas na configuração (chave
// `emuOpcoes`, texto JSON lido por `lerEscolhas`). Mudar com o jogo aberto manda já o que o núcleo relê na hora
// (`Comando::Variavel` no nativo, `opcoes` no Worker) e avisa o que só vale ao reabrir.
import {
  ajustarOpcao,
  ajustarPerfil,
  compararOpcoes,
  lerEscolhas,
  limparCamada,
  opcoesParaNucleo,
  OPCOES_DE_NUCLEO,
  textoDasEscolhas,
  type EscolhasDeEmulacao,
  type Perfil,
  type SistemaId,
} from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { trocarOpcoesDeEmulacao, usarJogo } from './jogo';

const CHAVE = 'emuOpcoes';

export type CamadaEditavel = 'geral' | 'console' | 'jogo';

interface EstadoEmulacao {
  escolhas: EscolhasDeEmulacao;
  /** relê da configuração (depois de carregar o backup, por exemplo) */
  recarregar: () => void;
  perfil: (camada: CamadaEditavel, sistema: SistemaId, jogoId: string | undefined, p: Perfil | null) => void;
  opcao: (
    camada: Exclude<CamadaEditavel, 'geral'>,
    sistema: SistemaId,
    jogoId: string | undefined,
    chave: string,
    valor: string | null,
  ) => void;
  limpar: (camada: Exclude<CamadaEditavel, 'geral'>, sistema: SistemaId, jogoId: string | undefined) => void;
}

export const usarEmulacao = create<EstadoEmulacao>()((set, get) => {
  const aplicar = (novas: EscolhasDeEmulacao) => {
    const antes = get().escolhas;
    config().guardar(CHAVE, textoDasEscolhas(novas));
    set({ escolhas: novas });
    aoVivo(antes, novas);
  };
  return {
    escolhas: lerEscolhas(config().ler(CHAVE)),
    recarregar: () => set({ escolhas: lerEscolhas(config().ler(CHAVE)) }),
    perfil: (camada, sistema, jogoId, p) => aplicar(ajustarPerfil(get().escolhas, camada, sistema, jogoId, p)),
    opcao: (camada, sistema, jogoId, chave, valor) =>
      aplicar(ajustarOpcao(get().escolhas, camada, sistema, jogoId, chave, valor)),
    limpar: (camada, sistema, jogoId) => aplicar(limparCamada(get().escolhas, camada, sistema, jogoId)),
  };
});

/** Com um jogo aberto, manda o que mudou pra ele: "vale na hora" vai já; o resto vira um aviso. */
function aoVivo(antes: EscolhasDeEmulacao, depois: EscolhasDeEmulacao) {
  const j = usarJogo.getState();
  const sis = j.info?.sistema;
  if (!j.jogo || !sis || !OPCOES_DE_NUCLEO[sis]) return;
  const id = j.registro?.id;
  const d = compararOpcoes(sis, opcoesParaNucleo(antes, sis, id), opcoesParaNucleo(depois, sis, id));
  if (Object.keys(d.naHora).length) j.jogo.mudarOpcoes(d.naHora);
  if (d.aoReabrir.length) usarAvisos.getState().avisar(`vale ao reabrir o jogo: ${d.aoReabrir.join(', ')}`, 4000);
}

trocarOpcoesDeEmulacao((sistema, jogoId) => opcoesParaNucleo(usarEmulacao.getState().escolhas, sistema, jogoId));
