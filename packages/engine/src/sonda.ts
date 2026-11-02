// Os canais do chip de som de cada sistema, como a jukebox mostra (o `canais/papeis/indices/escalas` do SISTEMAS do
// web/nucleo.js do antigo). A sonda dos núcleos remendados (nucleo-libretro/*-sonda.patch) entrega a onda de cada canal
// num anel de 4096 amostras; `escala` deixa a amplitude máxima do canal em 1.
import type { SistemaId } from '@kof/domain';

export interface CanaisDoSistema {
  nomes: readonly string[];
  papeis: readonly string[];
  /** canal da sonda de cada canal mostrado (Master System/Game Gear: só o PSG, 6 a 9) */
  indices?: readonly number[];
  escalas?: readonly number[];
}

const PSG = {
  nomes: ['PSG 1', 'PSG 2', 'PSG 3', 'Ruído'],
  papeis: ['quadrada', 'quadrada', 'quadrada', 'LFSR'],
  indices: [6, 7, 8, 9],
  escalas: [1 / 2100, 1 / 2100, 1 / 2100, 1 / 2100],
} as const;

export const CANAIS: Partial<Record<SistemaId, CanaisDoSistema>> = {
  snes: { nomes: ['Voz 1', 'Voz 2', 'Voz 3', 'Voz 4', 'Voz 5', 'Voz 6', 'Voz 7', 'Voz 8'], papeis: [] },
  gb: {
    nomes: ['Pulso 1', 'Pulso 2', 'Onda', 'Ruído'],
    papeis: ['quadrada + sweep', 'quadrada', 'tabela 4 bits', 'LFSR'],
  },
  nes: {
    nomes: ['Pulso 1', 'Pulso 2', 'Triângulo', 'Ruído', 'DPCM'],
    papeis: ['quadrada', 'quadrada', 'triângulo 4 bits', 'LFSR', 'amostras'],
    escalas: [1 / 1920, 1 / 1920, 1 / 22.5, 1 / 15, 1 / 63.5],
  },
  md: {
    nomes: ['FM 1', 'FM 2', 'FM 3', 'FM 4', 'FM 5', 'FM 6', 'PSG 1', 'PSG 2', 'PSG 3', 'Ruído'],
    papeis: ['FM', 'FM', 'FM', 'FM', 'FM', 'FM / amostras', 'quadrada', 'quadrada', 'quadrada', 'LFSR'],
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    escalas: [1 / 8192, 1 / 8192, 1 / 8192, 1 / 8192, 1 / 8192, 1 / 8192, 1 / 2100, 1 / 2100, 1 / 2100, 1 / 2100],
  },
  sms: PSG,
  gg: PSG,
  gba: {
    nomes: ['Pulso 1', 'Pulso 2', 'Onda', 'Ruído', 'Direct A', 'Direct B'],
    papeis: ['quadrada + sweep', 'quadrada', 'tabela 4 bits', 'LFSR', 'amostras PCM', 'amostras PCM'],
    escalas: [1 / 16, 1 / 16, 1 / 16, 1 / 16, 1 / 128, 1 / 128],
  },
  neogeo: {
    nomes: [
      'FM 1',
      'FM 2',
      'FM 3',
      'FM 4',
      'SSG 1',
      'SSG 2',
      'SSG 3',
      'ADPCM-A 1',
      'ADPCM-A 2',
      'ADPCM-A 3',
      'ADPCM-A 4',
      'ADPCM-A 5',
      'ADPCM-A 6',
      'ADPCM-B',
    ],
    papeis: [
      'FM',
      'FM',
      'FM',
      'FM',
      'quadrada',
      'quadrada',
      'quadrada',
      'amostras',
      'amostras',
      'amostras',
      'amostras',
      'amostras',
      'amostras',
      'amostras',
    ],
    escalas: [
      1 / 8192,
      1 / 8192,
      1 / 8192,
      1 / 8192,
      1 / 8192,
      1 / 8192,
      1 / 8192,
      1 / 4096,
      1 / 4096,
      1 / 4096,
      1 / 4096,
      1 / 4096,
      1 / 4096,
      1 / 8192,
    ],
  },
};

/** Taxa da onda da sonda: o FCEUmm/Gambatte gravam ~32 kHz; o Genesis Plus GX, ~26,6 kHz (metade do chip FM). */
export function taxaDaOnda(nucleo: string): number {
  if (nucleo === 'genplus') return 26633;
  if (nucleo === 'fceumm') return 1789773 / 56;
  if (nucleo === 'fbneo') return 8000000 / 144;
  return 32768;
}

/** Sistemas que guardam música (o antigo: PS1, N64 e PS2 não). */
export const temMusica = (s: SistemaId): boolean => !!CANAIS[s];
