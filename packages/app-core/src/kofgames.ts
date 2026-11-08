// Caso de uso: a pasta Kof Games (comandos library.* do Rust) e a lista de arquivos dela pronta pra biblioteca, no
// mesmo formato que o `lerPasta` do antigo devolvia (nome, arquivo, ext, chave, variante, faixa).
import {
  EXTENSOES,
  baseCd,
  extensao,
  normal,
  numFaixa,
  pastaDoArquivo,
  planejarOrganizacao,
  sistemaDoArquivo,
  VARIANTE,
  type FatoDeArquivo,
  type ItemDoInventario,
  type ItemDoZip,
  type Movimento,
  type Plano,
  type SistemaId,
} from '@kof/domain';
import type { Backend } from './backend';

export interface InfoRaiz {
  path: string | null;
  ok: boolean;
  missing: string[];
  sugestao: string;
}

export interface ArquivoDoRust {
  path: string;
  size: number;
  modified: number;
  zip?: ItemDoZip[];
  cd?: 'ps1' | 'ps2' | null;
}

export interface ArquivoKof {
  /** relativo à raiz: "Games/snes/Jogo.sfc" */
  path: string;
  /** nome sem a extensão */
  nome: string;
  /** nome do arquivo */
  arquivo: string;
  ext: string;
  tamanho: number;
  modificado: number;
  sistema: SistemaId | null;
  chave: string;
  variante: boolean;
  /** .bin que é faixa de um CD (não aparece como jogo) */
  faixa: boolean;
  zip?: ItemDoZip[];
}

export const obterRaiz = (b: Backend) => b.chamar<InfoRaiz>('library.root.get');
export const escolherRaiz = (b: Backend, path: string) => b.chamar<InfoRaiz>('library.root.set', { path });

/** Os arquivos de Kof Games/Games já com o sistema de cada um. */
export async function varrerKofGames(b: Backend): Promise<ArquivoKof[]> {
  const r = await b.chamar<{ files: ArquivoDoRust[] }>('library.scan', { exts: ['zip', ...EXTENSOES] });
  return montarArquivos(r.files);
}

export function montarArquivos(files: readonly ArquivoDoRust[]): ArquivoKof[] {
  const base = (p: string) => p.split('/').pop() ?? p;
  const cues = files
    .filter((f) => /\.cue$/i.test(f.path))
    .map((f) =>
      base(f.path)
        .replace(/\.cue$/i, '')
        .toLowerCase(),
    );
  return files.map((f) => {
    const arquivo = base(f.path);
    const nome = arquivo.replace(/\.[^.]+$/, '');
    const fato: FatoDeArquivo = { nome: arquivo, tamanho: f.size };
    if (f.zip) fato.zip = f.zip;
    if (f.cd !== undefined) fato.cd = f.cd;
    const faixa =
      /\.bin$/i.test(arquivo) && (cues.some((c) => nome.toLowerCase().startsWith(c)) || numFaixa(arquivo) > 1);
    const a: ArquivoKof = {
      path: f.path,
      nome,
      arquivo,
      ext: extensao(arquivo).toUpperCase(),
      tamanho: f.size,
      modificado: f.modified,
      sistema: sistemaDoArquivo(fato),
      chave: normal(nome),
      variante: VARIANTE.test(nome),
      faixa,
    };
    if (f.zip) a.zip = f.zip;
    return a;
  });
}

/** Lê um arquivo da Kof Games (inteiro ou um pedaço). */
export function lerDaKofGames(b: Backend, path: string, offset?: number, length?: number): Promise<Uint8Array> {
  const a: Record<string, unknown> = { scope: 'kof-games', path };
  if (offset !== undefined) a.offset = offset;
  if (length !== undefined) a.length = length;
  return b.lerBinario('file.read', a);
}

/** CRC No-Intro de arquivos soltos (o Rust guarda em cache). */
export async function crcsDaKofGames(b: Backend, items: { path: string; sistema: string }[]) {
  if (!items.length) return {};
  return (await b.chamar<{ crcs: Record<string, string> }>('library.crc', { items })).crcs;
}

export { baseCd };

// ---------- organizar (M3.3) ----------

interface ItemInventarioRust extends ArquivoDoRust {
  cue?: string[];
}

/** O plano de organização da Kof Games (nada muda até `aplicarPlano`). */
export async function planejarKofGames(b: Backend): Promise<Plano> {
  const inv = await b.chamar<{ files: ItemInventarioRust[]; dirs: string[] }>('library.inventory');
  return planejarOrganizacao({
    dirs: inv.dirs,
    files: inv.files.map((f) => {
      const i: ItemDoInventario = { path: f.path, nome: f.path.split('/').pop() ?? f.path, tamanho: f.size };
      if (f.zip) i.zip = f.zip;
      if (f.cd !== undefined) i.cd = f.cd;
      if (f.cue) i.cue = f.cue;
      return i;
    }),
  });
}

export interface ResultadoOrganizar {
  done: Movimento[];
  failed: { move: Movimento; code: string; message: string }[];
  removed: string[];
}

export const aplicarPlano = (b: Backend, p: Plano) =>
  b.chamar<ResultadoOrganizar>('library.organize.apply', { moves: p.moves, limpar: p.limpar });

/** Jogo aberto de fora: guarda uma cópia em Kof Games/Games/<console> (o original fica). `novo` = copiou agora
 *  (false = já estava lá com o mesmo tamanho); null = não é jogo que tenha pasta. */
/** Tamanho de cada pedaço quando o arquivo vai aos pedaços (`library.import.parte`). */
export const PEDACO = 16 << 20;

/**
 * Guarda um arquivo grande na Kof Games aos pedaços, lendo do `Blob` (o arquivo arrastado) uma fatia por vez: o CD
 * nunca fica inteiro na memória da página. `progresso` recebe 0..1.
 */
export async function guardarNaKofGamesAosPedacos(
  b: Backend,
  fato: FatoDeArquivo,
  arquivo: Blob,
  opcoes: { pasta?: string; progresso?: (p: number) => void } = {},
): Promise<{ path: string; novo: boolean } | null> {
  const { progresso } = opcoes;
  const pasta = opcoes.pasta ?? pastaDoArquivo(fato);
  if (!pasta) return null;
  const total = arquivo.size;
  let stored: string | null = null;
  for (let offset = 0; offset < total || (total === 0 && offset === 0); offset += PEDACO) {
    const pedaco = arquivo.slice(offset, Math.min(total, offset + PEDACO));
    const args = { pasta, nome: fato.nome, offset, total };
    type R = { stored: string | null; ja: boolean };
    // direto do disco quando o backend sabe (o local); senão, lê a fatia
    const r = b.enviarArquivo
      ? await b.enviarArquivo<R>('library.import.parte', args, pedaco)
      : await b.enviarBinario<R>('library.import.parte', args, new Uint8Array(await pedaco.arrayBuffer()));
    progresso?.(Math.min(1, (offset + pedaco.size) / Math.max(1, total)));
    if (r.ja) return { path: r.stored ?? `Games/${pasta}/${fato.nome}`, novo: false };
    stored = r.stored;
    if (total === 0) break;
  }
  return { path: stored ?? `Games/${pasta}/${fato.nome}`, novo: true };
}

export async function guardarNaKofGames(
  b: Backend,
  fato: FatoDeArquivo,
  bytes: Uint8Array,
): Promise<{ path: string; novo: boolean } | null> {
  const pasta = pastaDoArquivo(fato);
  if (!pasta) return null;
  const r = await b.enviarBinario<{ stored: string | null }>('library.import', { pasta, nome: fato.nome }, bytes);
  return { path: r.stored ?? `Games/${pasta}/${fato.nome}`, novo: !!r.stored };
}
