// A porta Backend: o que o app-core precisa do backend, sem saber se é Tauri, WebSocket local, Android ou teste.
// Cada plataforma implementa isso em apps/desktop/src/platform/.
import { ehContractError, type ContractError } from '@kof/contracts';

export interface Backend {
  /** Chama um comando do contrato. Resolve com `data` ou rejeita com `BackendError`. */
  chamar<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  /** Comando que devolve bytes (arquivo, save, estado). */
  lerBinario(cmd: string, args?: Record<string, unknown>): Promise<Uint8Array>;
  /** Comando que leva bytes junto (gravar save, estado, arquivo). */
  enviarBinario<T>(cmd: string, args: Record<string, unknown>, dados: Uint8Array): Promise<T>;
  /**
   * Igual ao `enviarBinario`, mas com um pedaço de arquivo (`Blob`): o navegador manda direto do disco, sem passar pela
   * memória do JavaScript (CD de centenas de MB). Opcional: quem não tem cai no `enviarBinario`.
   */
  enviarArquivo?<T>(cmd: string, args: Record<string, unknown>, dados: Blob): Promise<T>;
  /** O caminho até o serviço de rede entre aparelhos (M13). Opcional: plataforma sem rede não tem. */
  rede?(): Promise<import('./rede').CanalRede>;
}

/** Erro do backend com o código do contrato (nunca um erro genérico). */
export class BackendError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  constructor(e: ContractError) {
    super(e.message);
    this.name = 'BackendError';
    this.code = e.code;
    this.details = e.details;
  }
}

/** Códigos que o próprio app gera quando a comunicação falha (não vêm do Rust). */
export const ERRO_COMUNICACAO = 'BACKEND_UNREACHABLE';
export const ERRO_RESPOSTA_INVALIDA = 'BACKEND_BAD_RESPONSE';

/** Transforma o que veio do outro lado num BackendError, sem esconder a causa. */
export function paraBackendError(v: unknown): BackendError {
  if (v instanceof BackendError) return v;
  if (ehContractError(v)) return new BackendError(v);
  return new BackendError({
    code: ERRO_COMUNICACAO,
    message: v instanceof Error ? v.message : String(v),
  });
}
