// Desenha o quadro do jogo num canvas com WebGL2, ampliando sem borrar (pixel nítido). Os filtros do painel de imagem
// (visual.js do antigo) entram no M7 por cima disto.
export class TelaDoJogo {
  private gl: WebGL2RenderingContext;
  private tex: WebGLTexture;
  private larg = 0;
  private alt = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('este navegador não tem WebGL2');
    this.gl = gl;
    const sh = (tipo: number, src: string) => {
      const s = gl.createShader(tipo);
      if (!s) throw new Error('WebGL: shader');
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(
      p,
      sh(
        gl.VERTEX_SHADER,
        '#version 300 es\nin vec2 a; out vec2 uv; void main(){ uv = vec2(a.x*0.5+0.5, 0.5-a.y*0.5); gl_Position = vec4(a,0,1); }',
      ),
    );
    gl.attachShader(
      p,
      sh(
        gl.FRAGMENT_SHADER,
        '#version 300 es\nprecision mediump float; in vec2 uv; uniform sampler2D t; out vec4 c; void main(){ c = vec4(texture(t, uv).rgb, 1.0); }',
      ),
    );
    gl.linkProgram(p);
    gl.useProgram(p);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex = tex;
  }

  /** Tamanho na tela (CSS) — o desenho interno acompanha a densidade de pixels da tela. */
  tamanho(w: number, h: number) {
    const dpr = devicePixelRatio || 1;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  desenhar(pixels: Uint32Array, largura: number, altura: number) {
    const gl = this.gl;
    const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, largura * altura * 4);
    if (largura !== this.larg || altura !== this.alt) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, largura, altura, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      this.larg = largura;
      this.alt = altura;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, largura, altura, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
