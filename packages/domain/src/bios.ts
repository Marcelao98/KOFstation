// BIOS dos consoles (SISTEMAS[x].bios e ehBiosPs2/sistemaDaBios do antigo): o arquivo que cada núcleo procura no
// /sistema, o tamanho, e se é opcional. O KOFstation nunca traz BIOS: a pessoa escolhe a dela uma vez.
import type { SistemaId } from './sistemas';

export interface ArquivoDeBios {
  arquivo: string;
  tamanho?: number;
  opcional?: boolean;
}

const PS1 = [
  'scph5501.bin',
  'scph1001.bin',
  'scph7001.bin',
  'scph5500.bin',
  'scph5502.bin',
  'scph101.bin',
  'scph7502.bin',
  'psxonpsp660.bin',
].map((arquivo): ArquivoDeBios => ({ arquivo, tamanho: 524288, opcional: true }));

export const BIOS: Partial<Record<SistemaId, readonly ArquivoDeBios[]>> = {
  gba: [{ arquivo: 'gba_bios.bin', tamanho: 16384, opcional: true }],
  neogeo: [{ arquivo: 'neogeo.zip' }],
  ps1: PS1,
  ps2: [{ arquivo: 'bios-ps2.bin', tamanho: 4194304 }], // o PCSX2 não liga sem
};

/** A ordem e a dica da tela de BIOS. */
export const SISTEMAS_COM_BIOS: readonly SistemaId[] = ['ps2', 'neogeo', 'ps1', 'gba'];
export const DICA_DA_BIOS: Partial<Record<SistemaId, string>> = {
  ps2: 'precisa pra jogar PS2 pelo PCSX2',
  neogeo: 'precisa pra jogar Neo Geo',
  ps1: 'opcional (sem ela usa uma imitada)',
  gba: 'opcional (o GBA roda sem)',
};

/** BIOS do PS2: 4 a 8 MB com a tabela ROMDIR (começa com RESET), como o PCSX2 confere. */
export function ehBiosPs2(d: Uint8Array): boolean {
  if (d.length < 4194304 || d.length > 8388608) return false;
  const lim = Math.min(d.length - 32, 65536);
  for (let i = 0; i < lim; i += 16)
    if (
      d[i] === 82 &&
      d[i + 1] === 69 &&
      d[i + 2] === 83 &&
      d[i + 3] === 69 &&
      d[i + 4] === 84 &&
      d[i + 5] === 0 &&
      String.fromCharCode(...d.subarray(i + 16, i + 22)) === 'ROMDIR'
    )
      return true;
  return false;
}

/** De qual sistema é esse arquivo de BIOS (pelo nome e o tamanho; o PS2 pelo conteúdo). */
export function sistemaDaBios(nome: string, dados: Uint8Array): SistemaId | null {
  if (ehBiosPs2(dados)) return 'ps2';
  const n = nome.toLowerCase().replace(/^.*[\\/]/, '');
  const t = dados.length;
  const lista = Object.entries(BIOS) as [SistemaId, readonly ArquivoDeBios[]][];
  const s =
    lista.find(([, b]) => b.some((x) => x.arquivo === n && (!x.tamanho || x.tamanho === t)))?.[0] ??
    lista.find(([, b]) => b.some((x) => x.tamanho && x.tamanho === t))?.[0] ??
    null;
  return s === 'ps2' ? null : s; // 4 MB de qualquer coisa (.DIFF) não é BIOS do PS2: tem que ter a ROMDIR
}

/**
 * Aceita o arquivo como BIOS do sistema pedido (botão de um console na tela de BIOS: qualquer nome)? Devolve o nome
 * com que ela fica guardada (o que o núcleo procura), ou null.
 */
export function arquivoDaBios(sistema: SistemaId, nome: string, dados: Uint8Array): string | null {
  const lista = BIOS[sistema];
  if (!lista?.length) return null;
  const n = nome.toLowerCase().replace(/^.*[\\/]/, '');
  const achou = sistemaDaBios(nome, dados);
  const aceita =
    achou === sistema ||
    (sistema === 'neogeo' && /\.zip$/i.test(n)) ||
    (sistema !== 'ps2' && lista.some((x) => x.tamanho === dados.length));
  if (!aceita) return null;
  return (
    (lista.find((b) => b.arquivo === n) ?? lista.find((b) => b.tamanho === dados.length) ?? lista[0])?.arquivo ?? null
  );
}

/** Falta BIOS obrigatória pra esse sistema? (`tem` = arquivos guardados) */
export const faltaBios = (sistema: SistemaId, tem: ReadonlySet<string>): boolean =>
  (BIOS[sistema] ?? []).some((b) => !b.opcional && !tem.has(b.arquivo));
