// Modos de jogo (app.js `MODOS`/`aplicarModo` do antigo): o que cada um deixa fazer. Puro e testável.

export type ModoId = 'alegria' | 'normal' | 'raiz' | 'hardcore';

export const MODOS: readonly [ModoId, string, string][] = [
  ['alegria', '😄 Só alegria', 'rebobina à vontade (até 30 s, sem esperar) e salva estados quando quiser'],
  ['normal', '🙂 Normal', 'rebobina um pouco (recarrega jogando) e salva estados'],
  ['raiz', '😤 Raiz', 'salva estados, mas sem rebobinar'],
  ['hardcore', '💀 Hardcore', 'sem estados, sem rebobinar e sem acelerar: como no console'],
];

/** Segundos de rebobinar no modo Normal (opção); padrão 5. */
export const REBOB_SEG = [3, 5, 10, 15, 30] as const;

export const modoValido = (m: string | null): ModoId => (MODOS.some(([k]) => k === m) ? (m as ModoId) : 'normal');
export const nomeModo = (m: ModoId): string => MODOS.find(([k]) => k === m)?.[1] ?? m;
export const rebobNormalDe = (v: string | null): number =>
  (REBOB_SEG as readonly number[]).includes(Number(v)) ? Number(v) : 5;

export interface RegrasDoModo {
  /** pode salvar/carregar estados */
  estados: boolean;
  /** rebobinar ligado */
  rebobinar: boolean;
  /** segundos que dá pra voltar */
  rebobLimite: number;
  /** jogar N× o limite recarrega (0 = sem recarga) */
  recargaX: number;
  /** pode acelerar (turbo) */
  turbo: boolean;
}

export function regrasDoModo(modo: ModoId, rebobNormal = 5): RegrasDoModo {
  return {
    estados: modo !== 'hardcore',
    rebobinar: modo === 'alegria' || modo === 'normal',
    rebobLimite: modo === 'alegria' ? 30 : rebobNormal,
    recargaX: modo === 'alegria' ? 0 : 6,
    turbo: modo !== 'hardcore',
  };
}
