// O jogo aberto: a sessão da engine e o que a interface mostra (nome, pausa, volume, medições). O laço de imagem não
// passa por aqui: os quadros vão direto pro canvas (hooks/useTelaDoJogo).
import {
  ErroDeArquivo,
  guardarNaKofGames,
  identidade,
  lerArquivoDeJogo,
  registrar,
  registrarJogo,
  textoDoErro,
  type JogoAberto,
} from '@kof/app-core';
import { chaveSramDe, fatosDe, SISTEMAS, type RegistroJogo } from '@kof/domain';
import { Jogo, type InfoDoJogo, type Medicao, type Proporcao } from '@kof/engine';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { aoTrazerSaves } from './backup';
import { guardarBateria, saveDoJogo } from './bateria';
import { config } from './config';
import { servicos } from './servicos';
import { usarTelas } from './telas';

const lerNum = (k: string, padrao: number) => config().numero(k, padrao);
const guardar = (k: string, v: string) => config().guardar(k, v);

export const PROPORCOES: [Proporcao, string][] = [
  ['43', '4:3 (como na TV)'],
  ['87', 'Pixel perfeito (8:7)'],
  ['esticar', 'Esticar'],
];

/** Último quadro chegado do Worker (o hook da tela desenha no próximo quadro do monitor). */
export const ultimoQuadro: { pixels: Uint32Array | null; largura: number; altura: number; novo: boolean } = {
  pixels: null,
  largura: 0,
  altura: 0,
  novo: false,
};

/** De onde veio o jogo que está abrindo. */
export interface Origem {
  /** caminho na Kof Games (veio da biblioteca/pasta) */
  path?: string;
  /** o arquivo de fora (aberto/arrastado): ganha uma cópia na Kof Games */
  arquivoDeFora?: File;
}

export interface EstadoJogo {
  jogo: Jogo | null;
  nome: string;
  /** registro do jogo aberto (id = "título|tamanho", as chaves do antigo) */
  registro: RegistroJogo | null;
  /** chave do save de bateria (sram.<título>.<tamanho>) */
  chaveSram: string;
  info: InfoDoJogo | null;
  abrindo: boolean;
  pausaManual: boolean;
  rapidoAberto: boolean;
  medicao: Medicao | null;
  desempenho: boolean;
  volume: number;
  mudo: boolean;
  proporcao: Proporcao;
  escala: number;
  abrirArquivo: (f: File) => Promise<void>;
  abrirJogo: (aberto: JogoAberto, origem?: Origem) => Promise<boolean>;
  fechar: () => void;
  alternarPausa: () => void;
  reiniciar: () => void;
  mudarVolume: (d: number) => void;
  alternarMudo: () => void;
  mudarProporcao: (d: number) => void;
  mudarEscala: (e: number) => void;
  alternarDesempenho: () => void;
  abrirRapido: () => void;
  fecharRapido: () => void;
}

export const usarJogo = create<EstadoJogo>()((set, get) => ({
  jogo: null,
  nome: '',
  registro: null,
  chaveSram: '',
  info: null,
  abrindo: false,
  pausaManual: false,
  rapidoAberto: false,
  medicao: null,
  desempenho: lerNum('desempenho', 0) === 1,
  volume: lerNum('volume', 100),
  mudo: lerNum('mudo', 0) === 1,
  proporcao: ((p) => (PROPORCOES.some(([k]) => k === p) ? p : '43') as Proporcao)(config().ler('proporcao')),
  escala: lerNum('escala', 0),

  abrirArquivo: async (arquivo) => {
    const av = usarAvisos.getState();
    try {
      const aberto = await lerArquivoDeJogo(arquivo.name, new Uint8Array(await arquivo.arrayBuffer()));
      await get().abrirJogo(aberto, { arquivoDeFora: arquivo });
    } catch (e) {
      if (e instanceof ErroDeArquivo) av.avisar(e.message, 5000);
      else av.avisarErro(`não consegui abrir ${arquivo.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
  abrirJogo: async (aberto, origem = {}) => {
    const av = usarAvisos.getState();
    if (get().abrindo) return false;
    set({ abrindo: true });
    try {
      get().jogo?.fechar();
      const { volume, mudo } = get();
      const ident = identidade(aberto.sistema, aberto.rom, aberto.nome);
      const chaveSram = chaveSramDe(ident.titulo || aberto.nome, aberto.rom.length);
      const sram = await saveDoJogo(chaveSram);
      const jogo = await Jogo.abrir(
        {
          sistema: aberto.sistema,
          rom: aberto.rom,
          baseNucleos: new URL('nucleos/', document.baseURI),
          volume: volume / 100,
          mudo,
          sram,
        },
        {
          quadro: (pixels, largura, altura) => Object.assign(ultimoQuadro, { pixels, largura, altura, novo: true }),
          medicao: (medicao) => set({ medicao }),
          sram: (bytes) => guardarBateria(chaveSram, bytes, aberto.nome, ident.id),
          erro: (m) => {
            set({ pausaManual: true });
            usarAvisos.getState().avisarErro(`erro no emulador: ${m}`);
          },
        },
      );
      const provisorio: RegistroJogo = {
        ...ident,
        nome: aberto.nome,
        arquivo: aberto.arquivo,
        sistema: aberto.sistema,
        tamanho: aberto.rom.length,
        ultimo: Date.now(),
      };
      set({
        jogo,
        nome: aberto.nome,
        registro: provisorio,
        chaveSram,
        info: jogo.info,
        pausaManual: false,
        medicao: null,
      });
      const telas = usarTelas.getState();
      usarTelas.setState({ temJogo: true });
      telas.abrir('jogo');
      const sis = SISTEMAS.find((s) => s.id === aberto.sistema)?.nome ?? aberto.sistema;
      av.avisar(`▶ ${aberto.nome} (${sis})`);
      if (mudo) av.avisar('o som está desligado: aperte M pra ligar', 3000);
      else if (!jogo.comSom) av.avisar('sem som: o navegador não liberou o áudio (o jogo roda mudo)', 4000);
      void guardarNaBiblioteca(aberto, origem).then((r) => r && get().registro?.id === r.id && set({ registro: r }));
      return true;
    } catch (e) {
      av.avisarErro(`não consegui abrir ${aberto.arquivo}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      set({ abrindo: false });
    }
  },
  fechar: () => {
    get().jogo?.fechar();
    ultimoQuadro.pixels = null;
    set({ jogo: null, nome: '', registro: null, info: null, medicao: null, rapidoAberto: false });
    usarTelas.setState({ temJogo: false });
  },
  alternarPausa: () => set({ pausaManual: !get().pausaManual }),
  reiniciar: () => {
    get().jogo?.reiniciar();
    usarAvisos.getState().avisar('↺ reiniciado');
  },
  mudarVolume: (d) => {
    const volume = Math.max(0, Math.min(100, get().volume + d));
    guardar('volume', String(volume));
    set({ volume, mudo: false });
    guardar('mudo', '0');
    get().jogo?.ajustarVolume(volume / 100, false);
    usarAvisos.getState().avisar(`🔊 volume ${volume}%`);
  },
  alternarMudo: () => {
    const mudo = !get().mudo;
    guardar('mudo', mudo ? '1' : '0');
    set({ mudo });
    get().jogo?.ajustarVolume(get().volume / 100, mudo);
    usarAvisos.getState().avisar(mudo ? '🔇 mudo' : `🔊 som ligado (${get().volume}%)`);
  },
  mudarProporcao: (d) => {
    const i = PROPORCOES.findIndex(([k]) => k === get().proporcao);
    const p = PROPORCOES[(i + d + PROPORCOES.length) % PROPORCOES.length]?.[0] ?? '43';
    guardar('proporcao', p);
    set({ proporcao: p });
  },
  mudarEscala: (escala) => {
    guardar('escala', String(escala));
    set({ escala });
  },
  alternarDesempenho: () => {
    const desempenho = !get().desempenho;
    guardar('desempenho', desempenho ? '1' : '0');
    set({ desempenho });
  },
  abrirRapido: () => {
    if (get().jogo && usarTelas.getState().atual === 'jogo') set({ rapidoAberto: true });
  },
  fecharRapido: () => set({ rapidoAberto: false }),
}));

/** Depois de abrir: registra na biblioteca e, se veio de fora, guarda uma cópia na Kof Games (o original fica). */
async function guardarNaBiblioteca(aberto: JogoAberto, origem: Origem): Promise<RegistroJogo | null> {
  const { backend, armazem } = servicos();
  let path = origem.path;
  const f = origem.arquivoDeFora;
  if (!path && f) {
    try {
      const fato = await fatosDe(f.name, f.size, async (o, n) => new Uint8Array(await f.slice(o, o + n).arrayBuffer()));
      const bytes = new Uint8Array(await f.arrayBuffer());
      const guardado = await guardarNaKofGames(backend, fato, bytes);
      path = guardado?.path;
      if (guardado?.novo)
        usarAvisos
          .getState()
          .avisar(`📁 ${f.name} guardado em Kof Games/${guardado.path.split('/').slice(0, -1).join('/')}`, 3500);
    } catch (e) {
      // sem a Kof Games escolhida (ROOT_MISSING) a ROM fica guardada na loja `roms`
      if ((e as { code?: string }).code !== 'ROOT_MISSING') registrar('warn', 'kofgames', textoDoErro(e));
    }
  }
  try {
    return await registrarJogo(armazem, aberto, path ? { path } : {});
  } catch (e) {
    registrar('error', 'biblioteca', `não registrei ${aberto.nome}: ${textoDoErro(e)}`);
    return null;
  }
}

// backup trazido com o save do jogo aberto: ele passa a usar o save trazido já (como no antigo)
aoTrazerSaves.add((chaves) => {
  const { jogo, chaveSram } = usarJogo.getState();
  if (!jogo || !chaves.includes(chaveSram)) return;
  void saveDoJogo(chaveSram).then((b) => b && jogo.escreverSram(b));
});
