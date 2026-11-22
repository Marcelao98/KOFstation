// O jogo rodando num núcleo NATIVO (M11b, D32): o processo `kofstation --nativo` roda o núcleo e toca o som; a página
// só recebe os quadros (desenha com os mesmos filtros e molduras) e manda os botões, pela WebSocket local com token.
// Mesma cara da classe `Jogo` (wasm): o resto do app não precisa saber qual está rodando.
import {
  NATIVO,
  blocoNativo,
  botoesNativo,
  ponteiroNativo,
  pacoteNativo,
  lerAviso,
  lerBinario,
  type AvisoNativo,
  type ComandoNativo,
} from '@kof/contracts';
import type { SistemaId, SomAoRebobinar } from '@kof/domain';
import { CODIGO_WORKLET_PCM } from './anel';
import { FilaDeQuadros } from './fila-de-quadros';
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

/** Consoles nativos sem rebobinar por enquanto (ver `configurarRebobinar`). */
const SEM_REBOBINAR: ReadonlySet<string> = new Set(['ps2', 'gc', 'wii']);

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
  /** o processo avisou que acabou: a conexão que cai depois não volta */
  private acabou = false;
  private sramAntes: Uint8Array | null = null;
  private relogioSram = 0;
  private medAntes: { t: number; quadros: number; faltas: number } | null = null;
  /** o núcleo que o processo abriu e a placa de vídeo dele (pro diagnóstico) */
  sobreNucleo: { nome: string; versao: string; placa?: string } = { nome: '?', versao: '?' };
  private volume: number;
  private mudo: boolean;
  /** quadros que o processo mandou e ainda não foram pra tela: saem um por vsync (como no wasm) */
  private fila = new FilaDeQuadros();
  /** ⏺ gravar (G.2): onde a cópia do som que chega do processo toca (só pro gravador, não sai no alto-falante) */
  private somGravando: AudioWorkletNode | null = null;
  private pedidoDoLaco = 0;
  /** quadros que ficaram pra trás na fila (a página engasgou) e foram jogados fora */
  get descartados(): number {
    return this.fila.descartados;
  }

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
    j.sobreNucleo = { nome: p.nucleo, versao: p.versao, ...(p.placa ? { placa: p.placa } : {}) };
    j.ligar();
    // sem requestAnimationFrame (testes no Node) o quadro vai direto pra tela, sem fila
    if (typeof requestAnimationFrame === 'function') j.pedidoDoLaco = requestAnimationFrame(j.laco);
    j.aplicarVolume();
    if (o.sram?.length) {
      j.sramAntes = o.sram;
      j.escreverSram(o.sram);
    }
    j.relogioSram = setInterval(() => j.conferirSram(), 1000) as unknown as number;
    return j;
  }

  /** Liga a conexão atual à sessão (quadros, avisos e o que fazer se ela cair). */
  private ligar() {
    const ws = this.ws;
    ws.onmessage = (ev: MessageEvent) => this.receber(ev.data as string | ArrayBuffer);
    ws.onclose = () => {
      if (this.fechando || ws !== this.ws) return;
      this.falharTudo('a conexão com o núcleo nativo caiu');
      if (!this.acabou) this.religar(1);
    };
  }

  /**
   * A conexão caiu sem o processo avisar: tenta de novo (o processo segue rodando e responde "pronto" pra página que
   * conecta). Só depois de 3 tentativas sem resposta vira erro.
   */
  private religar(tentativa: number) {
    if (this.fechando) return;
    const WS = this.o.WebSocket ?? WebSocket;
    const ws = new WS(`ws://127.0.0.1:${this.o.porta}/?t=${encodeURIComponent(this.o.token)}`);
    ws.binaryType = 'arraybuffer';
    let pronto = false;
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string' || lerAviso(ev.data)?.tipo !== 'pronto') return;
      pronto = true;
      this.ws = ws;
      this.ligar();
      this.aplicarVolume();
    };
    ws.onclose = () => {
      if (pronto || this.fechando) return;
      if (tentativa < 3) setTimeout(() => this.religar(tentativa + 1), 300 * tentativa);
      else this.eventos.erro?.('o núcleo nativo fechou sem avisar', []);
    };
  }

  /** A cada vsync: solta um quadro da fila (ver `FilaDeQuadros`). */
  private laco = (agora: number) => {
    this.pedidoDoLaco = requestAnimationFrame(this.laco);
    const q = this.fila.tirar(agora);
    if (q) this.eventos.quadro?.(q.pixels, q.largura, q.altura);
  };

  private receber(d: string | ArrayBuffer) {
    if (typeof d === 'string') {
      const a = lerAviso(d);
      if (!a) return;
      if (a.tipo === 'desempenho') this.medir(a);
      else if (a.tipo === 'geometria') {
        // 4.5: a tela larga (e qualquer troca de proporção do núcleo) chega na tela
        this.info = { ...this.info, largura: a.largura, altura: a.altura, proporcao: a.proporcao };
        this.eventos.geometria?.(this.info);
      } else if (a.tipo === 'rebob') {
        const { ligado, rebobinando, segundos, limite, recarga, recargaTotal } = a;
        this.eventos.rebob?.({ ligado, rebobinando, segundos, limite, recarga, recargaTotal });
      } else if (a.tipo === 'ok') this.responder(a.pedido, null);
      else if (a.tipo === 'erro') {
        if (a.pedido !== null && this.esperando.has(a.pedido)) this.recusar(a.pedido, a.mensagem);
        else this.eventos.erro?.(a.mensagem, []);
      } else if (a.tipo === 'fim') {
        this.acabou = true;
        if (!this.fechando) this.eventos.erro?.(`o núcleo nativo fechou: ${a.motivo}`, []);
      }
      return;
    }
    let b;
    try {
      b = lerBinario(d);
    } catch (e) {
      this.eventos.erro?.(`mensagem estranha do núcleo nativo: ${(e as Error).message}`, []);
      return;
    }
    if (b.tipo === 'som') {
      const no = this.somGravando;
      if (!no) return; // a gravação acabou e ainda vinha som no caminho
      const f = new Float32Array(b.amostras.length);
      for (let i = 0; i < f.length; i++) f[i] = (b.amostras[i] ?? 0) / 32768;
      no.port.postMessage(f, [f.buffer]);
      return;
    }
    if (b.tipo === 'quadro') {
      // o RGBA começa no byte 12 (múltiplo de 4): vira Uint32Array sem cópia
      const px = new Uint32Array(b.rgba.buffer, b.rgba.byteOffset, b.largura * b.altura);
      if (this.pedidoDoLaco)
        this.fila.empurrar({ pixels: px, largura: b.largura, altura: b.altura, chegou: performance.now() });
      else this.eventos.quadro?.(px, b.largura, b.altura);
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
      nucleoMs: a.nucleoMs ?? 0, // medido no processo do jogo
      ...(a.leituraMs !== undefined ? { leituraMs: a.leituraMs } : {}),
      ...(a.imagemMs !== undefined ? { imagemMs: a.imagemMs } : {}),
      ...(a.porQuadro ? { porQuadro: a.porQuadro } : {}),
      ...(a.cpu ? { cpu: a.cpu } : {}),
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
  /**
   * 3.2: o estado já no formato da loja (`{lr, d}` em base64, em gzip quando `comprimir`), montado pelo processo numa
   * linha separada. A página só guarda: no PS2 o base64 + gzip aqui paravam a tela ~0,75 s e pesavam o Chrome.
   */
  async salvarPacote(nucleo: string, comprimir: boolean): Promise<Uint8Array> {
    const b = await this.esperar((pedido) => this.enviar({ cmd: 'salvarEstadoPacote', pedido, nucleo, comprimir }));
    if (!b) throw new Error('o núcleo não devolveu o estado');
    return b;
  }
  /** 3.2: carrega os bytes da loja como estão (o processo desempacota). */
  async carregarPacote(dados: Uint8Array, comprimido: boolean): Promise<void> {
    await this.esperar((pedido) => this.enviar(pacoteNativo(pedido, comprimido, dados)));
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

  /**
   * ⏺ Gravar (G.2): o som do jogo num MediaStream. O som do nativo toca no processo dele (na placa); aqui o processo
   * passa a mandar uma cópia (mensagens `SOM`, antes do volume: grava cheio mesmo no mudo), que toca num AudioContext
   * na taxa do núcleo ligado só ao gravador. null sem som no processo (roda mudo).
   */
  async somPraGravar(): Promise<{ stream: MediaStream; desfazer: () => void } | null> {
    if (!this.comSom || typeof AudioWorkletNode !== 'function') return null;
    const ctx = new AudioContext({ sampleRate: this.info.taxaAudio || 44100 });
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET_PCM], { type: 'text/javascript' }));
    try {
      await ctx.audioWorklet.addModule(url);
    } catch (e) {
      void ctx.close().catch(() => undefined);
      throw e;
    } finally {
      URL.revokeObjectURL(url);
    }
    const no = new AudioWorkletNode(ctx, 'kof-som-pcm', { outputChannelCount: [2] });
    const destino = ctx.createMediaStreamDestination();
    no.connect(destino);
    void ctx.resume().catch(() => undefined); // começou num F10 (gesto): já pode tocar
    this.somGravando = no;
    this.enviar({ cmd: 'somPraPagina', sim: true });
    return {
      stream: destino.stream,
      desfazer: () => {
        this.enviar({ cmd: 'somPraPagina', sim: false });
        this.somGravando = null;
        no.disconnect();
        void ctx.close().catch(() => undefined);
      },
    };
  }

  /** O rebobinar fica dentro do processo do jogo (fase R.3): aqui só as regras e o segura/solta. */
  configurarRebobinar(ligado: boolean, limite: number, recargaX: number, som: SomAoRebobinar = 'fita'): void {
    // Desligado no PS2: a foto de 48 MB a cada 2 quadros derrubava o jogo (CPU do processo de 35% pra 110%, ~1000
    // engasgos/min e faltas de som, medido em 19/11). Wii/GameCube: estado de ~105 MB (21/11). No PS1 religado em 21/11
    // (tarefa P): foto de ~4 MB, ~1 ms.
    const pode = ligado && !SEM_REBOBINAR.has(this.o.sistema);
    this.enviar({ cmd: 'rebobinar', ligado: pode, limite, recargaX, som });
  }
  rebobinar(sim: boolean): void {
    this.enviar({ cmd: 'voltar', sim });
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

  /** O mouse sobre a imagem (o ponteiro do Wiimote no Dolphin; W.4). x e y de -1 a 1 dentro da imagem. */
  ponteiro(x: number, y: number, botoes: number, dentro: boolean): void {
    this.enviar(ponteiroNativo(0, x * 32767, y * 32767, botoes, dentro));
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
    if (this.pedidoDoLaco) cancelAnimationFrame(this.pedidoDoLaco);
    this.pedidoDoLaco = 0;
    this.fila.limpar();
    this.falharTudo('o jogo fechou');
    this.enviar({ cmd: 'fechar' });
    try {
      this.ws.close();
    } catch {
      // já fechada: nada a fazer
    }
  }
}
