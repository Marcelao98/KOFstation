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
      /** save da bateria pra pôr antes do 1º quadro */
      sram?: Uint8Array | null;
      /** opções do núcleo (paleta do GB/NES...) */
      opcoes?: Record<string, string>;
    }
  | { tipo: 'sram-escrever'; bytes: Uint8Array }
  | { tipo: 'pedido'; id: number; pedido: Pedido; bytes?: Uint8Array }
  | { tipo: 'pad'; jogador: number; bits: number }
  | { tipo: 'pausar'; sim: boolean }
  | { tipo: 'turbo'; sim: boolean }
  | { tipo: 'som'; tocando: boolean }
  | { tipo: 'reiniciar' }
  | { tipo: 'parar' };

/** Pedidos que esperam resposta (o Worker responde com o mesmo id). */
export type Pedido = 'estado-salvar' | 'estado-carregar' | 'sram-ler';

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
  | { tipo: 'erro'; mensagem: string; log: string[] }
  /** a bateria mudou (conferido 1x por segundo) */
  | { tipo: 'sram'; bytes: Uint8Array }
  | { tipo: 'resposta'; id: number; ok: boolean; bytes?: Uint8Array; erro?: string };
