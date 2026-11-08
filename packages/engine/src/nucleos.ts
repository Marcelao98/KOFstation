// Como cada sistema roda no libretro: núcleo, tamanho da imagem que o app usa, proporção e opções padrão. Copiado do
// `SISTEMAS` do web/nucleo.js do kofstation-old (só o que a engine precisa; nome e extensões ficam no domain).
import type { SistemaId } from '@kof/domain';

export type NucleoId = 'snes9x' | 'gambatte' | 'fceumm' | 'genplus' | 'mgba' | 'fbneo' | 'pcsx' | 'mupen64' | 'pcsx2';

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
  /** sem rebobinar (estado grande demais: PS1/PS2) */
  semRebob?: boolean;
  /** o núcleo só abre o jogo por arquivo (FBNeo, PCSX): vai pro disco virtual /jogos */
  caminho?: boolean;
  /** tipo de controle libretro (PS1: 517 = DualShock) */
  dispositivo?: number;
  /** desenha com OpenGL (N64): WebGL2 num OffscreenCanvas dentro do Worker */
  gl?: boolean;
  /** só roda no núcleo nativo (PS2: não existe em WebAssembly que aguente) */
  soNativo?: boolean;
}

/** Sistemas que rodam no app novo (M2 + M11; o PS2 no núcleo nativo, M12/N.9). */
export const NUCLEOS: Partial<Record<SistemaId, ConfigNucleo>> = {
  snes: { nucleo: 'snes9x', largura: 256, altura: 224, ext: 'sfc' },
  gb: { nucleo: 'gambatte', largura: 160, altura: 144, ext: 'gb' },
  nes: { nucleo: 'fceumm', largura: 256, altura: 224, tv43: true, opcoes: { fceumm_sndquality: 'High' }, ext: 'nes' },
  md: { nucleo: 'genplus', largura: 320, altura: 224, dinamico: true, tv43: true, ext: 'md' },
  sms: { nucleo: 'genplus', largura: 256, altura: 192, dinamico: true, tv43: true, ext: 'sms' },
  gba: { nucleo: 'mgba', largura: 240, altura: 160, ext: 'gba' },
  gg: { nucleo: 'genplus', largura: 160, altura: 144, dinamico: true, proporcao: 10 / 9, ext: 'gg' },
  // Neo Geo (FBNeo só com o Neo Geo): o zip inteiro do fliperama vai pro /jogos com o zip do pai (clones) e a BIOS
  // neogeo.zip em /sistema. Modo AES (o console de casa: sem ficha) por padrão
  neogeo: {
    nucleo: 'fbneo',
    largura: 320,
    altura: 224,
    dinamico: true,
    tv43: true,
    caminho: true,
    opcoes: { 'fbneo-neogeo-mode': 'AES_EUR' },
    ext: 'zip',
  },
  // PlayStation (PCSX-ReARMed): o CD fica no /jogos enquanto o jogo roda (o núcleo lê aos poucos). BIOS opcional.
  // Atrasou (jogo 3D): pula o desenho de até 3 quadros em vez de picotar o som
  ps1: {
    nucleo: 'pcsx',
    largura: 320,
    altura: 240,
    dinamico: true,
    tv43: true,
    caminho: true,
    dispositivo: 517,
    semRebob: true,
    opcoes: { pcsx_rearmed_frameskip_type: 'auto', pcsx_rearmed_frameskip_interval: '3' },
    ext: 'cue',
  },
  // Nintendo 64 (Mupen64Plus-Next): GLideN64 em WebGL2; a ponte lê a imagem de volta. Estado grande: sem rebobinar
  n64: {
    nucleo: 'mupen64',
    largura: 320,
    altura: 240,
    dinamico: true,
    tv43: true,
    semRebob: true,
    gl: true,
    opcoes: {
      'mupen64plus-rdp-plugin': 'gliden64',
      'mupen64plus-cpucore': 'cached_interpreter',
      'mupen64plus-43screensize': '320x240',
      'mupen64plus-EnableNativeResFactor': '1',
      'mupen64plus-ThreadedRenderer': 'False',
      'mupen64plus-pak1': 'memory',
    },
    ext: 'z64',
  },
  // PlayStation 2 (LRPS2, o PCSX2 do libretro): só nativo, desenhando pela placa (OpenGL sem janela no processo do
  // jogo). O DVD é lido direto do disco pelo núcleo. Opções como o antigo: renderer OpenGL e o "EE cycle skip" leve,
  // que deixou o Shadow of the Colossus em 60 no Ryzen 5 4600H (a CPU do PS2 é o gargalo em PC modesto)
  ps2: {
    nucleo: 'pcsx2',
    largura: 640,
    altura: 448,
    dinamico: true,
    tv43: true,
    caminho: true,
    semRebob: true,
    soNativo: true,
    opcoes: { pcsx2_renderer: 'OpenGL', pcsx2_ee_cycle_skip: 'Mild Underclock', pcsx2_bios: 'bios-ps2.bin' },
    ext: 'iso',
  },
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

// N64 (controle do SNES): B/Y = A/B, L = Z, R = R, Select = L; X/A = C▲/C▼ e L2/R2 = C◀/C▶ (bits 16-19 da ponte, que
// viram o analógico direito); o direcional vira o analógico na ponte
const BITS_N64: readonly (readonly [number, number])[] = [
  [0x8000, 0],
  [0x4000, 1],
  [0x1000, 3],
  [0x0800, 4],
  [0x0400, 5],
  [0x0200, 6],
  [0x0100, 7],
  [0x0020, 12],
  [0x0010, 11],
  [0x2000, 10],
  [0x0040, 16],
  [0x0080, 17],
  [0x0008, 18],
  [0x0004, 19],
];

/** O `mascaraN64()` do antigo. */
export function mascaraN64(bits: number): number {
  let m = 0;
  for (const [bit, id] of BITS_N64) if (bits & bit) m |= 1 << id;
  return m;
}

/** O `mascara()` do antigo. */
export function mascaraLibretro(bits: number): number {
  let m = 0;
  for (const [bit, id] of LIGACAO) if (bits & bit) m |= 1 << id;
  return m;
}
