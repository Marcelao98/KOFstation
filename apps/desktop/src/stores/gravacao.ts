// ⏺ Gravar o jogo (G.1): liga/desliga (F10, menu rápido, menu Emulação). Grava como o jogador vê (moldura + tela com o
// filtro do F4) e o som dos consoles da página; o arquivo vai pra <Kof Games>/Gravações. O PS1/PS2 nativos gravam a
// imagem, mudos (o som deles toca no processo do jogo: G.2).
import { cenaDaGravacao, formatoDeGravacao, nomeDaGravacao } from '@kof/domain';
import { EscritorDeGravacao, registrar } from '@kof/app-core';
import { Gravador, Jogo } from '@kof/engine';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { usarJogo } from './jogo';
import { servicos } from './servicos';
import { renderAtual } from './visual';

export interface Gravacao {
  gravando: boolean;
  /** `performance.now()` de quando começou (o relógio do ⏺) */
  desde: number;
  /** começando ou salvando: o botão espera */
  ocupado: boolean;
  alternar: () => Promise<void>;
  parar: () => Promise<void>;
}

interface Sessao {
  gravador: Gravador;
  escritor: EscritorDeGravacao;
  desfazerSom: (() => void) | null;
}
let sessao: Sessao | null = null;

const motivo = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A moldura como está na tela: o desenho de fundo do #moldura (SVG gerado ou a imagem do jogador). */
async function imagemDaMoldura(m: HTMLElement): Promise<HTMLImageElement | undefined> {
  const u = /url\("?(.*?)"?\)$/.exec(m.style.backgroundImage)?.[1];
  if (!u) return undefined;
  const img = new Image();
  img.src = u;
  try {
    await img.decode();
    return img;
  } catch (e) {
    registrar('warn', 'gravacao', `a moldura não carregou pra gravar (vai sem ela): ${motivo(e)}`);
    return undefined;
  }
}

async function comecar(set: (p: Partial<Gravacao>) => void) {
  const avisos = usarAvisos.getState();
  const { jogo, registro, info } = usarJogo.getState();
  const tela = renderAtual();
  if (!jogo || !tela) return avisos.avisar('⏺ Abra um jogo pra gravar');
  if (typeof MediaRecorder !== 'function')
    return avisos.avisarErro('⏺ Este navegador não grava vídeo (sem MediaRecorder)');
  const formato = formatoDeGravacao((m) => MediaRecorder.isTypeSupported(m));
  if (!formato) return avisos.avisarErro('⏺ Este navegador não sabe gravar nem MP4 nem WebM');

  const fonte = tela.canvas;
  const m = document.getElementById('moldura');
  const rc = fonte.getBoundingClientRect();
  const rm = m && !m.hidden ? m.getBoundingClientRect() : rc;
  if (!rc.width || !rc.height) return avisos.avisar('⏺ A tela do jogo não está à vista');
  const cena = cenaDaGravacao(
    { w: rm.width, h: rm.height },
    { x: rc.left - rm.left, y: rc.top - rm.top, w: rc.width, h: rc.height },
  );
  const fundo = m ? await imagemDaMoldura(m) : undefined;
  const raio = (parseFloat(fonte.style.borderRadius) || 0) / rc.height;

  const nomeJogo = registro?.nome || registro?.titulo || info?.sistema || 'Gravação';
  const nome = nomeDaGravacao(nomeJogo, new Date(), formato.ext);
  const som = jogo instanceof Jogo ? jogo.somPraGravar() : null;
  let gravador: Gravador;
  const escritor = new EscritorDeGravacao(servicos().backend, nome, (e) => {
    avisos.avisarErro(`⏺ A gravação parou: não consegui salvar (${motivo(e)})`);
    void usarGravacao.getState().parar();
  });
  try {
    gravador = new Gravador({
      fonte,
      cena,
      formato,
      fundo,
      raio,
      som: som?.stream,
      aoPedaco: (p) => escritor.anexar(p),
      aoErro: (e) => {
        avisos.avisarErro(`⏺ O gravador do navegador parou: ${e.message}`);
        void usarGravacao.getState().parar();
      },
    });
    gravador.comecar();
  } catch (e) {
    som?.desfazer();
    registrar('error', 'gravacao', `não deu pra começar a gravar (${formato.mime}): ${motivo(e)}`);
    return avisos.avisarErro(`⏺ Não deu pra começar a gravar: ${motivo(e)}`);
  }
  sessao = { gravador, escritor, desfazerSom: som?.desfazer ?? null };
  set({ gravando: true, desde: performance.now() });
  registrar('info', 'gravacao', `gravando ${nome} (${formato.mime}, ${cena.largura}×${cena.altura})`);
  avisos.avisar(
    som ? '⏺ Gravando (F10 para)' : '⏺ Gravando sem som (o som deste console ainda não grava) · F10 para',
    3000,
  );
}

export const usarGravacao = create<Gravacao>()((set, get) => ({
  gravando: false,
  desde: 0,
  ocupado: false,
  alternar: async () => {
    if (get().ocupado) return;
    if (get().gravando) return get().parar();
    set({ ocupado: true });
    try {
      await comecar(set);
    } finally {
      set({ ocupado: false });
    }
  },
  parar: async () => {
    const s = sessao;
    if (!s) return;
    sessao = null;
    set({ gravando: false, ocupado: true });
    try {
      await s.gravador.parar();
      s.desfazerSom?.();
      const caminho = await s.escritor.fechar();
      const mb = (s.escritor.bytes / 1e6).toFixed(1).replace('.', ',');
      registrar('info', 'gravacao', `salvo ${caminho} (${mb} MB)`);
      usarAvisos.getState().avisar(`🎬 Gravação salva na Kof Games: ${caminho} (${mb} MB)`, 6000);
    } catch (e) {
      // o erro do pedaço já foi avisado pelo escritor; aqui só o que sobrou (ex.: nada gravado)
      if (!usarAvisos.getState().erro) usarAvisos.getState().avisarErro(`⏺ A gravação não foi salva: ${motivo(e)}`);
    } finally {
      set({ ocupado: false });
    }
  },
}));

// o jogo fechou ou trocou no meio: salva o que já foi gravado
usarJogo.subscribe((s, a) => {
  if (s.jogo !== a.jogo && usarGravacao.getState().gravando) void usarGravacao.getState().parar();
});
