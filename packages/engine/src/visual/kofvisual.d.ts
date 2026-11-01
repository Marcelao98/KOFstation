// Tipos do KofVisual (o web/visual.js do antigo, copiado sem mudança em kofvisual.js).

/** [id, grupo, nome, mínimo, máximo, passo, padrão, opções?] */
export type Ajuste = [string, string, string, number, number, number, number, string[]?];
/** [id, nome, descrição, valores] */
export type Predefinicao = [string, string, string, Record<string, number>];
export type Valores = Record<string, number>;

export interface Passo {
  id: string;
  w: number;
  h: number;
  q: number[];
}

export interface KofVisualApi {
  AJUSTES: Ajuste[];
  PADRAO: Valores;
  PREDEF: Predefinicao[];
  ANTIGO: Record<string, string>;
  FRAG: string;
  NP: number;
  /** [nome, ids das predefinições] */
  CATEGORIAS: [string, string[]][];
  GRUPOS: Record<string, [string, string]>;
  PASSOS: Record<string, string>;
  fonte(v: Valores, op?: { passos?: boolean }): string;
  chave(v: Valores): string;
  valores(pre: string): Valores;
  vetor(v: Valores, n?: number): Float32Array;
  animado(v: Valores): boolean;
  passos(v: Valores, L: number, A: number): Passo[];
  custo(v: Valores): 'leve' | 'médio' | 'pesado';
}

export const KofVisual: KofVisualApi;
