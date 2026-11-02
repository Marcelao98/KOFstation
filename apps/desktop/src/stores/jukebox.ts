// A jukebox (app.js 1225–1700 e 2020–2100 do antigo): a lista (a trilha do KOFstation primeiro, depois as músicas
// guardadas por jogo), o tocador da faixa (uma instância separada do núcleo, num Worker), mudo/solo por canal, .spc e
// .wav, o mini-player da barra de baixo e a música do Início.
import {
  apagarMusica,
  bytesDaMusica,
  bytesDoJogo,
  guardarMusica,
  listarMusicas,
  nomeDeArquivo,
  registrar,
  renomearMusica,
  textoDoErro,
  type Faixa,
} from '@kof/app-core';
import type { RegistroJogo, SistemaId } from '@kof/domain';
import {
  ehSpc,
  etiquetasSpc,
  gerarWav,
  NUCLEOS,
  PADRAO_FADE,
  PADRAO_SEG,
  spcDoEstado,
  temMusica,
  Tocador,
  TocadorViolino,
  type FaixaNoWorker,
  type InfoDaFaixa,
  type OndasAoVivo,
} from '@kof/engine';
import { create } from 'zustand';
import { fotoDoQuadro } from '../app/foto';
import { usarAvisos } from './avisos';
import { config } from './config';
import { usarJogo } from './jogo';
import { servicos } from './servicos';
import { usarTelas } from './telas';

/** Uma linha da lista: música guardada ou da trilha do KOFstation (essas não ficam na loja: não renomeia nem apaga). */
export interface ItemJuke extends Partial<Omit<Faixa, 'origem'>> {
  key: string;
  titulo: string;
  jogo: string;
  origem: 'jogo' | 'spc' | 'trilha';
  trilha?: string;
  autor?: string;
}

interface MusicaDaTrilha {
  id: string;
  titulo: string;
  autor: string;
  segundos: number;
  cmd?: string;
  violino?: boolean;
}

/** O tocador da faixa (o do núcleo ou o do violino). */
interface TocadorDeMusica {
  info: InfoDaFaixa;
  readonly ultimo: OndasAoVivo | null;
  aoAcabar: (() => void) | null;
  aoErrar: ((m: string) => void) | null;
  tocar(sim: boolean): void;
  mudas(m: number): void;
  configurar(segundos: number, fadeMs: number, repetir: boolean): void;
  volume(v: number, mudo: boolean): void;
  fechar(): void;
}

export type VistaJuke = 'capa' | 'ondas' | 'notas';
export const INICIO: readonly [string, string][] = [
  ['rua', 'Se Essa Rua'],
  ['guarani', 'O Guarani'],
  ['ticotico', 'Tico-Tico no Fubá'],
  ['abrealas', 'Ó Abre-Alas'],
  ['balao', 'Cai, Cai, Balão'],
  ['air', 'Air (Bach)'],
  ['sortear', 'sortear'],
  ['0', 'desligada'],
];
const sorteada = INICIO[Math.floor(Math.random() * (INICIO.length - 2))]?.[0] ?? 'rua';

const base = () => new URL('nucleos/', document.baseURI);
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let trilha: Promise<MusicaDaTrilha[]> | null = null;
/** A trilha do KOFstation (nucleos/trilha.js: `const KofTrilha = {...}`, só dados). */
function carregarTrilha(): Promise<MusicaDaTrilha[]> {
  trilha ??= fetch(new URL('trilha.js', base()))
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`trilha: ${r.status}`))))
    .then((t) => (JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as { musicas: MusicaDaTrilha[] }).musicas)
    .catch((e: unknown) => {
      registrar('warn', 'jukebox', `sem a trilha do KOFstation: ${textoDoErro(e)}`);
      trilha = null;
      return [];
    });
  return trilha;
}

let tk: TocadorDeMusica | null = null;
let vez = 0;

export interface Jukebox {
  lista: ItemJuke[];
  atual: number;
  tocando: boolean;
  /** a música do Início (não é da lista): o id da trilha */
  interna: string | null;
  info: InfoDaFaixa | null;
  mudas: number;
  solo: number;
  aleatorio: boolean;
  repetir: boolean;
  vista: VistaJuke;
  estilo: string;
  sinc: number;
  escolhaInicio: string;
  carregar: () => Promise<void>;
  abrir: () => Promise<void>;
  tocar: (i: number) => Promise<void>;
  alternar: () => void;
  proxima: (d: number) => void;
  fechar: () => void;
  guardarDoJogo: () => Promise<void>;
  importarSpcs: (arqs: File[]) => Promise<void>;
  exportarSpc: (f: ItemJuke) => Promise<void>;
  exportarWav: (f: ItemJuke) => Promise<void>;
  renomear: (f: ItemJuke, titulo: string) => Promise<void>;
  apagar: (f: ItemJuke) => Promise<void>;
  alternarMudo: (v: number) => void;
  alternarSolo: (v: number) => void;
  mudarVista: (v: VistaJuke) => void;
  mudarEstilo: (e: string) => void;
  mudarSinc: (ms: number) => void;
  alternarAleatorio: () => void;
  alternarRepetir: () => void;
  tocarInicio: (sempre?: boolean) => Promise<void>;
  pararInicio: () => void;
  mudarMusicaInicio: () => void;
}

/** O tocador atual (a tela lê as ondas dele a cada quadro). */
export const tocadorAtual = (): TocadorDeMusica | null => tk;

export const mudasEfetivas = (j: Pick<Jukebox, 'solo' | 'mudas'>): number =>
  j.solo >= 0 ? ~(1 << j.solo) & 0xffff : j.mudas;

const lerVista = (): VistaJuke => {
  const v = config().ler('jkVista');
  return v === 'ondas' || v === 'notas' ? v : 'capa';
};
const lerInicio = (): string => {
  const v = config().ler('musicaInicio');
  return v === '1' || !INICIO.some(([k]) => k === v) ? 'rua' : (v ?? 'rua');
};

function baixar(nome: string, u8: Uint8Array, tipo = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u8 as Uint8Array<ArrayBuffer>], { type: tipo }));
  a.download = nomeDeArquivo(nome);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

/** O avisarMudo do antigo: a pessoa deu play com o som desligado. */
const avisarMudo = () => {
  if (usarJogo.getState().mudo) usarAvisos.getState().avisar('🔇 o som está desligado: aperte M pra ligar', 4000);
};

const tempoDe = (f: ItemJuke) => ({ segundos: f.segundos || PADRAO_SEG, fadeMs: f.fadeMs || PADRAO_FADE });

/** O que o Worker precisa pra tocar a faixa. */
async function faixaNoWorker(f: ItemJuke): Promise<FaixaNoWorker | 'violino'> {
  if (f.trilha) {
    const m = (await carregarTrilha()).find((x) => x.id === f.trilha);
    if (m?.violino) return 'violino';
    if (!m?.cmd) throw new Error('essa versão não tem essa música');
    return { sistema: 'md', fm: deB64(m.cmd) };
  }
  const { backend, armazem } = servicos();
  const bytes = await bytesDaMusica(armazem, f.key);
  if (f.origem === 'spc' || ehSpc(bytes)) return { sistema: 'snes', spc: bytes };
  const sistema = f.sistema as SistemaId;
  if (!NUCLEOS[sistema]) throw new Error(`essa versão do KOFstation não toca música de ${sistema}`);
  const reg = f.jogoId ? await armazem.meta<RegistroJogo>('jogos', f.jogoId) : null;
  if (!reg) throw new Error(`a ROM de ${f.jogo} não está mais na biblioteca: abra o jogo uma vez e tente de novo`);
  const { rom } = await bytesDoJogo(backend, armazem, reg);
  return { sistema, rom, estado: bytes };
}

async function abrirTocador(f: ItemJuke, mudas: number, repetir: boolean): Promise<TocadorDeMusica> {
  const j = usarJogo.getState();
  const fx = await faixaNoWorker(f);
  const { segundos, fadeMs } = f.trilha ? { segundos: f.segundos ?? 0, fadeMs: f.fadeMs ?? 4000 } : tempoDe(f);
  if (fx === 'violino') {
    const v = await TocadorViolino.abrir(base(), j.volume / 100, j.mudo);
    v.configurar(segundos, fadeMs, repetir);
    v.mudas(mudas);
    return v;
  }
  return Tocador.abrir({
    faixa: fx,
    baseNucleos: base(),
    segundos,
    fadeMs,
    repetir,
    mudas,
    volume: j.volume / 100,
    mudo: j.mudo,
  });
}

export const usarJukebox = create<Jukebox>()((set, get) => {
  /** Troca o tocador (fecha o anterior) e começa a tocar. */
  const ligar = (novo: TocadorDeMusica, extra: Partial<Jukebox>) => {
    tk?.fechar();
    tk = novo;
    novo.aoAcabar = () => {
      if (get().interna) return;
      get().proxima(1);
    };
    novo.aoErrar = (m) => usarAvisos.getState().avisarErro(`a música parou: ${m}`);
    set({ info: novo.info, tocando: true, ...extra });
    novo.tocar(true);
  };
  const pausarJogo = () => {
    const jg = usarJogo.getState();
    if (jg.jogo && !jg.pausaManual) jg.alternarPausa(); // o jogo espera; P volta pro jogo
  };

  return {
    lista: [],
    atual: -1,
    tocando: false,
    interna: null,
    info: null,
    mudas: 0,
    solo: -1,
    aleatorio: false,
    repetir: false,
    vista: lerVista(),
    estilo: config().ler('jkEstilo') ?? '',
    sinc: Math.max(-500, Math.min(500, Number(config().ler('notasSinc') ?? 0) || 0)),
    escolhaInicio: lerInicio(),

    carregar: async () => {
      let guardadas: Faixa[] = [];
      try {
        guardadas = await listarMusicas(servicos().armazem);
      } catch (e) {
        registrar('warn', 'jukebox', textoDoErro(e));
      }
      const t = (await carregarTrilha()).map((m): ItemJuke => ({
        key: 'trilha-' + m.id,
        origem: 'trilha',
        trilha: m.id,
        titulo: m.titulo,
        jogo: '🎵 Trilha do KOFstation',
        autor: m.autor,
        segundos: m.segundos < 45 ? m.segundos * 2 : m.segundos,
        fadeMs: 4000,
      }));
      const atualKey = get().lista[get().atual]?.key;
      const lista = [...t, ...guardadas.map((f): ItemJuke => ({ ...f }))];
      set({ lista, atual: atualKey ? lista.findIndex((f) => f.key === atualKey) : get().atual });
    },

    abrir: async () => {
      get().pararInicio();
      await get().carregar();
      usarTelas.getState().abrir('jukebox');
    },

    tocar: async (i) => {
      const f = get().lista[i];
      if (!f) return;
      const minha = ++vez;
      try {
        const mesmoSistema = tk && get().info && get().lista[get().atual]?.sistema === f.sistema;
        const mudas = mesmoSistema ? get().mudas : 0;
        const novo = await abrirTocador(f, mesmoSistema ? mudasEfetivas(get()) : 0, get().repetir);
        if (minha !== vez) return novo.fechar(); // outra faixa foi pedida nesse meio tempo
        ligar(novo, { atual: i, interna: null, ...(mesmoSistema ? {} : { mudas, solo: -1 }) });
        pausarJogo();
        avisarMudo();
      } catch (e) {
        usarAvisos.getState().avisar('não consegui tocar: ' + (e instanceof Error ? e.message : String(e)), 4000);
      }
    },

    alternar: () => {
      const { tocando, lista, interna } = get();
      if (tocando && !interna) {
        tk?.tocar(false);
        set({ tocando: false });
      } else if (tk && !interna) {
        pausarJogo();
        tk.tocar(true);
        set({ tocando: true });
        avisarMudo();
      } else if (lista.length) void get().tocar(Math.max(0, get().atual));
    },

    proxima: (d) => {
      const { lista, aleatorio, atual } = get();
      const n = lista.length;
      if (!n) return;
      void get().tocar(aleatorio ? Math.floor(Math.random() * n) : (atual + d + n) % n);
    },

    fechar: () => {
      vez++;
      tk?.fechar();
      tk = null;
      set({ tocando: false, atual: -1, info: null, interna: null });
    },

    guardarDoJogo: async () => {
      const av = usarAvisos.getState();
      const j = usarJogo.getState();
      if (!j.jogo || !j.info || !j.registro) return av.avisar('abra um jogo pra guardar a música dele');
      if (!temMusica(j.info.sistema)) {
        const nome =
          j.info.sistema === 'ps1' ? 'PlayStation' : j.info.sistema === 'n64' ? 'Nintendo 64' : j.info.sistema;
        return av.avisar('a jukebox ainda não guarda música de ' + nome, 3000);
      }
      try {
        const { armazem } = servicos();
        const ja = (await listarMusicas(armazem)).filter((f) => f.jogoId === j.registro?.id).length;
        const titulo = `Faixa ${ja + 1}`;
        // o estado do jogo inteiro (a jukebox roda o jogo parado naquela tela, sem imagem). No SNES o antigo guardava
        // um .spc; aqui o estado do Snes9x (toca igual ao jogo) e o .spc sai dele na hora de exportar
        const estado = await j.jogo.salvarEstado();
        await guardarMusica(
          armazem,
          {
            origem: 'jogo',
            titulo,
            jogo: j.nome,
            jogoId: j.registro.id,
            sistema: j.info.sistema,
            quando: Date.now(),
            capa: fotoDoQuadro(256),
          },
          estado,
        );
        await get().carregar();
        av.avisar(`🎵 música guardada na jukebox: ${j.nome} · ${titulo} (Som → Jukebox)`, 3500);
      } catch (e) {
        av.avisar('não consegui guardar a música: ' + (e instanceof Error ? e.message : String(e)), 4000);
      }
    },

    importarSpcs: async (arqs) => {
      let ok = 0;
      const { armazem } = servicos();
      for (const a of arqs) {
        try {
          const u8 = new Uint8Array(await a.arrayBuffer());
          if (!ehSpc(u8)) continue;
          const t = etiquetasSpc(u8);
          await guardarMusica(
            armazem,
            {
              origem: 'spc',
              titulo: t.titulo || a.name.replace(/\.spc$/i, ''),
              jogo: t.jogo || 'Arquivos .spc',
              artista: t.artista,
              segundos: t.segundos,
              fadeMs: t.fadeMs,
              sistema: 'snes',
              quando: Date.now() + ok,
            },
            u8,
          );
          ok++;
        } catch (e) {
          registrar('warn', 'jukebox', `${a.name}: ${textoDoErro(e)}`); // arquivo ruim: pula
        }
      }
      await get().carregar();
      usarAvisos
        .getState()
        .avisar(
          ok ? `🎵 ${ok} ${ok === 1 ? 'música entrou' : 'músicas entraram'} na jukebox` : 'nenhum .spc válido',
          3000,
        );
      usarTelas.getState().abrir('jukebox');
    },

    exportarSpc: async (f) => {
      try {
        const bytes = await bytesDaMusica(servicos().armazem, f.key);
        const { segundos, fadeMs } = tempoDe(f);
        const spc = ehSpc(bytes)
          ? bytes
          : spcDoEstado(bytes, { titulo: f.titulo, jogo: f.jogo, artista: f.artista ?? '', segundos, fadeMs });
        baixar(`${f.jogo} - ${f.titulo}.spc`, spc);
      } catch (e) {
        usarAvisos
          .getState()
          .avisar('não consegui exportar o .spc: ' + (e instanceof Error ? e.message : String(e)), 4000);
      }
    },

    exportarWav: async (f) => {
      const av = usarAvisos.getState();
      try {
        av.avisar('🎵 gerando o .wav…', 2000);
        const fx = await faixaNoWorker(f);
        if (fx === 'violino') return av.avisar('o Air em violino já é uma gravação: não sai em .wav', 3000);
        const mudas = get().lista[get().atual]?.key === f.key ? mudasEfetivas(get()) : 0;
        const { segundos, fadeMs } = tempoDe(f);
        const wav = await gerarWav(fx, base(), segundos, fadeMs, mudas);
        const nome = `${f.jogo} - ${f.titulo}.wav`;
        baixar(nome, wav, 'audio/wav');
        av.avisar('🎵 .wav pronto: ' + nomeDeArquivo(nome), 3000);
      } catch (e) {
        av.avisar('não consegui gerar o .wav: ' + (e instanceof Error ? e.message : String(e)), 4000);
      }
    },

    renomear: async (f, titulo) => {
      if (f.origem === 'trilha' || !titulo.trim()) return;
      await renomearMusica(servicos().armazem, f as Faixa, titulo.trim());
      await get().carregar();
    },

    apagar: async (f) => {
      if (f.origem === 'trilha') return;
      if (get().lista[get().atual]?.key === f.key) get().fechar();
      await apagarMusica(servicos().armazem, f.key);
      await get().carregar();
    },

    alternarMudo: (v) => {
      const mudas = get().mudas ^ (1 << v);
      set({ mudas, solo: get().solo === v ? -1 : get().solo });
      tk?.mudas(mudasEfetivas(get()));
    },
    alternarSolo: (v) => {
      set({ solo: get().solo === v ? -1 : v });
      tk?.mudas(mudasEfetivas(get()));
    },
    mudarVista: (vista) => {
      config().guardar('jkVista', vista);
      set({ vista });
    },
    mudarEstilo: (estilo) => {
      config().guardar('jkEstilo', estilo);
      set({ estilo });
    },
    mudarSinc: (ms) => {
      const sinc = Math.max(-500, Math.min(500, Math.round(ms / 10) * 10));
      config().guardar('notasSinc', String(sinc));
      set({ sinc });
    },
    alternarAleatorio: () => set({ aleatorio: !get().aleatorio }),
    alternarRepetir: () => {
      const repetir = !get().repetir;
      set({ repetir });
      const f = get().lista[get().atual];
      if (f && tk) {
        const { segundos, fadeMs } = f.trilha ? { segundos: f.segundos ?? 0, fadeMs: f.fadeMs ?? 4000 } : tempoDe(f);
        tk.configurar(segundos, fadeMs, repetir);
      }
    },

    // ---------- música do Início (tocarMusica/pararMusica do antigo) ----------
    tocarInicio: async (sempre = false) => {
      const esc = get().escolhaInicio;
      if (esc === '0' && !sempre) return;
      if (get().tocando && !get().interna) return; // a pessoa está ouvindo a jukebox: não atrapalha
      const qual = sempre ? 'air' : esc === 'sortear' ? sorteada : esc;
      if (get().interna === qual && get().tocando) return;
      const minha = ++vez;
      try {
        const novo = await abrirTocador(
          { key: 'trilha-' + qual, origem: 'trilha', trilha: qual, titulo: '', jogo: '' },
          0,
          true,
        );
        if (minha !== vez || (get().tocando && !get().interna)) return novo.fechar();
        ligar(novo, { interna: qual, atual: -1, mudas: 0, solo: -1 });
      } catch (e) {
        registrar('warn', 'jukebox', `música do Início: ${textoDoErro(e)}`);
      }
    },
    pararInicio: () => {
      if (!get().interna) return;
      get().fechar();
    },
    mudarMusicaInicio: () => {
      const i = INICIO.findIndex(([k]) => k === get().escolhaInicio);
      const prox = INICIO[(i + 1) % INICIO.length]?.[0] ?? 'rua';
      config().guardar('musicaInicio', prox);
      set({ escolhaInicio: prox });
      get().pararInicio();
      usarAvisos.getState().avisar('🎵 Música no Início: ' + (INICIO.find(([k]) => k === prox)?.[1] ?? prox));
      if (prox !== '0' && !usarJogo.getState().jogo && usarTelas.getState().atual === 'home') void get().tocarInicio();
    },
  };
});

// o volume do app vale pra jukebox também
usarJogo.subscribe((s, a) => {
  if (s.volume !== a.volume || s.mudo !== a.mudo) tk?.volume(s.volume / 100, s.mudo);
});
// abriu um jogo: a música do Início para (a jukebox continua: ela pausa o jogo)
usarJogo.subscribe((s, a) => {
  if (s.jogo && s.jogo !== a.jogo) usarJukebox.getState().pararInicio();
});
