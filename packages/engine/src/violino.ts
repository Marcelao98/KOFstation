// O Air de Bach em violino de verdade (The USAF Strings, domínio público): Opus em base64 no `violino.js` (vem pelo
// manifesto, como os núcleos), decodificado pelo navegador e tocado em laço. Mesma cara do Tocador da jukebox, com 2
// canais (esquerda e direita) no modo Ondas (o `tocadorViolino` do antigo).
import { TAM_ONDA } from './musica';
import type { InfoDaFaixa, OndasAoVivo } from './tocador';

let decodificado: Promise<AudioBuffer> | null = null;

/** Baixa e decodifica o violino uma vez só. */
function carregar(base: URL): Promise<AudioBuffer> {
  decodificado ??= (async () => {
    const r = await fetch(new URL('violino.js', base));
    if (!r.ok) throw new Error('faltou baixar o violino');
    const t = await r.text();
    const b64 = /'([A-Za-z0-9+/=]+)'/.exec(t)?.[1];
    if (!b64) throw new Error('violino vazio');
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new OfflineAudioContext(2, 1, 48000).decodeAudioData(u8.buffer);
  })().catch((e: unknown) => {
    decodificado = null;
    throw e;
  });
  return decodificado;
}

export class TocadorViolino {
  info: InfoDaFaixa = {
    canais: 2,
    nomes: ['Esquerda', 'Direita'],
    papeis: ['violino', 'violino'],
    escalas: [1 / 16000, 1 / 16000],
    taxa: 48000,
    taxaOnda: 48000,
    temOndas: true,
  };
  aoAcabar: (() => void) | null = null;
  aoErrar: ((m: string) => void) | null = null;
  private ctx = new AudioContext({ latencyHint: 'playback' });
  private fonte: AudioBufferSourceNode;
  private lados: GainNode[];
  private analisadores: AnalyserNode[];
  private ganho: GainNode;
  private inicio = 0;
  private tocando = false;
  private pausadoEm = 0;
  private buf = new Float32Array(TAM_ONDA);
  private cfg = { segundos: 0, fadeMs: 4000, repetir: true };
  private volumeAtual = 1;
  private mudoAtual = false;
  private acabou = false;
  private relogio = setInterval(() => this.vigiar(), 100);

  private constructor(private audio: AudioBuffer) {
    const ctx = this.ctx;
    this.fonte = ctx.createBufferSource();
    this.fonte.buffer = audio;
    this.fonte.loop = true; // acabou: volta pro começo
    const sep = ctx.createChannelSplitter(2);
    const junta = ctx.createChannelMerger(2);
    this.ganho = ctx.createGain();
    this.lados = [0, 1].map((c) => {
      const g = ctx.createGain();
      sep.connect(g, c);
      g.connect(junta, 0, c);
      return g;
    });
    this.analisadores = [0, 1].map((c) => {
      const a = ctx.createAnalyser();
      a.fftSize = TAM_ONDA;
      sep.connect(a, c);
      return a;
    });
    this.fonte.connect(sep);
    junta.connect(this.ganho).connect(ctx.destination);
    this.info.taxa = audio.sampleRate;
    this.info.taxaOnda = audio.sampleRate;
  }

  static async abrir(base: URL, volume: number, mudo: boolean): Promise<TocadorViolino> {
    const t = new TocadorViolino(await carregar(base));
    t.volume(volume, mudo);
    t.fonte.start();
    t.inicio = t.ctx.currentTime;
    void t.ctx.suspend();
    return t;
  }

  get ultimo(): OndasAoVivo {
    const ondas = new Int16Array(2 * TAM_ONDA);
    const niveis = new Float32Array(2);
    this.analisadores.forEach((a, c) => {
      a.getFloatTimeDomainData(this.buf);
      let pico = 0;
      for (let k = 0; k < TAM_ONDA; k++) {
        const x = this.buf[k] ?? 0;
        ondas[c * TAM_ONDA + k] = Math.round(x * 16000);
        pico = Math.max(pico, Math.abs(x));
      }
      niveis[c] = this.tocando ? pico : 0;
    });
    const seg = (this.tocando ? this.ctx.currentTime : this.pausadoEm) - this.inicio;
    return { amostras: Math.round(seg * this.audio.sampleRate), ondas, niveis, ouvido: seg % this.audio.duration };
  }

  tocar(sim: boolean) {
    this.tocando = sim;
    if (!sim) this.pausadoEm = this.ctx.currentTime;
    void (sim ? this.ctx.resume() : this.ctx.suspend()).catch(() => undefined);
  }

  mudas(m: number) {
    this.lados.forEach((g, c) => (g.gain.value = m & (1 << c) ? 0 : 1));
  }

  /** Tempo e fade da faixa (na jukebox); `repetir` ou o Início = laço sem fim. */
  configurar(segundos: number, fadeMs: number, repetir: boolean) {
    this.cfg = { segundos, fadeMs, repetir };
    this.acabou = false;
  }

  private vigiar() {
    if (!this.tocando) return;
    const t = this.ctx.currentTime - this.inicio;
    const { segundos, fadeMs, repetir } = this.cfg;
    const k = repetir || !segundos || t <= segundos ? 1 : Math.max(0, 1 - ((t - segundos) * 1000) / fadeMs);
    this.ganho.gain.value = this.mudoAtual ? 0 : this.volumeAtual * k;
    if (k === 0 && !this.acabou) {
      this.acabou = true;
      this.aoAcabar?.();
    }
  }

  volume(volume: number, mudo: boolean) {
    this.volumeAtual = volume;
    this.mudoAtual = mudo;
    this.ganho.gain.value = mudo ? 0 : volume;
  }

  fechar() {
    clearInterval(this.relogio);
    try {
      this.fonte.stop();
    } catch {
      // já parado
    }
    void this.ctx.close().catch(() => undefined);
  }
}
