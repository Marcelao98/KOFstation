// Mensagens entre a página (Jogo) e o Worker do núcleo.
import type { SistemaId } from '@kof/domain';
import type { InfoDoJogo } from './libretro';

export type ParaWorker =
  | {
      tipo: 'iniciar';
      sistema: SistemaId;
      rom: Uint8Array;
      urlNucleo: string;
      sab: SharedArrayBuffer | null;
      taxaSaida: number;
    }
  | { tipo: 'pad'; jogador: number; bits: number }
  | { tipo: 'pausar'; sim: boolean }
  | { tipo: 'turbo'; sim: boolean }
  | { tipo: 'som'; tocando: boolean }
  | { tipo: 'reiniciar' }
  | { tipo: 'parar' };

export interface Medicao {
  fps: number;
  /** ms de núcleo por quadro */
  nucleoMs: number;
  /** quadros que atrasaram (o relógio pediu mais de um de uma vez) */
  atrasos: number;
  /** amostras de som que faltaram (picote) */
  faltasDeSom: number;
  /** som esperando no anel, em ms */
  somNaFilaMs: number;
}

export type DoWorker =
  | { tipo: 'pronto'; info: InfoDoJogo }
  | { tipo: 'quadro'; pixels: ArrayBuffer; largura: number; altura: number }
  | { tipo: 'medicao'; m: Medicao }
  | { tipo: 'erro'; mensagem: string; log: string[] };
