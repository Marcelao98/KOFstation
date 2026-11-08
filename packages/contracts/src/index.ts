// Contratos com o backend (docs/API_CONTRACTS.md). Os mesmos exemplos de packages/contracts/fixtures/ são testados aqui
// e no Rust (crates/kof-core), pra garantir que os dois lados falam a mesma coisa.

export const CONTRACT_VERSION = 1;

export interface ContractError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type Resposta<T> = { id: number; ok: true; data: T } | { id: number; ok: false; error: ContractError };

export interface AppInfo {
  version: string;
  contractVersion: number;
  os: 'linux' | 'windows' | 'macos' | 'android' | 'other';
  arch: string;
  dataDir: string;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Confere a forma de um erro vindo do backend (dado de fora: não confiar no tipo). */
export function ehContractError(v: unknown): v is ContractError {
  return (
    ehObjeto(v) &&
    typeof v.code === 'string' &&
    /^[A-Z][A-Z0-9_]*$/.test(v.code) &&
    typeof v.message === 'string' &&
    (v.details === undefined || ehObjeto(v.details))
  );
}

/** Confere a forma do `app.info`. */
export function ehAppInfo(v: unknown): v is AppInfo {
  return (
    ehObjeto(v) &&
    typeof v.version === 'string' &&
    typeof v.contractVersion === 'number' &&
    ['linux', 'windows', 'macos', 'android', 'other'].includes(v.os as string) &&
    typeof v.arch === 'string' &&
    typeof v.dataDir === 'string'
  );
}
export * from './nativo';
