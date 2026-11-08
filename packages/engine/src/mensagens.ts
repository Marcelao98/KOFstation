// Mensagens entre a página (Jogo) e o Worker do núcleo.
import type { SistemaId } from '@kof/domain';
import type { ExtrasDoJogo, InfoDoJogo } from './libretro';

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
      /** BIOS e os outros arquivos do jogo (Neo Geo, PS1) */
      extras?: ExtrasDoJogo;
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
  /** caçador de bugs: marco a cada 10 s + botões de cada quadro */
  | { tipo: 'cacador'; ligado: boolean }
  | { tipo: 'som'; tocando: boolean }
  | { tipo: 'reiniciar' }
  | { tipo: 'parar' };

/** Pedidos que esperam resposta (o Worker responde com o mesmo id). */
export type Pedido = 'estado-salvar' | 'estado-carregar' | 'sram-ler' | 'bug-pacote';

/** O que o caçador de bugs guardou (resposta do pedido 'bug-pacote', em JSON): o marco de segundos antes, os botões
 *  de cada quadro desde ele e o estado e a assinatura da imagem de agora. */
export interface ReplayDoBug {
  /** savestate do marco (base64); null = caçador desligado */
  estado: string | null;
  /** botões do jogador 1 em cada quadro (Uint16 little-endian, base64) */
  entradas: string;
  quadros: number;
  agora: { estado: string; assinatura: string };
}

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
  /** núcleo nativo que desenha na placa (PS2): ms lendo a imagem da placa por quadro */
  leituraMs?: number;
  /** núcleo nativo: ms preparando o quadro pra página */
  imagemMs?: number;
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

// ---------- jukebox: o Worker do tocador (uma instância separada do núcleo, só som) ----------

export interface FaixaNoWorker {
  sistema: SistemaId;
  rom?: Uint8Array | null;
  estado?: Uint8Array | null;
  spc?: Uint8Array | null;
  /** trilha do KOFstation (comandos FM/PSG): toca no núcleo só de som */
  fm?: Uint8Array | null;
  /** o 8 bits (reserva quando faltam o violino e o núcleo FM): toca sem núcleo */
  oito?: import('./oitobits').DadosOitoBits | null;
  /** BIOS e os arquivos do jogo (Neo Geo) */
  extras?: ExtrasDoJogo;
}

export type ParaTocador =
  | {
      tipo: 'iniciar';
      faixa: FaixaNoWorker;
      urlNucleo: string;
      /** null = só gerar o .wav (sem tocar) */
      sab: SharedArrayBuffer | null;
      taxaSaida: number;
      segundos: number;
      fadeMs: number;
      repetir: boolean;
      mudas: number;
    }
  | { tipo: 'mudas'; m: number }
  | { tipo: 'config'; segundos: number; fadeMs: number; repetir: boolean }
  | { tipo: 'tocar'; sim: boolean }
  | { tipo: 'wav'; segundos: number; fadeMs: number }
  | { tipo: 'parar' };

export type DoTocador =
  | {
      tipo: 'pronto';
      canais: number;
      nomes: string[];
      papeis: string[];
      escalas: number[];
      taxa: number;
      taxaOnda: number;
      temOndas: boolean;
    }
  /** ~30 por segundo: a onda de cada canal (a mais nova no fim), o nível de cada um e o tempo */
  | { tipo: 'ondas'; amostras: number; filaMs: number; ondas: Int16Array; niveis: Float32Array }
  /** acabou o tempo da faixa (com o fade): a página passa pra próxima */
  | { tipo: 'fim' }
  | { tipo: 'wav'; bytes: Uint8Array }
  | { tipo: 'erro'; mensagem: string };
