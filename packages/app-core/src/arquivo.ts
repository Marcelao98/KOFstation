// Caso de uso: transformar um arquivo escolhido (ROM solta ou .zip) num jogo pronto pra rodar.
import {
  arquivosDoCue,
  baseCd,
  cdPs1,
  cueDasFaixas,
  dadosDaEntrada,
  ehZip,
  extensao,
  hex8,
  listarZip,
  nomeNeoGeo,
  paiNeoGeo,
  setNeoGeo,
  setNeoGeoPorCrcs,
  sistemaDoArquivo,
  sistemaPorExtensao,
  SISTEMAS,
  zipTemCd,
  type EntradaZip,
  type SistemaId,
} from '@kof/domain';
import { NUCLEOS } from '@kof/engine';

export interface JogoAberto {
  nome: string;
  /** nome do arquivo da ROM (o de dentro, num zip) */
  arquivo: string;
  sistema: SistemaId;
  rom: Uint8Array;
  /** núcleo que abre por arquivo (Neo Geo, PS1): o nome do principal no disco virtual (<set>.zip, jogo.cue) */
  principal?: string;
  /** os outros arquivos do jogo (os .bin do .cue; o zip do pai do Neo Geo) */
  arquivos?: { nome: string; bytes: Uint8Array }[];
  /** arquivos que o jogo cita e não vieram junto (os .bin de um .cue aberto sozinho): completarJogo procura */
  faltam?: string[];
  /**
   * Só a cabeça do arquivo foi lida (PS1 que vai pro núcleo nativo: o CD não passa pela página). `rom` tem o começo e
   * `tamanho` o tamanho de verdade, que é o que entra na identidade e na chave do save.
   */
  parcial?: boolean;
  tamanho?: number;
  /**
   * Bytes do CD no disco (o .cue com os .bin, o zip descompactado, a imagem), quando só a cabeça foi lida. Decide se o
   * WebAssembly pode ser a reserva do nativo (CD grande não: teria que passar inteiro pela página).
   */
  pesoCd?: number;
}

/** O tamanho de verdade do jogo (a `rom` pode ser só a cabeça). */
export const tamanhoDoJogo = (j: Pick<JogoAberto, 'rom' | 'tamanho'>): number => j.tamanho ?? j.rom.length;

export class ErroDeArquivo extends Error {
  constructor(
    readonly code: 'NOT_A_GAME' | 'SYSTEM_NOT_YET' | 'BAD_ZIP' | 'GAME_FILE_MISSING',
    message: string,
  ) {
    super(message);
    this.name = 'ErroDeArquivo';
  }
}

const semExtensao = (n: string) => (n.split(/[\\/]/).pop() ?? n).replace(/\.[^.]+$/, '');
const roda = (s: SistemaId | null): s is SistemaId => !!s && !!NUCLEOS[s];

export async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([dados as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function entrada(bytes: Uint8Array, e: EntradaZip): Promise<Uint8Array> {
  const dados = dadosDaEntrada(bytes, e);
  if (e.metodo === 0) return dados.slice();
  if (e.metodo === 8) return inflar(dados);
  throw new ErroDeArquivo('BAD_ZIP', `o zip usa uma compressão que eu não conheço (método ${e.metodo})`);
}
const soNome = (n: string) => n.split(/[\\/]/).pop() ?? n;

/** CD de PlayStation em arquivos (o .cue e os .bin, ou uma imagem só): monta o jogo, com o .cue que faltar. */
function cdDe(nome: string, arqs: { nome: string; bytes: Uint8Array }[], soltos = true): JogoAberto {
  const cue = arqs.find((a) => /\.cue$/i.test(a.nome));
  const img = arqs.find((a) => /\.(chd|pbp|iso|exe)$/i.test(a.nome));
  const titulo = (n: string) => baseCd(soNome(n));
  if (cue) {
    const pede = arquivosDoCue(new TextDecoder().decode(cue.bytes));
    const tem = new Map(arqs.map((a) => [soNome(a.nome).toLowerCase(), a]));
    const arquivos = pede.flatMap((n) =>
      tem.has(n.toLowerCase()) ? [{ nome: n, bytes: tem.get(n.toLowerCase())?.bytes ?? new Uint8Array(0) }] : [],
    );
    const faltam = pede.filter((n) => !tem.has(n.toLowerCase()));
    return {
      nome: titulo(cue.nome),
      arquivo: soNome(soltos ? cue.nome : nome),
      sistema: 'ps1',
      rom: cue.bytes,
      principal: soNome(cue.nome),
      arquivos,
      ...(faltam.length ? { faltam } : {}),
    };
  }
  if (img)
    return {
      nome: titulo(img.nome),
      arquivo: soNome(soltos ? img.nome : nome),
      sistema: 'ps1',
      rom: img.bytes,
      principal: soNome(img.nome),
    };
  // só os .bin (faixas): o .cue sai das faixas
  const faixas = arqs
    .filter((a) => /\.(bin|img)$/i.test(a.nome))
    .map((a) => ({ nome: soNome(a.nome), bytes: a.bytes }));
  const base = titulo(faixas[0]?.nome ?? nome);
  return {
    nome: base,
    arquivo: soNome(nome),
    sistema: 'ps1',
    rom: cueDasFaixas(faixas),
    principal: base + '.cue',
    arquivos: faixas,
  };
}

/**
 * Um arquivo escolhido (ROM solta, .zip, zip de Neo Geo, CD de PS1) vira um jogo pronto pra rodar. `soltos` = os outros
 * arquivos que vieram junto (os .bin de um .cue).
 */
export async function lerArquivoDeJogo(
  nome: string,
  bytes: Uint8Array,
  soltos: { nome: string; bytes: Uint8Array }[] = [],
): Promise<JogoAberto> {
  if (extensao(nome) === 'zip' || ehZip(bytes)) {
    let lista;
    try {
      lista = listarZip(bytes);
    } catch (e) {
      throw new ErroDeArquivo('BAD_ZIP', `não consegui abrir esse zip: ${(e as Error).message}`);
    }
    const itens = lista.map((e) => ({ nome: e.nome, tamanho: e.tamanho, crc: hex8(e.crc) }));
    // Neo Geo: o zip inteiro é o jogo (o set pelo nome do arquivo ou pelos CRCs dos chips de programa)
    const temRom = lista.some((e) => roda(sistemaPorExtensao(e.nome)));
    const set =
      setNeoGeo(nome) ?? (!temRom && !zipTemCd(itens) ? setNeoGeoPorCrcs(new Set(itens.map((i) => i.crc))) : null);
    if (set)
      return {
        nome: nomeNeoGeo(set) ?? set,
        arquivo: soNome(nome),
        sistema: 'neogeo',
        rom: bytes,
        principal: set + '.zip',
      };
    if (zipTemCd(itens)) {
      const arqs = [];
      for (const e of lista)
        if (/\.(cue|chd|pbp|iso|bin|img)$/i.test(e.nome))
          arqs.push({ nome: soNome(e.nome), bytes: await entrada(bytes, e) });
      return cdDe(nome, arqs, false);
    }
    const candidatas = lista.filter((e) => roda(sistemaPorExtensao(e.nome))).sort((a, b) => b.tamanho - a.tamanho);
    const e = candidatas[0];
    if (!e) {
      const outro = lista.map((x) => sistemaPorExtensao(x.nome)).find((s) => s);
      if (outro) throw naoAinda(outro);
      throw new ErroDeArquivo('NOT_A_GAME', `não achei nenhum jogo dentro de ${nome}`);
    }
    return {
      nome: semExtensao(e.nome),
      arquivo: soNome(e.nome),
      sistema: sistemaPorExtensao(e.nome) as SistemaId,
      rom: await entrada(bytes, e),
    };
  }
  const s = sistemaDoArquivo({ nome, tamanho: bytes.length, cd: cdPs1(bytes.subarray(0, 0x9001)) ? 'ps1' : null });
  if (!s) throw new ErroDeArquivo('NOT_A_GAME', `${nome} não parece um jogo (extensão .${extensao(nome) || '?'})`);
  if (!roda(s)) throw naoAinda(s);
  if (s === 'ps1') return cdDe(nome, [{ nome, bytes }, ...soltos]);
  return { nome: semExtensao(nome), arquivo: soNome(nome), sistema: s, rom: bytes };
}

/**
 * O que o jogo precisa e não veio no arquivo: os .bin de um .cue e o zip do pai de um clone de Neo Geo. `achar` procura
 * pelo nome (na pasta do jogo, na Kof Games). Sem o pai, tenta assim mesmo (o zip do clone pode vir completo).
 */
export async function completarJogo(
  j: JogoAberto,
  achar: (nome: string) => Promise<Uint8Array | null>,
): Promise<JogoAberto> {
  const arquivos = [...(j.arquivos ?? [])];
  const faltam: string[] = [];
  for (const n of j.faltam ?? []) {
    const b = await achar(n);
    if (b) arquivos.push({ nome: n, bytes: b });
    else faltam.push(n);
  }
  if (faltam.length)
    throw new ErroDeArquivo(
      'GAME_FILE_MISSING',
      `faltam ${faltam.join(', ')} (o .cue cita esses arquivos: deixe eles na mesma pasta ou escolha todos juntos)`,
    );
  if (j.sistema === 'neogeo' && j.principal) {
    const pai = paiNeoGeo(j.principal.replace(/\.zip$/i, ''));
    if (pai && !arquivos.some((a) => a.nome.toLowerCase() === pai + '.zip')) {
      const b = await achar(pai + '.zip');
      if (b) arquivos.push({ nome: pai + '.zip', bytes: b });
    }
  }
  const r: JogoAberto = { ...j, arquivos };
  delete r.faltam;
  return r;
}

function naoAinda(s: SistemaId): ErroDeArquivo {
  const nomeSis = SISTEMAS.find((x) => x.id === s)?.nome ?? s;
  return new ErroDeArquivo(
    'SYSTEM_NOT_YET',
    `${nomeSis} ainda não roda no app novo (chega no M12); no app antigo funciona`,
  );
}
