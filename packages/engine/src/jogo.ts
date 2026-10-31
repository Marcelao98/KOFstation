// O jogo rodando, do lado da página: cria o Worker do núcleo e o som (AudioWorklet), manda os botões e recebe os quadros.
// Sem React: a tela do jogo só recebe callbacks (o laço não passa pelo render).
import type { SistemaId } from '@kof/domain';
import { CODIGO_WORKLET } from './anel';
import type { InfoDoJogo } from './libretro';
import type { DoWorker, Medicao, ParaWorker } from './mensagens';
import { NUCLEOS } from './nucleos';

export interface EventosDoJogo {
  quadro?: (pixels: Uint32Array, largura: number, altura: number) => void;
  medicao?: (m: Medicao) => void;
  erro?: (mensagem: string, log: string[]) => void;
}

export interface OpcoesDoJogo {
  sistema: SistemaId;
  rom: Uint8Array;
  /** endereço da pasta dos núcleos (ex.: new URL('nucleos/', document.baseURI)) */
  baseNucleos: URL;
  volume: number;
  mudo: boolean;
}

export class Jogo {
  info!: InfoDoJogo;
  /** o som saiu pelo AudioWorklet (false = sem isolamento ou sem placa de som: o jogo roda mudo, no relógio) */
  comSom = false;
  private worker: Worker;
  private ctx: AudioContext | null = null;
  private ganho: GainNode | null = null;
  private botoes = [0, 0, 0, 0];
  private volume: number;
  private mudo: boolean;
  private acordar = () => void this.ctx?.resume();

  private constructor(
    private eventos: EventosDoJogo,
    opcoes: OpcoesDoJogo,
  ) {
    this.volume = opcoes.volume;
    this.mudo = opcoes.mudo;
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'kof-nucleo' });
  }

  static async abrir(opcoes: OpcoesDoJogo, eventos: EventosDoJogo): Promise<Jogo> {
    const c = NUCLEOS[opcoes.sistema];
    if (!c) throw new Error(`o app novo ainda não roda esse sistema (${opcoes.sistema})`);
    const j = new Jogo(eventos, opcoes);
    const sab = await j.ligarSom();
    const pronto = new Promise<InfoDoJogo>((ok, falhou) => {
      j.worker.onmessage = ({ data }: MessageEvent<DoWorker>) => {
        if (data.tipo === 'pronto') ok(data.info);
        else if (data.tipo === 'erro') falhou(new Error(data.mensagem));
      };
      j.worker.onerror = (e) => falhou(new Error(e.message || 'o Worker do núcleo caiu'));
    });
    j.mandar({
      tipo: 'iniciar',
      sistema: opcoes.sistema,
      rom: opcoes.rom,
      urlNucleo: new URL(`${c.nucleo}.js`, opcoes.baseNucleos).href,
      sab,
      taxaSaida: j.ctx?.sampleRate ?? 48000,
    });
    try {
      j.info = await pronto;
    } catch (e) {
      j.fechar();
      throw e;
    }
    j.worker.onmessage = ({ data }: MessageEvent<DoWorker>) => j.receber(data);
    j.worker.onerror = (e) => j.eventos.erro?.(e.message || 'o Worker do núcleo caiu', []);
    return j;
  }

  private async ligarSom(): Promise<SharedArrayBuffer | null> {
    if (typeof AudioWorkletNode !== 'function' || typeof SharedArrayBuffer !== 'function' || !self.crossOriginIsolated)
      return null;
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'text/javascript' }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const cap = Math.round(ctx.sampleRate * 0.5);
      const sab = new SharedArrayBuffer(16 + cap * 8);
      const no = new AudioWorkletNode(ctx, 'kof-som', { outputChannelCount: [2], processorOptions: { sab } });
      this.ganho = ctx.createGain();
      no.connect(this.ganho).connect(ctx.destination);
      this.ctx = ctx;
      this.comSom = true;
      this.aplicarVolume();
      ctx.onstatechange = () => this.mandar({ tipo: 'som', tocando: ctx.state === 'running' });
      if (ctx.state !== 'running') {
        void ctx.resume().catch(() => undefined); // sem gesto ainda: tenta de novo no próximo toque/tecla
        addEventListener('pointerdown', this.acordar, true);
        addEventListener('keydown', this.acordar, true);
      }
      queueMicrotask(() => this.mandar({ tipo: 'som', tocando: ctx.state === 'running' }));
      return sab;
    } catch {
      this.comSom = false; // sem placa de som ou worklet bloqueado: o jogo roda mudo, no relógio do núcleo
      return null;
    }
  }

  private receber(m: DoWorker) {
    if (m.tipo === 'quadro') this.eventos.quadro?.(new Uint32Array(m.pixels), m.largura, m.altura);
    else if (m.tipo === 'medicao') this.eventos.medicao?.(m.m);
    else if (m.tipo === 'erro') this.eventos.erro?.(m.mensagem, m.log);
  }

  private mandar(m: ParaWorker) {
    this.worker.postMessage(m);
  }

  /** Botões do jogador (bits do controle virtual). Só manda quando muda. */
  botoesDo(jogador: number, bits: number) {
    if (this.botoes[jogador] === bits) return;
    this.botoes[jogador] = bits;
    this.mandar({ tipo: 'pad', jogador, bits });
  }

  pausar(sim: boolean) {
    this.mandar({ tipo: 'pausar', sim });
    if (this.ctx) void (sim ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  }

  turbo(sim: boolean) {
    this.mandar({ tipo: 'turbo', sim });
  }

  reiniciar() {
    this.mandar({ tipo: 'reiniciar' });
  }

  ajustarVolume(volume: number, mudo: boolean) {
    this.volume = volume;
    this.mudo = mudo;
    this.aplicarVolume();
  }

  private aplicarVolume() {
    if (this.ganho) this.ganho.gain.value = this.mudo ? 0 : this.volume;
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
