// Fila de quadros apresentada um por vsync. Quem produz os quadros (Worker do wasm, processo nativo) acorda por timer
// e o som dita o ritmo dele, então os quadros chegam em rajadas (0, 2, 1...); mostrar "o último que chegou" a cada
// vsync repete um quadro e pula outro. Aqui eles esperam na fila e saem um por vsync (`tirar`), com 1 quadro de folga
// pra aguentar o atraso do timer. Sem React e sem DOM: quem chama passa o relógio (`performance.now()`).

/** Quadros na fila acima disso: os mais velhos saem (a página não acompanhou; mostrar atrasado é pior que pular). */
export const MAX_NA_FILA = 3;
/** Um quadro sozinho na fila espera o próximo por até isso (2 vsyncs); depois sai (pausa, estado carregado, 30 fps). */
export const ESPERA_DA_FOLGA_MS = 34;

export interface QuadroNaFila {
  pixels: Uint32Array;
  largura: number;
  altura: number;
  /** quando chegou (ms, o mesmo relógio do `tirar`) */
  chegou: number;
}

export class FilaDeQuadros {
  private fila: QuadroNaFila[] = [];
  /** quadros que ficaram pra trás (a página engasgou ou o turbo está ligado) e foram jogados fora */
  descartados = 0;

  get tamanho(): number {
    return this.fila.length;
  }

  empurrar(q: QuadroNaFila): void {
    this.fila.push(q);
  }

  /** A cada vsync: o quadro a mostrar agora, ou null (fila vazia, ou esperando o próximo pra ter folga). */
  tirar(agora: number): QuadroNaFila | null {
    const f = this.fila;
    while (f.length > MAX_NA_FILA) {
      f.shift();
      this.descartados++;
    }
    const primeiro = f[0];
    if (!primeiro) return null;
    if (f.length < 2 && agora - primeiro.chegou < ESPERA_DA_FOLGA_MS) return null;
    f.shift();
    return primeiro;
  }

  limpar(): void {
    this.fila.length = 0;
  }
}
