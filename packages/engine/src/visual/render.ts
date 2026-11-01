// O desenho do jogo com o painel de imagem (app.js 40–238 do antigo: gl*, pintar, conferirTela), sem DOM além do
// canvas: WebGL 1 com o shader sob medida do KofVisual, as passadas em textura (NTSC, Scale4x, bloom), duas texturas
// alternando (o quadro anterior serve pro rastro de LCD) e a reserva de imagem simples quando um filtro não roda no
// aparelho. O código segue o antigo linha por linha: a imagem tem que sair igual.
import { KofVisual, type Valores } from './kofvisual.js';

const FRAG_SIMPLES =
  'precision mediump float; uniform sampler2D t; varying vec2 uv; void main() { gl_FragColor = vec4(texture2D(t, uv).rgb, 1.); }';

interface Uniformes {
  prog?: WebGLProgram;
  erro?: string;
  t?: WebGLUniformLocation | null;
  tp?: WebGLUniformLocation | null;
  tb?: WebGLUniformLocation | null;
  tela?: WebGLUniformLocation | null;
  u?: WebGLUniformLocation | null;
  p?: WebGLUniformLocation | null;
  q?: WebGLUniformLocation | null;
}
interface Alvo {
  tex: WebGLTexture;
  fb: WebGLFramebuffer;
  w: number;
  h: number;
  ok: boolean;
}

export interface OpcoesDoRender {
  /** aviso pra pessoa (filtro que não roda no aparelho) */
  avisar?: (texto: string, ms: number) => void;
  /** registro técnico (log) */
  anotar?: (texto: string) => void;
}

export class RenderizadorVisual {
  readonly gl: WebGLRenderingContext | null;
  private ctx: CanvasRenderingContext2D | null = null;
  telaL = 256;
  telaA = 224;
  private img: ImageData;
  private px: Uint32Array;
  private bytesTela: Uint8Array;
  private glTex: WebGLTexture[] = [];
  private glVez = 0;
  private glU: Uniformes = {};
  private glProgs: Record<string, Uniformes> = {};
  private glVert: WebGLShader | null = null;
  private glRuins = new Set<string>();
  private glBons = new Set<string>();
  private glChave = '';
  private glConferir = 3;
  glPassosOk = true;
  private glPasso: { progs: Record<string, Uniformes>; alvos: Record<string, Alvo>; vert: WebGLShader | null } = {
    progs: {},
    alvos: {},
    vert: null,
  };
  /** ajustes em uso */
  v: Valores = { ...KofVisual.PADRAO };
  /** comparar antes|depois: 0 = desligado, senão a posição da divisão (0..1) */
  divisao = 0;
  /** quando ligou (efeito "ligar a TV") */
  ligaIni = -1e9;
  /** jogo pausado (alguns efeitos mudam) */
  pausado = false;
  /** quantos quadros novos chegaram (o painel mostra quadros/s) */
  quadros = 0;
  /** o filtro atual caiu pra imagem simples (por quê) */
  motivo = '';

  constructor(
    readonly canvas: HTMLCanvasElement,
    private op: OpcoesDoRender = {},
  ) {
    this.img = new ImageData(this.telaL, this.telaA);
    this.px = new Uint32Array(this.img.data.buffer);
    this.bytesTela = new Uint8Array(this.img.data.buffer);
    // preserveDrawingBuffer: o print e os testes leem a tela depois do desenho (a imagem é a mesma do antigo)
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    this.gl = gl;
    if (!gl) {
      this.ctx = canvas.getContext('2d', { alpha: false });
      return;
    }
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture();
      this.glTex[i] = t;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // o shader faz o nítido sozinho
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.telaL, this.telaA, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    this.glPrograma(this.v);
  }

  /** Os pixels da imagem do jogo (RGBA, 1 por Uint32), no tamanho telaL × telaA. */
  get pixels(): Uint32Array {
    return this.px;
  }

  // ---------- compilar ----------

  private glCompilar(vert: 'final' | 'passo', frag: string): { prog: WebGLProgram; erro: string } {
    const gl = this.gl as WebGLRenderingContext;
    let erro = '';
    const sombra = (tipo: number, fonte: string) => {
      const s = gl.createShader(tipo) as WebGLShader;
      gl.shaderSource(s, fonte);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost())
        erro = erro || gl.getShaderInfoLog(s) || 'não compilou';
      return s;
    };
    if (!this.glVert)
      this.glVert = sombra(
        gl.VERTEX_SHADER,
        `attribute vec2 p; varying vec2 uv;
    void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`,
      );
    // as passadas desenham em textura com a linha de cima no 0 (igual à textura do jogo): o uv não vira de cabeça pra baixo
    if (vert === 'passo' && !this.glPasso.vert)
      this.glPasso.vert = sombra(
        gl.VERTEX_SHADER,
        `attribute vec2 p; varying vec2 uv;
    void main() { uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`,
      );
    const prog = gl.createProgram() as WebGLProgram;
    gl.attachShader(prog, (vert === 'passo' ? this.glPasso.vert : this.glVert) as WebGLShader);
    gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!erro && !gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost())
      erro = gl.getProgramInfoLog(prog) || 'não ligou';
    return { prog, erro: erro.trim() };
  }

  private glProgramaDe(v: Valores, simples: boolean): Uniformes {
    const gl = this.gl as WebGLRenderingContext;
    const k = simples ? 'simples' : (this.glPassosOk ? 'P' : '') + KofVisual.chave(v);
    if (!this.glProgs[k]) {
      const { prog, erro } = this.glCompilar(
        'final',
        simples ? FRAG_SIMPLES : KofVisual.fonte(v, { passos: this.glPassosOk }),
      );
      if (erro && !simples) return { erro };
      const u: Uniformes = { prog };
      for (const n of ['t', 'tp', 'tb', 'tela', 'u', 'p'] as const) u[n] = gl.getUniformLocation(prog, n);
      gl.useProgram(prog);
      gl.uniform1i(u.t ?? null, 0);
      gl.uniform1i(u.tp ?? null, 1);
      gl.uniform1i(u.tb ?? null, 2);
      if (this.glU.prog) gl.useProgram(this.glU.prog);
      this.glProgs[k] = u;
    }
    return this.glProgs[k] as Uniformes;
  }

  private glFalhou(motivo: string) {
    if (this.glRuins.has(this.glChave)) return;
    this.glRuins.add(this.glChave);
    this.motivo = motivo;
    this.glU = {};
    this.op.anotar?.(`filtro de imagem desligado nesse aparelho: ${this.glChave} ${motivo}`);
    this.op.avisar?.(
      '🖼 esse filtro não roda nesse aparelho: usando a imagem simples' +
        (motivo ? ' (' + motivo.slice(0, 80) + ')' : ''),
      6000,
    );
    this.glPrograma(this.v);
  }

  private glPrograma(v: Valores) {
    const gl = this.gl as WebGLRenderingContext;
    this.glChave = (this.glPassosOk ? 'P' : '') + KofVisual.chave(v);
    const simples = this.glRuins.has(this.glChave);
    if (!simples && !this.glBons.has(this.glChave)) this.glConferir = 3; // shader novo: confere nos primeiros quadros
    const u = this.glProgramaDe(v, simples);
    if (u.erro) return this.glFalhou(u.erro);
    if (this.glU.prog !== u.prog) {
      gl.useProgram(u.prog ?? null);
      this.glU = u;
      gl.uniform4f(this.glU.tela ?? null, this.telaL, this.telaA, this.canvas.width, this.canvas.height);
    }
  }

  // ---------- passadas ----------

  private glAlvo(nome: string, w: number, h: number): Alvo {
    const gl = this.gl as WebGLRenderingContext;
    let a = this.glPasso.alvos[nome];
    if (a && a.w === w && a.h === h) return a;
    if (!a) {
      a = { tex: gl.createTexture(), fb: gl.createFramebuffer(), w: 0, h: 0, ok: false } as Alvo;
      this.glPasso.alvos[nome] = a;
    }
    a.w = w;
    a.h = h;
    gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, a.tex, 0);
    a.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return a;
  }

  private glProgPasso(id: string): Uniformes {
    const gl = this.gl as WebGLRenderingContext;
    if (!this.glPasso.progs[id]) {
      const { prog, erro } = this.glCompilar('passo', KofVisual.PASSOS[id] ?? '');
      const u: Uniformes = { prog, erro };
      for (const n of ['t', 'tela', 'u', 'q'] as const) u[n] = gl.getUniformLocation(prog, n);
      this.glPasso.progs[id] = u;
    }
    return this.glPasso.progs[id] as Uniformes;
  }

  private glDesenharPasso(id: string, entrada: WebGLTexture, wi: number, hi: number, alvo: Alvo, q: number[]) {
    const gl = this.gl as WebGLRenderingContext;
    const pr = this.glProgPasso(id);
    if (pr.erro || !alvo.ok) throw new Error(pr.erro || 'textura de desenho não funciona aqui');
    gl.bindFramebuffer(gl.FRAMEBUFFER, alvo.fb);
    gl.viewport(0, 0, alvo.w, alvo.h);
    gl.useProgram(pr.prog ?? null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, entrada);
    gl.uniform1i(pr.t ?? null, 0);
    gl.uniform4f(pr.tela ?? null, wi, hi, alvo.w, alvo.h);
    gl.uniform4f(pr.u ?? null, (performance.now() / 1000) % 1000, 0, 0, 0);
    gl.uniform4fv(pr.q ?? null, q);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private glRodarPassos(v: Valores, entrada: WebGLTexture): { tex: WebGLTexture; brilho: WebGLTexture | null } {
    const gl = this.gl as WebGLRenderingContext;
    const lista = this.glPassosOk ? KofVisual.passos(v, this.telaL, this.telaA) : [];
    if (!lista.length) return { tex: entrada, brilho: null };
    let tex = entrada;
    let w = this.telaL;
    let h = this.telaA;
    let brilho: WebGLTexture | null = null;
    try {
      lista.forEach((p, i) => {
        if (p.id === 'bloom') {
          const a = this.glAlvo('brilhoA', p.w, p.h);
          const b = this.glAlvo('brilhoB', p.w, p.h);
          this.glDesenharPasso('bloomReduz', tex, w, h, a, [0, 0, 0, 0]);
          this.glDesenharPasso('bloomBorra', a.tex, p.w, p.h, b, [p.q[0] ?? 1, 1, 0, 0]);
          this.glDesenharPasso('bloomBorra', b.tex, p.w, p.h, a, [p.q[0] ?? 1, 0, 1, 0]);
          brilho = a.tex;
          return;
        }
        const a = this.glAlvo('passo' + i, p.w, p.h);
        this.glDesenharPasso(p.id, tex, w, h, a, p.q);
        tex = a.tex;
        w = p.w;
        h = p.h;
      });
    } catch (e) {
      // aparelho sem passada extra: desliga e segue com o desenho de um passo só
      this.op.anotar?.(`passadas extras desligadas: ${e instanceof Error ? e.message : String(e)}`);
      this.glPassosOk = false;
      this.glU = {};
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.op.avisar?.(
        '🖼 esse aparelho não aguenta os filtros em etapas (NTSC, pixel art HD, brilho): ficam desligados',
        6000,
      );
      this.glPrograma(this.v);
      gl.uniform4fv(this.glU.p ?? null, KofVisual.vetor(this.v, 13));
      return { tex: entrada, brilho: null };
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, brilho };
  }

  // ---------- tamanho, ajustes e desenho ----------

  /** A imagem do jogo mudou de tamanho (outro sistema, Sega em outra resolução). */
  tamanhoTela(l: number, a: number) {
    if (l === this.telaL && a === this.telaA) return;
    this.telaL = l;
    this.telaA = a;
    this.img = new ImageData(l, a);
    this.px = new Uint32Array(this.img.data.buffer);
    this.bytesTela = new Uint8Array(this.img.data.buffer);
    const gl = this.gl;
    if (gl) {
      for (const t of this.glTex) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, l, a, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.uniform4f(this.glU.tela ?? null, l, a, this.canvas.width, this.canvas.height);
    } else {
      this.canvas.width = l;
      this.canvas.height = a;
    }
  }

  /** Tamanho na tela (CSS); o WebGL desenha na resolução da tela, pros filtros terem detalhe. */
  tamanho(w: number, h: number) {
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const gl = this.gl;
    if (!gl) return;
    const dpr = devicePixelRatio || 1;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform4f(this.glU.tela ?? null, this.telaL, this.telaA, this.canvas.width, this.canvas.height);
    this.pintar(false);
  }

  /** Aplica os ajustes (o aplicarVisual do antigo, sem guardar). */
  aplicar(v: Valores) {
    this.v = { ...KofVisual.PADRAO, ...v };
    const gl = this.gl;
    if (!gl) return;
    this.glPrograma(this.v);
    gl.uniform4fv(this.glU.p ?? null, KofVisual.vetor(this.v, this.glPassosOk ? KofVisual.NP : 13));
    this.pintar(false);
  }

  /** Um quadro novo do jogo. */
  desenhar(pixels: Uint32Array, largura: number, altura: number) {
    this.tamanhoTela(largura, altura);
    this.px.set(pixels.subarray(0, largura * altura));
    this.pintar(true);
  }

  /** novo = chegou um quadro novo (troca de textura: a outra vira o "quadro anterior"); false = só redesenha. */
  pintar(novo: boolean) {
    const gl = this.gl;
    if (!gl) {
      this.ctx?.putImageData(this.img, 0, 0);
      return;
    }
    if (novo) this.glVez ^= 1;
    const atual = this.glTex[this.glVez] as WebGLTexture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atual);
    if (novo)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.telaL, this.telaA, gl.RGBA, gl.UNSIGNED_BYTE, this.bytesTela);
    const ps = this.glRodarPassos(this.v, atual);
    if (ps.tex !== atual || ps.brilho) {
      // as passadas mexeram no estado: volta pro desenho final na tela
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(this.glU.prog ?? null);
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, ps.brilho ?? atual);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glTex[this.glVez ^ 1] ?? null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ps.tex);
    const agora = performance.now();
    const liga = (this.v.ligarTv ?? 0) > 0.5 ? Math.min(1, (agora - this.ligaIni) / 650) : 1;
    gl.uniform4f(this.glU.u ?? null, (agora / 1000) % 1000, this.divisao, liga, this.pausado ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (novo) this.quadros++;
    if (novo && this.glConferir > 0 && !this.glRuins.has(this.glChave)) this.conferirTela();
  }

  /** Esse jeito tem animação (redesenhar mesmo parado). */
  animado(): boolean {
    return KofVisual.animado(this.v) || performance.now() - this.ligaIni < 700;
  }

  /** Alguns drivers "compilam" o shader grande mas desenham preto: confere uns pixels nos primeiros quadros. */
  private conferirTela() {
    const gl = this.gl as WebGLRenderingContext;
    if (performance.now() - this.ligaIni < 1200) return; // o efeito "ligar a TV" começa preto de propósito
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;
    const c = new Uint8Array(4);
    let esperados = 0;
    for (let y = 1; y < 8; y++)
      for (let x = 1; x < 8; x++) {
        const p = this.px[Math.floor((this.telaA * y) / 8) * this.telaL + Math.floor((this.telaL * x) / 8)] ?? 0;
        if (!(p & 0xffffff)) continue; // ali o jogo é preto mesmo
        esperados++;
        gl.readPixels(Math.floor((W * x) / 8), Math.floor((H * (8 - y)) / 8), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, c);
        if (c[0] || c[1] || c[2]) {
          this.glConferir = 0;
          this.glBons.add(this.glChave);
          return;
        }
      }
    if (esperados < 5) return; // quadro quase todo preto: não dá pra saber
    this.glConferir--;
    if (!this.glConferir) this.glFalhou('a tela ficou preta');
  }

  /** Prévia de um estilo: o quadro atual com esses ajustes numa textura pequena (os cartões do painel). */
  previa(v: Valores, w: number, h: number): Uint8Array | null {
    const gl = this.gl;
    if (!gl || !this.glU.prog) return null;
    const u = this.glProgramaDe(v, false);
    if (u.erro) return null;
    const atual = this.glTex[this.glVez] as WebGLTexture;
    const ps = this.glRodarPassos(v, atual);
    const a = this.glAlvo('previa', w, h);
    if (!a.ok) return null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
    gl.viewport(0, 0, w, h);
    gl.useProgram(u.prog ?? null);
    gl.uniform4f(u.tela ?? null, this.telaL, this.telaA, w, h);
    gl.uniform4f(u.u ?? null, (performance.now() / 1000) % 1000, 0, 1, 0);
    gl.uniform4fv(u.p ?? null, KofVisual.vetor(v, this.glPassosOk ? KofVisual.NP : 13));
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, ps.brilho ?? atual);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glTex[this.glVez ^ 1] ?? null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ps.tex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // volta tudo como estava pro desenho na tela
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.glU.prog ?? null);
    gl.uniform4f(this.glU.tela ?? null, this.telaL, this.telaA, this.canvas.width, this.canvas.height);
    gl.uniform4fv(this.glU.p ?? null, KofVisual.vetor(this.v, this.glPassosOk ? KofVisual.NP : 13));
    return px;
  }

  /** Lê o que está desenhado no canvas agora (testes de paridade e o print). */
  lerTela(): Uint8Array | null {
    const gl = this.gl;
    if (!gl) return null;
    const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }
}
