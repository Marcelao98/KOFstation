// Caso de uso: patch de tradução (.ips/.bps/.ups, solto ou num .zip) aplicado numa ROM de cartucho (aplicarPatch do
// antigo). O jogo traduzido vira outro arquivo ("Jogo (tradução).sfc"), com o 🇧🇷 na biblioteca.
import {
  aplicarPatch,
  dadosDaEntrada,
  ehZip,
  EXT_PATCH,
  listarZip,
  nomeTraduzido,
  tipoDoPatch,
  type TipoPatch,
} from '@kof/domain';
import { ErroDeArquivo, inflar, type JogoAberto } from './arquivo';

export const ehArquivoDePatch = (nome: string): boolean => EXT_PATCH.test(nome);

/** O patch de dentro do arquivo (solto ou o primeiro .ips/.bps/.ups de um zip); null se não tiver. */
export async function lerPatch(nome: string, bytes: Uint8Array): Promise<{ nome: string; patch: Uint8Array } | null> {
  if (!ehZip(bytes)) return ehArquivoDePatch(nome) || tipoDoPatch(bytes) ? { nome, patch: bytes } : null;
  const e = listarZip(bytes).find((x) => EXT_PATCH.test(x.nome));
  if (!e) return null;
  const dados = dadosDaEntrada(bytes, e);
  const patch = e.metodo === 0 ? dados.slice() : e.metodo === 8 ? await inflar(dados) : null;
  if (!patch) throw new ErroDeArquivo('BAD_ZIP', `o zip usa uma compressão que eu não conheço (método ${e.metodo})`);
  return { nome: e.nome.split(/[\\/]/).pop() ?? e.nome, patch };
}

const SO_CARTUCHO = new Set(['neogeo', 'ps1', 'ps2']);

/** A ROM traduzida (outro nome de arquivo) e de onde veio. */
export function traduzir(
  rom: JogoAberto,
  patch: Uint8Array,
): { arquivo: string; original: string; bytes: Uint8Array; tipo: TipoPatch } {
  if (SO_CARTUCHO.has(rom.sistema))
    throw new ErroDeArquivo('NOT_A_GAME', 'patch só vale pra ROM de cartucho (não pra zip de fliperama nem CD)');
  const r = aplicarPatch(rom.rom, patch, rom.sistema);
  const { nome, original } = nomeTraduzido(rom.arquivo);
  return { arquivo: nome, original, bytes: r.rom, tipo: r.tipo };
}
