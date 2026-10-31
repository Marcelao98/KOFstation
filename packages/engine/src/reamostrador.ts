// Converte o som do núcleo (int16 estéreo na taxa dele: SNES 32040 Hz, NES 48000...) pra float estéreo na taxa da placa
// de som, por interpolação linear (o antigo também reamostrava). Guarda a fração entre um quadro e outro.
export class Reamostrador {
  private pos = 0;
  private antE = 0;
  private antD = 0;
  private saida = new Float32Array(8192);
  constructor(
    private entrada: number,
    private saidaHz: number,
  ) {}

  /** Devolve quadros estéreo intercalados (vista reaproveitada: use antes da próxima chamada). */
  converter(pcm: Int16Array): Float32Array {
    const n = pcm.length / 2;
    const passo = this.entrada / this.saidaHz;
    const max = Math.ceil((n + 1) / passo) + 2;
    if (this.saida.length < max * 2) this.saida = new Float32Array(max * 2);
    let k = 0;
    // pos é a posição na entrada contando o quadro anterior (índice -1 = antE/antD)
    while (this.pos < n - 1 + 1e-9) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const e0 = i < 0 ? this.antE : (pcm[i * 2] ?? 0) / 32768;
      const d0 = i < 0 ? this.antD : (pcm[i * 2 + 1] ?? 0) / 32768;
      const e1 = (pcm[(i + 1) * 2] ?? 0) / 32768;
      const d1 = (pcm[(i + 1) * 2 + 1] ?? 0) / 32768;
      this.saida[k * 2] = e0 + (e1 - e0) * f;
      this.saida[k * 2 + 1] = d0 + (d1 - d0) * f;
      k++;
      this.pos += passo;
    }
    if (n > 0) {
      this.antE = (pcm[(n - 1) * 2] ?? 0) / 32768;
      this.antD = (pcm[(n - 1) * 2 + 1] ?? 0) / 32768;
      this.pos -= n;
    }
    return this.saida.subarray(0, k * 2);
  }
}
