// ⏺ Gravador do jogo (G.1): junta a moldura e a tela do jogo (já com o filtro do F4) num canvas só, a cada quadro do
// monitor, e grava com o MediaRecorder do navegador, junto com o som. O vídeo sai em pedaços de 1 s (`aoPedaco`), que
// vão direto pro disco: uma gravação longa não fica inteira na memória.
import { bitsDoVideo, type CenaDaGravacao, type FormatoDeGravacao } from '@kof/domain';

export interface OpcoesDoGravador {
  /** a tela do jogo como o jogador vê (o canvas do RenderizadorVisual) */
  fonte: HTMLCanvasElement;
  cena: CenaDaGravacao;
  formato: FormatoDeGravacao;
  /** o desenho da moldura (esticado no vídeo inteiro); sem ele, fundo preto */
  fundo?: CanvasImageSource | undefined;
  /** cantos arredondados da tela do jogo, em fração da altura dela (molduras de TV) */
  raio?: number | undefined;
  /** o som do jogo; sem ele o vídeo sai mudo */
  som?: MediaStream | undefined;
  /** cada pedaço do arquivo, em ordem */
  aoPedaco: (pedaco: Blob) => void;
  /** o MediaRecorder parou sozinho com erro */
  aoErro: (e: Error) => void;
}

export class Gravador {
  private readonly cv: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly rec: MediaRecorder;
  private pedido = 0;
  private parou: Promise<void> | null = null;

  constructor(private readonly o: OpcoesDoGravador) {
    const { largura, altura } = o.cena;
    this.cv = document.createElement('canvas');
    this.cv.width = largura;
    this.cv.height = altura;
    const g = this.cv.getContext('2d', { alpha: false });
    if (!g) throw new Error('sem canvas 2D pra gravar');
    this.g = g;
    g.imageSmoothingQuality = 'high';
    this.pintar();
    const video = this.cv.captureStream(60);
    const trilhas = [...video.getVideoTracks(), ...(o.som?.getAudioTracks() ?? [])];
    this.rec = new MediaRecorder(new MediaStream(trilhas), {
      mimeType: o.formato.mime,
      videoBitsPerSecond: bitsDoVideo(largura, altura),
      audioBitsPerSecond: 160_000,
    });
    this.rec.ondataavailable = (e) => {
      if (e.data.size) o.aoPedaco(e.data);
    };
    this.rec.onerror = (e) => {
      const err = (e as Event & { error?: unknown }).error;
      o.aoErro(err instanceof Error ? err : new Error('o gravador do navegador parou'));
    };
  }

  /** Começa: um pedaço por segundo. */
  comecar() {
    const laco = () => {
      this.pedido = requestAnimationFrame(laco);
      this.pintar();
    };
    this.pedido = requestAnimationFrame(laco);
    this.rec.start(1000);
  }

  /** Para e espera o último pedaço sair (o `aoPedaco` dele já foi chamado quando isto resolve). */
  parar(): Promise<void> {
    this.parou ??= new Promise<void>((ok) => {
      cancelAnimationFrame(this.pedido);
      if (this.rec.state === 'inactive') return ok();
      this.rec.addEventListener('stop', () => ok(), { once: true });
      this.rec.stop();
    });
    return this.parou;
  }

  get gravando() {
    return this.rec.state === 'recording';
  }

  private pintar() {
    const { g, o } = this;
    const { largura, altura, jogo } = o.cena;
    g.fillStyle = '#000';
    g.fillRect(0, 0, largura, altura);
    if (o.fundo) g.drawImage(o.fundo, 0, 0, largura, altura);
    g.save();
    if (o.raio) {
      g.beginPath();
      g.roundRect(jogo.x, jogo.y, jogo.w, jogo.h, o.raio * jogo.h);
      g.clip();
    }
    // o canvas do jogo: pixel nítido quando ele é menor que o vídeo (o 2D sem WebGL desenha no tamanho do console)
    g.imageSmoothingEnabled = o.fonte.width >= jogo.w;
    g.drawImage(o.fonte, jogo.x, jogo.y, jogo.w, jogo.h);
    g.restore();
  }
}
