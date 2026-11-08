// Protocolo da WebSocket do núcleo nativo (crates/kof-nativo/src/protocolo.rs; docs/API_CONTRACTS.md, "Núcleo
// nativo"). Mesmas fixtures do Rust (fixtures/nativo.json). Números em little-endian, cabeçalho de 12 bytes.

export const NATIVO = {
  QUADRO: 1,
  BOTOES: 2,
  ESTADO: 3,
  CARREGAR_ESTADO: 4,
  BATERIA: 5,
  GRAVAR_BATERIA: 6,
  CABECALHO: 12,
} as const;

export type ComandoNativo =
  | { cmd: 'pausar' | 'continuar' | 'reiniciar' | 'fechar' }
  | { cmd: 'volume'; valor: number }
  | { cmd: 'turbo'; fator: number }
  | { cmd: 'variavel'; chave: string; valor: string }
  | { cmd: 'salvarEstado' | 'lerBateria'; pedido: number };

export type AvisoNativo =
  | {
      tipo: 'pronto';
      nucleo: string;
      versao: string;
      largura: number;
      altura: number;
      proporcao: number;
      fps: number;
      taxa: number;
      /** taxa da placa de som (0 = sem placa) */
      taxaSaida: number;
      /** placa de vídeo e driver (GL_RENDERER · GL_VENDOR · GL_VERSION), quando o núcleo desenha nela */
      placa?: string;
    }
  | { tipo: 'geometria'; largura: number; altura: number; proporcao: number }
  | {
      tipo: 'desempenho';
      quadros: number;
      amostras: number;
      atrasoMs: number;
      faltas: number;
      /** ms por quadro no último segundo: o núcleo (com a leitura da placa), a leitura da placa, o quadro pra página */
      nucleoMs?: number;
      leituraMs?: number;
      imagemMs?: number;
      /** cada quadro do último segundo (M16): 6 números por quadro, em µs, [t, núcleo, leitura, envio, som na fila,
       *  faltas] (o formato do domain/desempenho.ts) */
      porQuadro?: number[];
      /** % de um núcleo do processador que cada linha (thread) do processo usou no último segundo */
      cpu?: { linha: string; pct: number }[];
    }
  | { tipo: 'ok'; pedido: number }
  | { tipo: 'erro'; pedido: number | null; codigo: string; mensagem: string }
  | { tipo: 'fim'; motivo: string };

export interface QuadroNativo {
  largura: number;
  altura: number;
  numero: number;
  /** RGBA, sem cópia (aponta pra dentro da mensagem) */
  rgba: Uint8Array;
}

export type BinarioNativo =
  ({ tipo: 'quadro' } & QuadroNativo) | { tipo: 'estado' | 'bateria'; pedido: number; dados: Uint8Array };

const TIPOS_AVISO = ['pronto', 'geometria', 'desempenho', 'ok', 'erro', 'fim'];

/** Confere um aviso vindo do processo (dado de fora: só a forma básica). */
export function lerAviso(texto: string): AvisoNativo | null {
  let v: unknown;
  try {
    v = JSON.parse(texto);
  } catch {
    return null; // texto que não é JSON: não é aviso (quem chama trata como erro de protocolo)
  }
  if (typeof v !== 'object' || v === null) return null;
  const t = (v as { tipo?: unknown }).tipo;
  return typeof t === 'string' && TIPOS_AVISO.includes(t) ? (v as AvisoNativo) : null;
}

/** Entende uma mensagem binária do processo. Erro = mensagem fora do protocolo. */
export function lerBinario(b: ArrayBuffer | Uint8Array): BinarioNativo {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  if (u.length < NATIVO.CABECALHO) throw new Error(`mensagem curta demais (${u.length} bytes)`);
  const d = new DataView(u.buffer, u.byteOffset, u.byteLength);
  const tipo = u[0];
  if (tipo === NATIVO.QUADRO) {
    const largura = d.getUint16(4, true);
    const altura = d.getUint16(6, true);
    const rgba = u.subarray(NATIVO.CABECALHO);
    if (rgba.length !== largura * altura * 4) throw new Error(`quadro ${largura}x${altura} com ${rgba.length} bytes`);
    return { tipo: 'quadro', largura, altura, numero: d.getUint32(8, true), rgba };
  }
  if (tipo === NATIVO.ESTADO || tipo === NATIVO.BATERIA) {
    const n = d.getUint32(8, true);
    if (u.length < NATIVO.CABECALHO + n) throw new Error(`faltam bytes: diz ${n}, veio ${u.length - NATIVO.CABECALHO}`);
    return {
      tipo: tipo === NATIVO.ESTADO ? 'estado' : 'bateria',
      pedido: d.getUint32(4, true),
      dados: u.subarray(NATIVO.CABECALHO, NATIVO.CABECALHO + n),
    };
  }
  throw new Error(`tipo de mensagem desconhecido: ${tipo}`);
}

/** Botões (máscara do libretro) e eixos (-32768..32767) de um jogador. */
export function botoesNativo(jogador: number, botoes: number, eixos: readonly number[]): Uint8Array {
  const u = new Uint8Array(NATIVO.CABECALHO);
  const d = new DataView(u.buffer);
  u[0] = NATIVO.BOTOES;
  u[1] = jogador;
  d.setUint16(2, botoes & 0xffff, true);
  for (let i = 0; i < 4; i++) d.setInt16(4 + i * 2, Math.max(-32768, Math.min(32767, Math.round(eixos[i] ?? 0))), true);
  return u;
}

/** `CARREGAR_ESTADO` ou `GRAVAR_BATERIA`. */
export function blocoNativo(tipo: 4 | 6, pedido: number, dados: Uint8Array): Uint8Array {
  const u = new Uint8Array(NATIVO.CABECALHO + dados.length);
  const d = new DataView(u.buffer);
  u[0] = tipo;
  d.setUint32(4, pedido, true);
  d.setUint32(8, dados.length, true);
  u.set(dados, NATIVO.CABECALHO);
  return u;
}
