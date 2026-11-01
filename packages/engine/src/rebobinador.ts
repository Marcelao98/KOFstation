// Rebobinar (web/nucleo.js `Rebobinador` do antigo, linha por linha): guarda o estado mais recente inteiro e, de cada
// foto, só os pedaços de 16 KB (4096 palavras) que mudaram (o valor antigo). A foto nova é comparada direto na memória
// do núcleo (estadoVivo), sem copiar o estado inteiro — no antigo isso tirou ~50 MB/s de lixo no Snes9x.

export interface FonteDeEstado {
  estadoVivo(): Int32Array | null;
  carregarEstado(e: Uint8Array): void;
  readonly tamEstado: number;
}

const PEDACO = 4096;

export class Rebobinador {
  private cabeca: Int32Array | null = null;
  private fotos: { pedacos: (number | Int32Array)[]; tam: number }[] = [];
  private bytes = 0;

  constructor(
    private s: FonteDeEstado,
    private limiteBytes: number,
    private maxFotos: number,
  ) {}

  get quantas(): number {
    return this.fotos.length;
  }
  get ocupado(): number {
    return this.bytes;
  }

  gravar(): void {
    const w = this.s.estadoVivo();
    if (!w) return;
    if (!this.cabeca || this.cabeca.length !== w.length) {
      this.cabeca = w.slice();
      this.fotos = [];
      this.bytes = 0;
      return;
    }
    const h = this.cabeca;
    const pedacos: (number | Int32Array)[] = [];
    let tam = 0;
    for (let ini = 0; ini < w.length; ini += PEDACO) {
      const fim = Math.min(w.length, ini + PEDACO);
      let p = ini;
      while (p < fim && h[p] === w[p]) p++;
      if (p === fim) continue;
      pedacos.push(ini, h.slice(ini, fim));
      h.set(w.subarray(ini, fim), ini);
      tam += (fim - ini) * 4 + 16;
    }
    this.fotos.push({ pedacos, tam });
    this.bytes += tam;
    while ((this.bytes > this.limiteBytes || this.fotos.length > (this.maxFotos || Infinity)) && this.fotos.length > 1)
      this.bytes -= this.fotos.shift()?.tam ?? 0;
  }

  /** Volta uma foto; false = acabou (já carregou a mais velha). */
  voltar(): boolean {
    if (!this.cabeca) return false;
    const f = this.fotos.pop();
    if (f) {
      for (let j = 0; j < f.pedacos.length; j += 2)
        this.cabeca.set(f.pedacos[j + 1] as Int32Array, f.pedacos[j] as number);
      this.bytes -= f.tam;
    }
    this.s.carregarEstado(new Uint8Array(this.cabeca.buffer, 0, this.s.tamEstado));
    return !!f;
  }

  limpar(): void {
    this.cabeca = null;
    this.fotos = [];
    this.bytes = 0;
  }
}
