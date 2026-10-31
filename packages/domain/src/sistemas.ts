// Sistemas que o KOFstation conhece. Copiado do `SISTEMAS` do web/nucleo.js do kofstation-old: mesmos ids, nomes e
// extensões, NA MESMA ORDEM (a ordem decide quando uma extensão aparece em dois: `.bin` é Mega Drive, `.iso` é PS1 pela
// extensão; o PS2 por .iso é reconhecido pelo conteúdo, num passo seguinte).

export type SistemaId = 'snes' | 'gb' | 'nes' | 'md' | 'sms' | 'gba' | 'neogeo' | 'gg' | 'ps1' | 'n64' | 'ps2';

export interface Sistema {
  readonly id: SistemaId;
  readonly nome: string;
  readonly curto: string;
  readonly ext: readonly string[];
}

export const SISTEMAS: readonly Sistema[] = [
  { id: 'snes', nome: 'Super Nintendo', curto: 'SNES', ext: ['sfc', 'smc', 'fig', 'swc'] },
  { id: 'gb', nome: 'Game Boy', curto: 'GB', ext: ['gb', 'gbc', 'sgb'] },
  { id: 'nes', nome: 'NES', curto: 'NES', ext: ['nes'] },
  { id: 'md', nome: 'Mega Drive', curto: 'MD', ext: ['md', 'gen', 'smd', 'bin'] },
  { id: 'sms', nome: 'Master System', curto: 'SMS', ext: ['sms'] },
  { id: 'gba', nome: 'Game Boy Advance', curto: 'GBA', ext: ['gba'] },
  // Neo Geo não tem extensão: o zip é reconhecido pelo nome do set (lista do FBNeo) ou pelo conteúdo
  { id: 'neogeo', nome: 'Neo Geo', curto: 'NEO', ext: [] },
  { id: 'gg', nome: 'Game Gear', curto: 'GG', ext: ['gg'] },
  { id: 'ps1', nome: 'PlayStation', curto: 'PS1', ext: ['cue', 'chd', 'pbp', 'iso', 'exe'] },
  { id: 'n64', nome: 'Nintendo 64', curto: 'N64', ext: ['z64', 'n64', 'v64'] },
  { id: 'ps2', nome: 'PlayStation 2', curto: 'PS2', ext: ['elf', 'cso', 'isz'] },
];

/** Extensão em minúsculas, sem o ponto ('' se não tiver). */
export function extensao(nomeDoArquivo: string): string {
  const base = nomeDoArquivo.split(/[\\/]/).pop() ?? '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i + 1).toLowerCase() : '';
}

/** O sistema pela extensão, como o `sistemaDe` do antigo; `null` se nenhum sistema usa a extensão. */
export function sistemaPorExtensao(nomeDoArquivo: string): SistemaId | null {
  const e = extensao(nomeDoArquivo);
  if (!e) return null;
  return SISTEMAS.find((s) => s.ext.includes(e))?.id ?? null;
}

/** Todas as extensões de jogo (o `EXTENSOES` do antigo). */
export const EXTENSOES: readonly string[] = SISTEMAS.flatMap((s) => s.ext);
