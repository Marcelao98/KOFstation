// O tocador da jukebox, do lado da página: cria o Worker da música e o som (AudioWorklet próprio), e entrega as ondas
// pra tela desenhar. Uma faixa por vez; trocar de faixa = fechar este e abrir outro.
import { CODIGO_WORKLET, CODIGO_WORKLET_PCM } from './anel';
import type { DoTocador, FaixaNoWorker, ParaTocador } from './mensagens';
import { NUCLEOS } from './nucleos';

export interface InfoDaFaixa {
  canais: number;
  nomes: string[];
  papeis: string[];
  escalas: number[];
  taxa: number;
  taxaOnda: number;
  temOndas: boolean;
}

export interface OndasAoVivo {
  amostras: number;
  ondas: Int16Array;
  niveis: Float32Array;
  /** segundos que estão saindo no alto-falante agora (o que já foi gerado menos o que está na fila) */
  ouvido: number;
}

export interface OpcoesDoTocador {
  faixa: FaixaNoWorker;
  baseNucleos: URL;
  segundos: number;
  fadeMs: number;
  repetir: boolean;
  mudas: number;
  volume: number;
  mudo: boolean;
}

const urlDoNucleo = (f: FaixaNoWorker, base: URL) => {
  if (f.fm) return new URL('somfm.js', base).href;
  const c = NUCLEOS[f.sistema];
  if (!c) throw new Error(`essa versão do KOFstation não toca música de ${f.sistema}`);
  return new URL(`${c.nucleo}.js`, base).href;
};

function criarWorker(): Worker {
  return new Worker(new URL('./tocador-worker.ts', import.meta.url), { type: 'module', name: 'kof-tocador' });
}

function esperarPronto(w: Worker): Promise<InfoDaFaixa> {
  return new Promise((ok, falhou) => {
    w.onmessage = ({ data }: MessageEvent<DoTocador>) => {
      if (data.tipo === 'pronto') ok(data);
      else if (data.tipo === 'erro') falhou(new Error(data.mensagem));
    };
    w.onerror = (e) => falhou(new Error(e.message || 'o Worker da música caiu'));
  });
}

export class Tocador {
  info!: InfoDaFaixa;
  ultimo: OndasAoVivo | null = null;
  aoAcabar: (() => void) | null = null;
  aoErrar: ((m: string) => void) | null = null;
  private worker = criarWorker();
  private ctx: AudioContext | null = null;
  private ganho: GainNode | null = null;
  private saidaSom: AudioWorkletNode | null = null;
  private acordar = () => void this.ctx?.resume();

  private constructor() {}

  static async abrir(o: OpcoesDoTocador): Promise<Tocador> {
    const t = new Tocador();
    try {
      const { sab, pcm } = await t.ligarSom(o.volume, o.mudo);
      const pronto = esperarPronto(t.worker);
      t.mandar({
        tipo: 'iniciar',
        faixa: o.faixa,
        urlNucleo: urlDoNucleo(o.faixa, o.baseNucleos),
        sab,
        pcm,
        taxaSaida: t.ctx?.sampleRate ?? 48000,
        segundos: o.segundos,
        fadeMs: o.fadeMs,
        repetir: o.repetir,
        mudas: o.mudas,
      });
      t.info = await pronto;
    } catch (e) {
      t.fechar();
      throw e;
    }
    t.worker.onmessage = ({ data }: MessageEvent<DoTocador>) => t.receber(data);
    return t;
  }

  /** Com isolamento: anel compartilhado. Sem ele (WebView do Android): o som vai por mensagem (`pcm`, ver anel.ts). */
  private async ligarSom(volume: number, mudo: boolean): Promise<{ sab: SharedArrayBuffer | null; pcm: boolean }> {
    if (typeof AudioWorkletNode !== 'function') throw new Error('o navegador não liberou o som pra jukebox');
    const isolado = typeof SharedArrayBuffer === 'function' && !!self.crossOriginIsolated;
    const ctx = new AudioContext({ latencyHint: 'playback' });
    const url = URL.createObjectURL(
      new Blob([isolado ? CODIGO_WORKLET : CODIGO_WORKLET_PCM], { type: 'text/javascript' }),
    );
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    let sab: SharedArrayBuffer | null = null;
    let no: AudioWorkletNode;
    if (isolado) {
      const cap = Math.round(ctx.sampleRate * 0.5);
      sab = new SharedArrayBuffer(16 + cap * 8);
      no = new AudioWorkletNode(ctx, 'kof-som', { outputChannelCount: [2], processorOptions: { sab } });
    } else no = new AudioWorkletNode(ctx, 'kof-som-pcm', { outputChannelCount: [2] });
    this.saidaSom = no;
    this.ganho = ctx.createGain();
    no.connect(this.ganho).connect(ctx.destination);
    this.ctx = ctx;
    this.volume(volume, mudo);
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => undefined); // sem gesto ainda: tenta de novo no próximo toque/tecla
      addEventListener('pointerdown', this.acordar, true);
      addEventListener('keydown', this.acordar, true);
    }
    return { sab, pcm: !isolado };
  }

  private receber(d: DoTocador) {
    if (d.tipo === 'pcm') this.saidaSom?.port.postMessage(d.dados, [d.dados.buffer]);
    else if (d.tipo === 'ondas') {
      const lat = this.ctx ? (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) : 0;
      this.ultimo = {
        amostras: d.amostras,
        ondas: d.ondas,
        niveis: d.niveis,
        ouvido: Math.max(0, d.amostras / this.info.taxa - d.filaMs / 1000 - lat),
      };
    } else if (d.tipo === 'fim') this.aoAcabar?.();
    else if (d.tipo === 'erro') this.aoErrar?.(d.mensagem);
  }

  private mandar(m: ParaTocador) {
    this.worker.postMessage(m);
  }

  tocar(sim: boolean) {
    this.mandar({ tipo: 'tocar', sim });
    if (this.ctx) void (sim ? this.ctx.resume() : this.ctx.suspend()).catch(() => undefined);
  }

  mudas(m: number) {
    this.mandar({ tipo: 'mudas', m });
  }

  configurar(segundos: number, fadeMs: number, repetir: boolean) {
    this.mandar({ tipo: 'config', segundos, fadeMs, repetir });
  }

  volume(volume: number, mudo: boolean) {
    if (this.ganho) this.ganho.gain.value = mudo ? 0 : volume;
  }

  fechar() {
    this.mandar({ tipo: 'parar' });
    this.worker.terminate();
    removeEventListener('pointerdown', this.acordar, true);
    removeEventListener('keydown', this.acordar, true);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}

/** O .wav de uma faixa (num Worker à parte, mais rápido que o tempo real; mudo/solo valem). */
export async function gerarWav(
  faixa: FaixaNoWorker,
  baseNucleos: URL,
  segundos: number,
  fadeMs: number,
  mudas: number,
): Promise<Uint8Array> {
  const w = criarWorker();
  try {
    const pronto = esperarPronto(w);
    const m: ParaTocador = {
      tipo: 'iniciar',
      faixa,
      urlNucleo: urlDoNucleo(faixa, baseNucleos),
      sab: null,
      taxaSaida: 48000,
      segundos,
      fadeMs,
      repetir: false,
      mudas,
    };
    w.postMessage(m);
    await pronto;
    return await new Promise<Uint8Array>((ok, falhou) => {
      w.onmessage = ({ data }: MessageEvent<DoTocador>) => {
        if (data.tipo === 'wav') ok(data.bytes);
        else if (data.tipo === 'erro') falhou(new Error(data.mensagem));
      };
      const p: ParaTocador = { tipo: 'wav', segundos, fadeMs };
      w.postMessage(p);
    });
  } finally {
    w.terminate();
  }
}
