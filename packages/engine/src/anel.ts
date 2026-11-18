// Anel de som em memória compartilhada (SharedArrayBuffer): o Worker do núcleo escreve, o AudioWorklet lê.
// Cabeçalho Int32: [0] leitura, [1] escrita (em quadros estéreo), [2] faltas (amostras que o worklet não achou).
// Dados: Float32 estéreo intercalado. O worklet tem uma cópia desta lógica em texto (CODIGO_WORKLET).
export const CABECALHO = 4;

export interface Anel {
  ctl: Int32Array;
  dados: Float32Array;
  /** capacidade em quadros estéreo */
  cap: number;
}

export function criarAnel(cap: number, sab?: SharedArrayBuffer | ArrayBuffer): Anel {
  const buf = sab ?? new SharedArrayBuffer(CABECALHO * 4 + cap * 2 * 4);
  return { ctl: new Int32Array(buf, 0, CABECALHO), dados: new Float32Array(buf, CABECALHO * 4, cap * 2), cap };
}

/** Quantos quadros estéreo estão esperando pra tocar. */
export function ocupacao(a: Anel): number {
  const r = Atomics.load(a.ctl, 0);
  const w = Atomics.load(a.ctl, 1);
  return (w - r + a.cap) % a.cap;
}

/** Escreve quadros estéreo (intercalado). O que não couber é descartado (anel cheio = já tem som de sobra). */
export function escrever(a: Anel, estereo: Float32Array, n = estereo.length / 2): number {
  const livre = a.cap - 1 - ocupacao(a);
  const k = Math.min(livre, n);
  let w = Atomics.load(a.ctl, 1);
  for (let i = 0; i < k; i++) {
    a.dados[w * 2] = estereo[i * 2] ?? 0;
    a.dados[w * 2 + 1] = estereo[i * 2 + 1] ?? 0;
    w = (w + 1) % a.cap;
  }
  Atomics.store(a.ctl, 1, w);
  return k;
}

/** Lê pra dois canais (o que o worklet faz); faltou = silêncio e conta a falta. */
export function ler(a: Anel, esq: Float32Array, dir: Float32Array): void {
  let r = Atomics.load(a.ctl, 0);
  const w = Atomics.load(a.ctl, 1);
  let faltas = 0;
  for (let i = 0; i < esq.length; i++) {
    if (r === w) {
      esq[i] = 0;
      dir[i] = 0;
      faltas++;
    } else {
      esq[i] = a.dados[r * 2] ?? 0;
      dir[i] = a.dados[r * 2 + 1] ?? 0;
      r = (r + 1) % a.cap;
    }
  }
  Atomics.store(a.ctl, 0, r);
  if (faltas) Atomics.add(a.ctl, 2, faltas);
}

/** O processador do AudioWorklet (carregado por Blob, sem arquivo à parte). Mesma lógica do `ler` acima. */
export const CODIGO_WORKLET = `
class KofSom extends AudioWorkletProcessor {
  constructor(o) { super(); const s = o.processorOptions.sab; this.c = new Int32Array(s, 0, ${CABECALHO});
    this.d = new Float32Array(s, ${CABECALHO * 4}); this.cap = this.d.length / 2; this.tocando = false; }
  process(_, saidas) {
    const e = saidas[0][0], d = saidas[0][1] || e, N = this.cap; let r = Atomics.load(this.c, 0); const w = Atomics.load(this.c, 1);
    let f = 0;
    for (let i = 0; i < e.length; i++) {
      if (r === w) { e[i] = 0; d[i] = 0; f++; } else { e[i] = this.d[r * 2]; d[i] = this.d[r * 2 + 1]; r = (r + 1) % N; }
    }
    Atomics.store(this.c, 0, r);
    if (f && this.tocando) Atomics.add(this.c, 2, f);
    if (r !== w) this.tocando = true;
    return true;
  }
}
registerProcessor('kof-som', KofSom);
`;

/** Anel só do Worker (sem memória compartilhada): o som sai por mensagem, ver `drenar` e `CODIGO_WORKLET_PCM`. */
export function criarAnelLocal(cap: number): Anel {
  return criarAnel(cap, new ArrayBuffer(CABECALHO * 4 + cap * 2 * 4));
}

/** Tira tudo que está no anel e devolve como estéreo intercalado (vazio = null). Quem manda é o Worker, sem SharedArrayBuffer. */
export function drenar(a: Anel): Float32Array | null {
  const n = ocupacao(a);
  if (!n) return null;
  const esq = new Float32Array(n);
  const dir = new Float32Array(n);
  ler(a, esq, dir);
  const r = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    r[i * 2] = esq[i] ?? 0;
    r[i * 2 + 1] = dir[i] ?? 0;
  }
  return r;
}

/**
 * O AudioWorklet SEM memória compartilhada (WebView do Android, navegador sem isolamento): recebe pedaços de estéreo
 * intercalado por `port.postMessage` e toca na ordem. Fila com teto (~250 ms): passou disso, descarta o mais velho pra
 * não atrasar o som; secou, silêncio. Avisa a cada ~0,5 s quantas amostras tocou (`{ tocadas }`, pro teste e o F3).
 */
export const CODIGO_WORKLET_PCM = `
class KofSomPcm extends AudioWorkletProcessor {
  constructor() { super(); this.fila = []; this.pos = 0; this.total = 0; this.tocadas = 0; this.desde = 0;
    this.port.onmessage = (e) => { this.fila.push(e.data); this.total += e.data.length / 2; this.limitar(); }; }
  limitar() {
    const teto = sampleRate * 0.25;
    while (this.total - this.pos / 2 > teto && this.fila.length > 1) { this.total -= this.fila[0].length / 2; this.fila.shift(); this.pos = 0; }
  }
  process(_, saidas) {
    const e = saidas[0][0], d = saidas[0][1] || e;
    for (let i = 0; i < e.length; i++) {
      const c = this.fila[0];
      if (!c) { e[i] = 0; d[i] = 0; continue; }
      e[i] = c[this.pos]; d[i] = c[this.pos + 1]; this.pos += 2; this.tocadas++; this.total -= 1;
      if (this.pos >= c.length) { this.fila.shift(); this.pos = 0; }
    }
    this.desde += e.length;
    if (this.desde >= sampleRate / 2) { this.desde = 0; this.port.postMessage({ tocadas: this.tocadas }); }
    return true;
  }
}
registerProcessor('kof-som-pcm', KofSomPcm);
`;
