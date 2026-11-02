// O jogo rodando num núcleo NATIVO (M11b, D32): o processo `kofstation --nativo` roda o núcleo e toca o som; a página
// só recebe os quadros (desenha com os mesmos filtros e molduras) e manda os botões, pela WebSocket local com token.
// Mesma cara da classe `Jogo` (wasm): o resto do app não precisa saber qual está rodando.
import {
  NATIVO,
  blocoNativo,
  botoesNativo,
  lerAviso,
  lerBinario,
  type AvisoNativo,
  type ComandoNativo,
} from '@kof/contracts';
import type { SistemaId } from '@kof/domain';
import type { EventosDoJogo } from './jogo';
import type { InfoDoJogo } from './libretro';
import type { ReplayDoBug } from './mensagens';
import { mascaraLibretro, mascaraN64 } from './nucleos';

export interface OpcoesNativo {
  sistema: SistemaId;
  /** o que o `nativo.abrir` devolveu */
  porta: number;
  token: string;
  volume: number;
  mudo: boolean;
  /** save da bateria (no PS1, o cartão de memória 1) pra pôr antes de jogar */
  sram?: Uint8Array | null;
  /** quanto esperar o "pronto" (ms) */
  prazo?: number;
  /** pros testes (Node): a implementação de WebSocket */
  WebSocket?: typeof WebSocket;
}

type Espera = { ok: (b: Uint8Array | null) => void; falhou: (e: Error) => void };

/** Pedido interno: a bateria conferida a cada segundo (o Worker do wasm faz igual). */
const PEDIDO_SRAM = 0x7fff_0000;

const iguais = (a: Uint8Array | null, b: Uint8Array) => !!a && a.length === b.length && a.every((v, i) => v === b[i]);

export class JogoNativo {
  readonly nativo = true;
  info!: InfoDoJogo;
  /** a placa de som abriu no processo nativo (false = roda no relógio, mudo) */
  comSom = false;
  private ws: WebSocket;
  private proximo = 1;
  private esperando = new Map<number, Espera>();
  private botoes = [0, 0, 0, 0];
  private eixos = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  private fechando = false;
  private sramAntes: Uint8Array | null = null;
  private relogioSram = 0;
  private medAntes: { t: number; quadros: number; faltas: number } | null = null;
  private volume: number;
  private mudo: boolean;

  private constructor(
    private eventos: EventosDoJogo,
    private o: OpcoesNativo,
  ) {
    this.volume = o.volume;
    this.mudo = o.mudo;
    const WS = o.WebSocket ?? WebSocket;
    this.ws = new WS(`ws://127.0.0.1:${o.porta}/?t=${encodeURIComponent(o.token)}`);
    this.ws.binaryType = 'arraybuffer';
  }

  static async abrir(o: OpcoesNativo, eventos: EventosDoJogo): Promise<JogoNativo> {
    const j = new JogoNativo(eventos, o);
    const pronto = new Promise<Extract<AvisoNativo, { tipo: 'pronto' }>>((ok, falhou) => {
      const prazo = setTimeout(() => falhou(new Error('o núcleo nativo não respondeu')), o.prazo ?? 15000);
      j.ws.onmessage = (ev: MessageEvent) => {
        if (typeof ev.data !== 'string') return; // quadro antes do "pronto": o próximo vem
        const a = lerAviso(ev.data);
        if (a?.tipo === 'pronto') {
          clearTimeout(prazo);
          ok(a);
        } else if (a?.tipo === 'erro' || a?.tipo === 'fim') {
          clearTimeout(prazo);
          falhou(new Error(a.tipo === 'erro' ? a.mensagem : `o núcleo nativo fechou: ${a.motivo}`));
        }
      };
      j.ws.onerror = () => {
        clearTimeout(prazo);
        falhou(new Error('não consegui falar com o núcleo nativo'));
      };
    });
    let p;
    try {
      p = await pronto;
    } catch (e) {
      j.fechar();
      throw e;
    }
    j.info = {
      sistema: o.sistema,
      largura: p.largura,
      altura: p.altura,
      fps: p.fps,
      taxaAudio: p.taxa,
      proporcao: p.proporcao,
    };
    j.comSom = p.taxaSaida > 0;
    j.ws.onmessage = (ev: MessageEvent) => j.receber(ev.data as string | ArrayBuffer);
    j.ws.onclose = () => {
      if (!j.fechando) j.eventos.erro?.('o núcleo nativo fechou sem avisar', []);
      j.falharTudo('o jogo fechou');
    };
    j.aplicarVolume();
    if (o.sram?.length) {
      j.sramAntes = o.sram;
      j.escreverSram(o.sram);
    }
    j.relogioSram = setInterval(() => j.conferirSram(), 1000) as unknown as number;
    return j;
  }

  private receber(d: string | ArrayBuffer) {
    if (typeof d === 'string') {
      const a = lerAviso(d);
      if (!a) return;
      if (a.tipo === 'desempenho') this.medir(a);
      else if (a.tipo === 'ok') this.responder(a.pedido, null);
      else if (a.tipo === 'erro') {
        if (a.pedido !== null && this.esperando.has(a.pedido)) this.recusar(a.pedido, a.mensagem);
        else this.eventos.erro?.(a.mensagem, []);
      } else if (a.tipo === 'fim' && !this.fechando) this.eventos.erro?.(`o núcleo nativo fechou: ${a.motivo}`, []);
      return;
    }
    let b;
    try {
      b = lerBinario(d);
    } catch (e) {
      this.eventos.erro?.(`mensagem estranha do núcleo nativo: ${(e as Error).message}`, []);
      return;
    }
    if (b.tipo === 'quadro') {
      // o RGBA começa no byte 12 (múltiplo de 4): vira Uint32Array sem cópia
      const px = new Uint32Array(b.rgba.buffer, b.rgba.byteOffset, b.largura * b.altura);
      this.eventos.quadro?.(px, b.largura, b.altura);
    } else if (b.pedido === PEDIDO_SRAM) {
      if (b.dados.length && !iguais(this.sramAntes, b.dados)) {
        this.sramAntes = b.dados.slice();
        this.eventos.sram?.(this.sramAntes);
      }
    } else this.responder(b.pedido, b.dados.slice());
  }

  private medir(a: Extract<AvisoNativo, { tipo: 'desempenho' }>) {
    const t = performance.now();
    const antes = this.medAntes;
    this.medAntes = { t, quadros: a.quadros, faltas: a.faltas };
    if (!antes) return;
    const s = (t - antes.t) / 1000;
    this.eventos.medicao?.({
      fps: s > 0 ? Math.round((a.quadros - antes.quadros) / s) : 0,
      nucleoMs: 0, // o núcleo roda no outro processo: o tempo dele não aparece aqui
      atrasos: 0,
      faltasDeSom: a.faltas - antes.faltas,
      somNaFilaMs: Math.round(a.atrasoMs),
    });
  }

  private responder(pedido: number, bytes: Uint8Array | null) {
    const p = this.esperando.get(pedido);
    this.esperando.delete(pedido);
    p?.ok(bytes);
  }

  private recusar(pedido: number, msg: string) {
    const p = this.esperando.get(pedido);
    this.esperando.delete(pedido);
    p?.falhou(new Error(msg));
  }

  private falharTudo(msg: string) {
    for (const p of this.esperando.values()) p.falhou(new Error(msg));
    this.esperando.clear();
  }

  private esperar(f: (pedido: number) => void): Promise<Uint8Array | null> {
    const pedido = this.proximo++;
    return new Promise((ok, falhou) => {
      this.esperando.set(pedido, { ok, falhou });
      f(pedido);
    });
  }

  private enviar(m: ComandoNativo | Uint8Array) {
    if (this.ws.readyState !== 1) return; // fechado ou fechando: nada mais a mandar
    this.ws.send(m instanceof Uint8Array ? (m as Uint8Array<ArrayBuffer>) : JSON.stringify(m));
  }

  private conferirSram() {
    this.enviar({ cmd: 'lerBateria', pedido: PEDIDO_SRAM });
  }

  async salvarEstado(): Promise<Uint8Array> {
    const b = await this.esperar((pedido) => this.enviar({ cmd: 'salvarEstado', pedido }));
    if (!b) throw new Error('o núcleo não devolveu o estado');
    return b;
  }

  async carregarEstado(e: Uint8Array): Promise<void> {
    await this.esperar((pedido) => this.enviar(blocoNativo(NATIVO.CARREGAR_ESTADO, pedido, e)));
  }

  lerSram(): Promise<Uint8Array | null> {
    return this.esperar((pedido) => this.enviar({ cmd: 'lerBateria', pedido })).then((b) => (b?.length ? b : null));
  }

  escreverSram(bytes: Uint8Array) {
    this.enviar(blocoNativo(NATIVO.GRAVAR_BATERIA, 0, bytes));
  }

  mudarOpcoes(opcoes: Record<string, string>) {
    for (const [chave, valor] of Object.entries(opcoes)) this.enviar({ cmd: 'variavel', chave, valor });
  }

  /** O nativo não rebobina (o PS1 também não rebobina no wasm: estado de ~4 MB). */
  configurarRebobinar(): void {
    // nada: sem rebobinar no nativo
  }
  rebobinar(): void {
    // nada: sem rebobinar no nativo
  }
  /** O caçador de bugs fica no wasm; no nativo o pacote leva o log do processo (pela tela do bug). */
  cacador(): void {
    // nada: o caçador é do wasm
  }

  replayDoBug(): Promise<ReplayDoBug> {
    return Promise.resolve({ estado: null, entradas: '', quadros: 0, agora: { estado: '', assinatura: 'nativo' } });
  }

  private mandarPad(jogador: number) {
    const mascara = this.o.sistema === 'n64' ? mascaraN64 : mascaraLibretro;
    this.enviar(botoesNativo(jogador, mascara(this.botoes[jogador] ?? 0), this.eixos[jogador] ?? [0, 0, 0, 0]));
  }

  botoesDo(jogador: number, bits: number) {
    if (this.botoes[jogador] === bits) return;
    this.botoes[jogador] = bits;
    this.mandarPad(jogador);
  }

  eixosDo(jogador: number, e: readonly number[] | null) {
    const v = e ? e.slice(0, 4) : [0, 0, 0, 0];
    const antes = this.eixos[jogador];
    if (antes && antes.every((x, i) => x === v[i])) return;
    this.eixos[jogador] = v;
    this.mandarPad(jogador);
  }

  pausar(sim: boolean) {
    this.enviar({ cmd: sim ? 'pausar' : 'continuar' });
  }

  turbo(sim: boolean) {
    this.enviar({ cmd: 'turbo', fator: sim ? 4 : 1 });
  }

  reiniciar() {
    this.enviar({ cmd: 'reiniciar' });
  }

  ajustarVolume(volume: number, mudo: boolean) {
    this.volume = volume;
    this.mudo = mudo;
    this.aplicarVolume();
  }

  private aplicarVolume() {
    this.enviar({ cmd: 'volume', valor: this.mudo ? 0 : this.volume });
  }

  fechar() {
    this.fechando = true;
    clearInterval(this.relogioSram);
    this.falharTudo('o jogo fechou');
    this.enviar({ cmd: 'fechar' });
    try {
      this.ws.close();
    } catch {
      // já fechada: nada a fazer
    }
  }
}
