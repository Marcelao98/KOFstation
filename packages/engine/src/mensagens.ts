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
  | { tipo: 'opcoes'; opcoes: Record<string, string> }
  /** regras do rebobinar do modo de jogo (desligado: ligado=false) */
  | { tipo: 'rebob-config'; ligado: boolean; limite: number; recargaX: number }
  /** segurando o botão de voltar no tempo */
  | { tipo: 'rebobinar'; sim: boolean }
  /** recomeçou (estado carregado, outro modo): o rebobinar zera */
  | { tipo: 'rebob-zerar' }
  | { tipo: 'pedido'; id: number; pedido: Pedido; bytes?: Uint8Array }
  | { tipo: 'pad'; jogador: number; bits: number }
  /** analógicos (-32767..32767: esquerdo x, y, direito x, y) */
  | { tipo: 'eixos'; jogador: number; e: number[] }
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
  | { tipo: 'resposta'; id: number; ok: boolean; bytes?: Uint8Array; erro?: string }
  | { tipo: 'rebob'; r: SituacaoRebob };

/** Como está o rebobinar (pra ampulheta e o preto e branco). */
export interface SituacaoRebob {
  ligado: boolean;
  /** voltando agora */
  rebobinando: boolean;
  /** segundos guardados (fotos / 30) */
  segundos: number;
  limite: number;
  /** quadros de jogo que faltam pra recarregar (0 = pronto) */
  recarga: number;
  recargaTotal: number;
}
