// Tipos do KofMolduras (o web/molduras.js do antigo, copiado sem mudança em kofmolduras.js).
export interface CoresDoTema {
  fundo: string;
  painel: string;
  destaque: string;
  texto: string;
  borda: string;
}
export interface Moldura {
  id: string;
  nome: string;
  cat: string;
  desc: string;
  /** bordas em frações da altura da tela: cima, direita, baixo, esquerda */
  b: [number, number, number, number];
  /** raio dos cantos da tela (fração da altura) */
  raio: number;
  d(W: number, H: number, S: { x: number; y: number; w: number; h: number }, anim: boolean, t: CoresDoTema): string;
}
export interface KofMoldurasApi {
  LISTA: Moldura[];
  PADRAO_SIS: Record<string, string>;
}
export const KofMolduras: KofMoldurasApi;
