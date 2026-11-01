// Caso de uso: a pasta Kof Games (comandos library.* do Rust) e a lista de arquivos dela pronta pra biblioteca, no
// mesmo formato que o `lerPasta` do antigo devolvia (nome, arquivo, ext, chave, variante, faixa).
import {
  EXTENSOES,
  baseCd,
  extensao,
  normal,
  numFaixa,
  sistemaDoArquivo,
  VARIANTE,
  type FatoDeArquivo,
  type ItemDoZip,
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
