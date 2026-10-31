// Como cada sistema roda no libretro: núcleo, tamanho da imagem que o app usa, proporção e opções padrão. Copiado do
// `SISTEMAS` do web/nucleo.js do kofstation-old (só o que a engine precisa; nome e extensões ficam no domain).
import type { SistemaId } from '@kof/domain';

export type NucleoId = 'snes9x' | 'gambatte' | 'fceumm' | 'genplus' | 'mgba';

export interface ConfigNucleo {
  nucleo: NucleoId;
  largura: number;
  altura: number;
  /** a resolução muda no meio do jogo (Sega): o tamanho acompanha o núcleo */
  dinamico?: boolean;
  /** console de TV: "como na TV" = 4:3 */
  tv43?: boolean;
  /** proporção fixa da tela do aparelho (Game Gear 10:9) */
  proporcao?: number;
  opcoes?: Readonly<Record<string, string>>;
  /** extensão usada no nome que o núcleo recebe */
  ext: string;
}

/** Sistemas que já rodam no app novo (M2). PS1, N64, Neo Geo e PS2 chegam no M11/M12. */
export const NUCLEOS: Partial<Record<SistemaId, ConfigNucleo>> = {
  snes: { nucleo: 'snes9x', largura: 256, altura: 224, ext: 'sfc' },
  gb: { nucleo: 'gambatte', largura: 160, altura: 144, ext: 'gb' },
  nes: { nucleo: 'fceumm', largura: 256, altura: 224, tv43: true, opcoes: { fceumm_sndquality: 'High' }, ext: 'nes' },
  md: { nucleo: 'genplus', largura: 320, altura: 224, dinamico: true, tv43: true, ext: 'md' },
  sms: { nucleo: 'genplus', largura: 256, altura: 192, dinamico: true, tv43: true, ext: 'sms' },
  gba: { nucleo: 'mgba', largura: 240, altura: 160, ext: 'gba' },
  gg: { nucleo: 'genplus', largura: 160, altura: 144, dinamico: true, proporcao: 10 / 9, ext: 'gg' },
};

/** O SNES é sempre de TV no antigo (naTv: sistema snes ou tv43). */
export const ehDeTv = (s: SistemaId): boolean => s === 'snes' || !!NUCLEOS[s]?.tv43;

/** Nome que o núcleo recebe (o Gambatte decide GB × GBC pela extensão: GBC se o byte 0x143 tiver o bit 7). */
export function nomeParaNucleo(s: SistemaId, rom: Uint8Array): string {
  const c = NUCLEOS[s];
  if (!c) throw new Error(`sistema sem núcleo no app novo: ${s}`);
  return 'rom.' + (s === 'gb' && (rom[0x143] ?? 0) & 0x80 ? 'gbc' : c.ext);
}

// bits do controle virtual (os do SNES) -> ids do libretro: B Y Select Start Cima Baixo Esq Dir A X L R L2 R2
const LIGACAO: readonly (readonly [number, number])[] = [
  [0x8000, 0],
  [0x4000, 1],
  [0x2000, 2],
  [0x1000, 3],
  [0x0800, 4],
  [0x0400, 5],
  [0x0200, 6],
  [0x0100, 7],
  [0x0080, 8],
  [0x0040, 9],
  [0x0020, 10],
  [0x0010, 11],
  [0x0008, 12],
  [0x0004, 13],
];

/** O `mascara()` do antigo. */
export function mascaraLibretro(bits: number): number {
  let m = 0;
  for (const [bit, id] of LIGACAO) if (bits & bit) m |= 1 << id;
  return m;
}
