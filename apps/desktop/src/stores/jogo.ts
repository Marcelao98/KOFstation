// O jogo aberto: a sessão da engine e o que a interface mostra (nome, pausa, volume, medições). O laço de imagem não
// passa por aqui: os quadros vão direto pro canvas (hooks/useTelaDoJogo).
import {
  biosDoSistema,
  completarJogo,
  ErroDeArquivo,
  faltaBiosDe,
  guardarNaKofGames,
  lerDaKofGames,
  varrerKofGames,
  cabecaDoCd,
  guardarNaKofGamesAosPedacos,
  identidade,
  lerArquivoDeJogo,
  registrar,
  tamanhoDoJogo,
  registrarJogo,
  textoDoErro,
  type JogoAberto,
} from '@kof/app-core';
import { chaveSramDe, fatosDe, sistemaDoArquivo, SISTEMAS, type RegistroJogo } from '@kof/domain';
import {
  Jogo,
  JogoNativo,
  NUCLEOS,
  type EventosDoJogo,
  type InfoDoJogo,
  type Medicao,
  type Proporcao,
  type SessaoDeJogo,
  type SituacaoRebob,
} from '@kof/engine';
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

/** Chamados antes de trocar de jogo ou fechar (salvar automático: M5.3). */
export const antesDeTrocarJogo = new Set<() => Promise<void>>();
const antesDeTrocar = async () => {
  for (const f of antesDeTrocarJogo) await f().catch(() => undefined); // nunca impede de abrir o outro jogo
};

/** Situação do rebobinar vinda do Worker (stores/rebob). */
export const aoMudarRebob = new Set<(r: SituacaoRebob) => void>();

/** Opções do núcleo pro jogo que vai abrir (paletas: M7.5). */
let opcoesDoNucleo: (sistema: string) => Record<string, string> = () => ({});
export function trocarOpcoesDoNucleo(f: typeof opcoesDoNucleo) {
  opcoesDoNucleo = f;
}

/** Erro no núcleo (o caçador de bugs oferece reportar). */
export const aoErroDoEmulador = new Set<(m: string) => void>();

let abertoAgora: JogoAberto | null = null;
/** A ROM do jogo aberto (o patch de tradução aplica nela). */
export const jogoAbertoAgora = (): JogoAberto | null => abertoAgora;

/** Chamados depois que um jogo abriu (perguntar o modo: M5.4; controles do jogo: M8). */
export const depoisDeAbrirJogo = new Set<() => void>();

/** De onde veio o jogo que está abrindo. */
export interface Origem {
  /** caminho na Kof Games (veio da biblioteca/pasta) */
  path?: string;
  /** o arquivo de fora (aberto/arrastado): ganha uma cópia na Kof Games */
  arquivoDeFora?: File;
  /** os outros arquivos escolhidos junto (os .bin do .cue): vão pra mesma pasta da Kof Games */
  soltos?: File[];
}

/** Sistemas com núcleo nativo neste executável (perguntado uma vez). */
let nativosDisponiveis: Promise<string[]> | null = null;
function nativos(): Promise<string[]> {
  nativosDisponiveis ??= servicos()
    .backend.chamar<{ sistemas: string[] }>('nativo.disponivel')
    .then((r) => r.sistemas)
    .catch(() => []); // backend de teste ou kofstation antigo: sem nativo, o wasm roda
  return nativosDisponiveis;
}

/** O núcleo nativo desse sistema está ligado (Opções de emulação) e existe neste executável? */
export async function nativoLigado(sistema: string): Promise<boolean> {
  if (sistema !== 'ps1' || config().ler('nucleoPs1') === 'wasm') return false;
  return (await nativos()).includes(sistema);
}

/** O jogo vai no núcleo nativo? PS1 por padrão (Opções de emulação troca), só com o jogo na Kof Games. */
async function querNativo(sistema: string, path: string | undefined): Promise<boolean> {
  return !!path && (await nativoLigado(sistema));
}

/** O jogo veio só com a cabeça (o CD ficou no disco) e vai pro WebAssembly: aí sim lê inteiro. */
async function jogoInteiro(aberto: JogoAberto, path: string | undefined): Promise<JogoAberto> {
  if (!aberto.parcial || !path) return aberto;
  const nome = path.split('/').pop() ?? aberto.arquivo;
  return lerArquivoDeJogo(nome, await lerDaKofGames(servicos().backend, path));
}

/** CD acima disso não cai pro WebAssembly quando o nativo falha (teria que passar inteiro pela página). */
const MAX_RESERVA_WASM = 100 << 20;
const mb = (n: number) => Math.round(n / (1 << 20));

/** Últimas linhas do log do processo nativo (vazio se não tem). */
async function logDoNativo(): Promise<string[]> {
  try {
    const l = await servicos().backend.chamar<{ vivo: boolean; saida: string | null; linhas: string[] }>('nativo.log');
    return [`processo ${l.vivo ? 'vivo' : `fechou (${l.saida ?? '?'})`}`, ...l.linhas.slice(-15)];
  } catch (e) {
    return [`sem o log do processo nativo: ${textoDoErro(e)}`];
  }
}

/** Arquivos maiores que isso vão pra Kof Games aos pedaços (não passam inteiros pela memória da página). */
const GRANDE = 32 << 20;

export interface EstadoJogo {
  jogo: SessaoDeJogo | null;
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
  abrirArquivo: (f: File, soltos?: File[]) => Promise<void>;
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

  abrirArquivo: async (arquivo, soltos = []) => {
    const av = usarAvisos.getState();
    try {
      if (await abrirCdDeFora(arquivo, soltos)) return;
      const outros = await Promise.all(
        soltos.map(async (s) => ({ nome: s.name, bytes: new Uint8Array(await s.arrayBuffer()) })),
      );
      const aberto = await lerArquivoDeJogo(arquivo.name, new Uint8Array(await arquivo.arrayBuffer()), outros);
      await get().abrirJogo(aberto, { arquivoDeFora: arquivo, soltos });
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
      const { armazem } = servicos();
      // Neo Geo sem o neogeo.zip: a tela da BIOS pede, e o jogo abre quando ela chegar
      if (await faltaBiosDe(armazem, aberto.sistema)) {
        set({ abrindo: false });
        const { usarBios } = await import('./bios');
        await usarBios.getState().pedir(aberto.sistema, () => get().abrirJogo(aberto, origem));
        return false;
      }
      const nativo = await querNativo(aberto.sistema, origem.path);
      // nativo: o processo lê o CD direto da Kof Games (o CD e os .bin do .cue não passam pela página)
      if (!nativo) {
        aberto = await jogoInteiro(aberto, origem.path);
        aberto = await completarJogo(aberto, (nome) => acharNaKofGames(nome, origem.path));
      }
      const bios = await biosDoSistema(armazem, aberto.sistema);
      if (get().jogo) await antesDeTrocar();
      fecharSessao(get().jogo);
      const { volume, mudo } = get();
      // o tamanho de verdade (com o CD lido só na cabeça, a rom é o começo): a chave do save não muda
      const tamanho = tamanhoDoJogo(aberto);
      const ident = identidade(aberto.sistema, aberto.rom, aberto.nome, tamanho);
      const chaveSram = chaveSramDe(ident.titulo || aberto.nome, tamanho);
      const sram = await saveDoJogo(chaveSram);
      const opcoes = opcoesDoNucleo(aberto.sistema);
      const eventos: EventosDoJogo = {
        quadro: (pixels, largura, altura) => Object.assign(ultimoQuadro, { pixels, largura, altura, novo: true }),
        medicao: (medicao) => set({ medicao }),
        sram: (bytes) => guardarBateria(chaveSram, bytes, aberto.nome, ident.id),
        rebob: (r) => aoMudarRebob.forEach((f) => f(r)),
        erro: (m, log) => {
          set({ pausaManual: true });
          if (log.length) registrar('error', 'nucleo', `${m} · o núcleo disse: ${log.slice(-8).join(' | ')}`);
          if (get().jogo instanceof JogoNativo) void anotarLogNativo(m);
          usarAvisos.getState().avisarErro(`erro no emulador: ${m}`);
          aoErroDoEmulador.forEach((f) => f(m));
        },
      };
      let jogo: SessaoDeJogo | null = null;
      if (nativo && origem.path)
        try {
          const r = await servicos().backend.chamar<{ porta: number; token: string }>('nativo.abrir', {
            sistema: aberto.sistema,
            path: origem.path,
            bios: bios.map((b) => b.nome),
            opcoes: { ...NUCLEOS[aberto.sistema]?.opcoes, ...opcoes, pcsx_rearmed_drc: 'enabled' },
            ...(NUCLEOS[aberto.sistema]?.dispositivo ? { dispositivo: NUCLEOS[aberto.sistema]?.dispositivo } : {}),
          });
          jogo = await JogoNativo.abrir(
            { sistema: aberto.sistema, porta: r.porta, token: r.token, volume: volume / 100, mudo, sram },
            eventos,
          );
        } catch (e) {
          const linhas = await logDoNativo();
          void servicos()
            .backend.chamar('nativo.fechar')
            .catch(() => undefined); // já fechado ou nem abriu: nada a fazer
          const peso = aberto.pesoCd ?? 0;
          // CD grande: o WebAssembly teria que ler ele inteiro na página (estoura a memória); mostra o erro e para
          if (peso > MAX_RESERVA_WASM) {
            registrar(
              'error',
              'nativo',
              `o núcleo nativo não abriu (${textoDoErro(e)}); CD de ${mb(peso)} MB, sem reserva no WebAssembly · ${linhas.join(' | ')}`,
            );
            av.avisarErro(
              `PS1 nativo não abriu: ${textoDoErro(e)}. O CD tem ${mb(peso)} MB, grande demais pro WebAssembly; ` +
                'o log do processo foi pro log do app (Ajuda → Reportar bug)',
            );
            return false;
          }
          // reserva automática: o wasm continua no app
          registrar(
            'warn',
            'nativo',
            `o núcleo nativo não abriu (${textoDoErro(e)}): usando o WebAssembly · ${linhas.join(' | ')}`,
          );
          av.avisar('PS1 nativo não abriu: usando o WebAssembly', 3500);
          aberto = await jogoInteiro(aberto, origem.path);
          aberto = await completarJogo(aberto, (nome) => acharNaKofGames(nome, origem.path));
        }
      // CD de PS1 no WebAssembly: vai pro Worker sem cópia (o aberto fica com o tamanho guardado)
      const transferir = aberto.sistema === 'ps1';
      if (transferir) aberto = { ...aberto, tamanho };
      jogo ??= await Jogo.abrir(
        {
          transferir,
          sistema: aberto.sistema,
          rom: aberto.rom,
          baseNucleos: new URL('nucleos/', document.baseURI),
          volume: volume / 100,
          mudo,
          sram,
          opcoes,
          extras: {
            bios,
            ...(aberto.principal ? { principal: aberto.principal } : {}),
            ...(aberto.arquivos ? { arquivos: aberto.arquivos } : {}),
          },
        },
        eventos,
      );
      const provisorio: RegistroJogo = {
        ...ident,
        nome: aberto.nome,
        arquivo: aberto.arquivo,
        sistema: aberto.sistema,
        tamanho,
        ultimo: Date.now(),
      };
      abertoAgora = aberto;
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
      else if (!jogo.comSom)
        av.avisar(
          jogo instanceof JogoNativo
            ? 'sem som: nenhuma saída de som achada (o jogo roda mudo)'
            : 'sem som: o navegador não liberou o áudio (o jogo roda mudo)',
          4000,
        );
      depoisDeAbrirJogo.forEach((f) => f());
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
    void antesDeTrocar();
    document.body.classList.remove('rebobinando');
    fecharSessao(get().jogo);
    abertoAgora = null;
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

/**
 * CD de PS1 arrastado/aberto de fora com o nativo ligado: vai pra Kof Games aos pedaços (nunca inteiro na memória) e
 * abre de lá, no nativo. false = não é o caso (outro sistema, sem nativo, sem Kof Games): segue o caminho normal.
 */
async function abrirCdDeFora(arquivo: File, soltos: File[]): Promise<boolean> {
  if (!(await nativoLigado('ps1'))) return false;
  const ler = async (o: number, n: number) => new Uint8Array(await arquivo.slice(o, o + n).arrayBuffer());
  const fato = await fatosDe(arquivo.name, arquivo.size, ler);
  if (sistemaDoArquivo(fato) !== 'ps1') return false;
  const { backend } = servicos();
  const av = usarAvisos.getState();
  let g;
  try {
    av.avisar(`📁 guardando ${arquivo.name} na Kof Games…`, 4000);
    g = await guardarNaKofGamesAosPedacos(backend, fato, arquivo);
    if (!g) return false;
    // os .bin do .cue vão pra mesma pasta (as faixas de áudio não parecem PS1 sozinhas)
    const pasta = g.path.split('/')[1];
    for (const sol of soltos)
      await guardarNaKofGamesAosPedacos(backend, { nome: sol.name, tamanho: sol.size }, sol, pasta ? { pasta } : {});
  } catch (e) {
    if ((e as { code?: string }).code === 'ROOT_MISSING') return false; // sem Kof Games: abre do jeito de antes
    throw e;
  }
  const aberto = await cabecaDoCd(backend, g.path, arquivo.size);
  if (!aberto) return false;
  if (g.novo) av.avisar(`📁 ${arquivo.name} guardado em Kof Games/${g.path.split('/').slice(0, -1).join('/')}`, 3500);
  await usarJogo.getState().abrirJogo(aberto, { path: g.path });
  return true;
}

/** Fecha a sessão; a nativa também fecha o processo dela. */
function fecharSessao(j: SessaoDeJogo | null) {
  j?.fechar();
  if (j instanceof JogoNativo)
    void servicos()
      .backend.chamar('nativo.fechar')
      .catch(() => undefined);
}

/** O núcleo nativo deu erro: o log do processo vai pro log do app (e o caçador de bugs junta). */
async function anotarLogNativo(m: string) {
  registrar('error', 'nativo', `${m} · ${(await logDoNativo()).join(' | ')}`);
}

/**
 * Um arquivo que o jogo precisa (os .bin do .cue, o zip do pai do Neo Geo): primeiro na pasta do jogo, depois em
 * qualquer lugar da Kof Games com esse nome. null = não achou (ou não tem Kof Games).
 */
export async function acharNaKofGames(nome: string, pathDoJogo?: string): Promise<Uint8Array | null> {
  const { backend } = servicos();
  const alvo = nome.toLowerCase();
  const pasta = pathDoJogo?.split('/').slice(0, -1).join('/');
  if (pasta)
    try {
      return await lerDaKofGames(backend, `${pasta}/${nome}`);
    } catch {
      // não está do lado: procura na Kof Games inteira
    }
  try {
    const achou = (await varrerKofGames(backend)).find((a) => a.arquivo.toLowerCase() === alvo);
    return achou ? await lerDaKofGames(backend, achou.path) : null;
  } catch {
    return null; // sem Kof Games escolhida
  }
}

/** Depois de abrir: registra na biblioteca e, se veio de fora, guarda uma cópia na Kof Games (o original fica). */
async function guardarNaBiblioteca(aberto: JogoAberto, origem: Origem): Promise<RegistroJogo | null> {
  const { backend, armazem } = servicos();
  let path = origem.path;
  const f = origem.arquivoDeFora;
  if (!path && f) {
    try {
      const fato = await fatosDe(f.name, f.size, async (o, n) => new Uint8Array(await f.slice(o, o + n).arrayBuffer()));
      // arquivo grande (CD): aos pedaços, sem ler inteiro de novo
      const guardado =
        f.size > GRANDE
          ? await guardarNaKofGamesAosPedacos(backend, fato, f)
          : await guardarNaKofGames(backend, fato, new Uint8Array(await f.arrayBuffer()));
      path = guardado?.path;
      // os .bin do .cue vão pra mesma pasta (senão o jogo da biblioteca não acha eles)
      const pasta = guardado?.path.split('/')[1];
      if (pasta)
        for (const s of origem.soltos ?? [])
          await guardarNaKofGamesAosPedacos(backend, { nome: s.name, tamanho: s.size }, s, { pasta });
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
