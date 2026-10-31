// Bancada do F4b: as mesmas medições nas duas cascas. Resultado em window.__resultado (e, no Tauri, mandado pro Rust).
'use strict';
const R = { motor: navigator.userAgent, quando: new Date().toISOString() };
const $ = (id) => document.getElementById(id);
const etapa = (t) => { $('etapa').textContent = t; };
const mostrar = () => { $('saida').textContent = JSON.stringify(R, null, 2); };

// ---------- ROMs geradas (nada de ROM de verdade) ----------
function romSnes() {   // LoROM 32 KB: SEI; BRA para si mesmo
  const r = new Uint8Array(0x8000);
  r.set([0x78, 0x80, 0xfe], 0);
  'KOF BANCADA'.split('').forEach((c, i) => { r[0x7fc0 + i] = c.charCodeAt(0); });
  for (let i = 11; i < 21; i++) r[0x7fc0 + i] = 0x20;
  r[0x7fd5] = 0x20; r[0x7fd7] = 0x05;
  r[0x7fdc] = 0xff; r[0x7fdd] = 0xff;
  r[0x7ffc] = 0x00; r[0x7ffd] = 0x80;
  let s = 0; for (const b of r) s = (s + b) & 0xffff;
  r[0x7fde] = s & 0xff; r[0x7fdf] = s >> 8; r[0x7fdc] = (s ^ 0xffff) & 0xff; r[0x7fdd] = (s ^ 0xffff) >> 8;
  return r;
}
function romNes() {   // NROM 16 KB + 8 KB de CHR: SEI; JMP para si mesmo
  const r = new Uint8Array(16 + 0x4000 + 0x2000);
  r.set([0x4e, 0x45, 0x53, 0x1a, 1, 1], 0);
  r.set([0x78, 0x4c, 0x01, 0x80], 16);
  for (const v of [0x3ffa, 0x3ffc, 0x3ffe]) { r[16 + v] = 0x00; r[16 + v + 1] = 0x80; }
  return r;
}
function romMd() {   // liga a tela e pinta o fundo de vermelho (a mesma do jogar-no-pc.cjs do antigo)
  const r = new Uint8Array(0x400), d = new DataView(r.buffer);
  d.setUint32(0, 0xfffe00); d.setUint32(4, 0x200);
  'SEGA MEGA DRIVE '.split('').forEach((c, i) => { r[0x100 + i] = c.charCodeAt(0); });
  [0x33fc, 0x8004, 0x00c0, 0x0004, 0x33fc, 0x8144, 0x00c0, 0x0004, 0x33fc, 0x8700, 0x00c0, 0x0004, 0x23fc, 0xc000, 0x0000,
    0x00c0, 0x0004, 0x33fc, 0x000e, 0x00c0, 0x0000, 0x60fe].forEach((w, i) => d.setUint16(0x200 + 2 * i, w));
  return r;
}
function exePs1() {   // PS-EXE: j para si mesmo
  const r = new Uint8Array(0x1000), d = new DataView(r.buffer);
  'PS-X EXE'.split('').forEach((c, i) => { r[i] = c.charCodeAt(0); });
  d.setUint32(0x10, 0x80010000, true); d.setUint32(0x18, 0x80010000, true); d.setUint32(0x1c, 0x800, true);
  d.setUint32(0x30, 0x801ffff0, true);
  'Sony Computer Entertainment Inc. for North America area'.split('').forEach((c, i) => { r[0x4c + i] = c.charCodeAt(0); });
  d.setUint32(0x800, 0x08004000, true);
  return r;
}

// ---------- 1. ambiente ----------
function ambiente() {
  const caps = (k) => { try { return (RTCRtpSender.getCapabilities(k) || { codecs: [] }).codecs.map((c) => c.mimeType); } catch { return null; } };
  const video = caps('video');
  return {
    crossOriginIsolated: self.crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer === 'function',
    wasmSimd: WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])),
    gamepadApi: typeof navigator.getGamepads === 'function',
    audioWorklet: typeof AudioWorkletNode === 'function',
    offscreenCanvas: typeof OffscreenCanvas === 'function',
    webrtc: typeof RTCPeerConnection === 'function',
    h264: video ? video.includes('video/H264') : null,
    codecsVideo: video,
    webgl2: !!document.createElement('canvas').getContext('webgl2'),
  };
}

// ---------- 2. núcleos num Worker ----------
function rodarNucleo(cfg) {
  return new Promise((ok) => {
    const w = new Worker('worker.js');
    const t = setTimeout(() => { w.terminate(); ok({ nucleo: cfg.nucleo, erro: 'demorou demais' }); }, 60000);
    w.onmessage = ({ data }) => { clearTimeout(t); w.terminate(); ok(data); };
    w.onerror = (e) => { clearTimeout(t); w.terminate(); ok({ nucleo: cfg.nucleo, erro: e.message || 'erro no Worker' }); };
    w.postMessage({ url: 'nucleos/' + cfg.nucleo + '.js', segundos: 4, ...cfg });
  });
}

// ---------- 3. WebGL2 com um filtro tipo TV ----------
function webgl() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 896; document.body.appendChild(c);
  const gl = c.getContext('webgl2'); if (!gl) return { erro: 'sem WebGL2' };
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; out vec2 uv; void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0,1); }'));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; in vec2 uv; uniform sampler2D t; out vec4 cor;
vec3 lin(vec3 c){ return pow(c, vec3(2.4)); }
void main(){
  vec2 px = uv*vec2(256.0,224.0); vec3 s = vec3(0.0); float w = 0.0;
  for (int dy=-2; dy<=2; dy++) for (int dx=-1; dx<=1; dx++) {
    vec2 q = (floor(px)+vec2(dx,dy)+0.5)/vec2(256.0,224.0); float d = length(px-floor(px)-0.5-vec2(dx,dy));
    float k = exp(-2.0*d*d); s += lin(texture(t,q).rgb)*k; w += k; }
  vec3 c = s/w; float mascara = 0.85+0.15*sin(gl_FragCoord.x*2.094);
  cor = vec4(pow(c*mascara*1.1, vec3(1.0/2.2)), 1.0); }`));
  gl.linkProgram(p); gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 224, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const px = new Uint8Array(256 * 224 * 4);
  const t0 = performance.now(); const N = 200;
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < px.length; k += 4) px[k] = (k + i) & 255;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 224, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish();
  }
  const r = { msPorQuadro: +((performance.now() - t0) / N).toFixed(2), renderizador: gl.getParameter(gl.RENDERER) };
  c.remove(); return r;
}

// ---------- 4. som por AudioWorklet alimentado por SharedArrayBuffer ----------
async function som() {
  if (typeof AudioWorkletNode !== 'function') return { erro: 'sem AudioWorklet' };
  if (typeof SharedArrayBuffer !== 'function') return { erro: 'sem SharedArrayBuffer' };
  const ctx = new AudioContext({ sampleRate: 48000 });
  try { await ctx.resume(); } catch { /* sem gesto do usuário: o estado aparece no resultado */ }
  const codigo = `class P extends AudioWorkletProcessor {
    constructor(o){ super(); const s=o.processorOptions.sab; this.c=new Int32Array(s,0,4); this.b=new Float32Array(s,16); this.f=0; }
    process(_,saidas){ const o=saidas[0][0], N=this.b.length; let r=Atomics.load(this.c,0); const w=Atomics.load(this.c,1);
      for(let i=0;i<o.length;i++){ if(r===w){ o[i]=0; this.f++; } else { o[i]=this.b[r]; r=(r+1)%N; } }
      Atomics.store(this.c,0,r); Atomics.store(this.c,2,this.f); return true; } }
    registerProcessor('kof', P);`;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' })));
  const N = 48000, sab = new SharedArrayBuffer(16 + N * 4), c = new Int32Array(sab, 0, 4), b = new Float32Array(sab, 16);
  const no = new AudioWorkletNode(ctx, 'kof', { processorOptions: { sab } });
  const ganho = ctx.createGain(); ganho.gain.value = 0; no.connect(ganho).connect(ctx.destination);
  let fase = 0;
  const encher = () => {   // mantém ~60 ms no anel, como o núcleo faria
    let w = Atomics.load(c, 1); const r = Atomics.load(c, 0);
    const cheio = (w - r + N) % N;
    for (let i = cheio; i < 2880; i++) { b[w] = Math.sin(fase += 0.0576) * 0.2; w = (w + 1) % N; }
    Atomics.store(c, 1, w);
  };
  const t = setInterval(encher, 8);
  await new Promise((ok) => setTimeout(ok, 600));
  const faltaInicio = Atomics.load(c, 2);
  await new Promise((ok) => setTimeout(ok, 3000));
  clearInterval(t);
  const r = { estado: ctx.state, taxa: ctx.sampleRate, latenciaBaseMs: +(ctx.baseLatency * 1000).toFixed(1),
    latenciaSaidaMs: ctx.outputLatency ? +(ctx.outputLatency * 1000).toFixed(1) : null, amostrasFaltando3s: Atomics.load(c, 2) - faltaInicio };
  await ctx.close(); return r;
}

// ---------- 5. WebRTC (vídeo H.264 + canal de dados), sem rede: dois pares na mesma página ----------
async function webrtc() {
  if (typeof RTCPeerConnection !== 'function') return { erro: 'sem RTCPeerConnection' };
  const a = new RTCPeerConnection(), z = new RTCPeerConnection();
  a.onicecandidate = (e) => e.candidate && z.addIceCandidate(e.candidate);
  z.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 224; const g = cv.getContext('2d');
  let quadro = 0; const pintar = setInterval(() => { g.fillStyle = `hsl(${quadro++ * 7 % 360},80%,50%)`; g.fillRect(0, 0, 256, 224); }, 16);
  const trilha = cv.captureStream(60).getVideoTracks()[0];
  const tx = a.addTransceiver(trilha, { direction: 'sendonly' });
  try {
    const h = (RTCRtpSender.getCapabilities('video') || { codecs: [] }).codecs.filter((x) => x.mimeType === 'video/H264');
    if (h.length && tx.setCodecPreferences) tx.setCodecPreferences(h);
  } catch { /* sem preferência de codec: o resultado diz qual foi usado */ }
  const canal = a.createDataChannel('botoes', { ordered: false, maxRetransmits: 0 });
  const eco = new Promise((ok) => { z.ondatachannel = ({ channel }) => { channel.onmessage = (m) => channel.send(m.data); }; canal.onmessage = (m) => ok(performance.now() - +m.data); });
  await a.setLocalDescription(await a.createOffer()); await z.setRemoteDescription(a.localDescription);
  await z.setLocalDescription(await z.createAnswer()); await a.setRemoteDescription(z.localDescription);
  await new Promise((ok) => { const v = () => (canal.readyState === 'open' ? ok() : setTimeout(v, 50)); v(); setTimeout(ok, 8000); });
  let rtt = null;
  if (canal.readyState === 'open') { canal.send(String(performance.now())); rtt = await Promise.race([eco, new Promise((ok) => setTimeout(() => ok(null), 3000))]); }
  await new Promise((ok) => setTimeout(ok, 2500));
  const r = { canalDeDados: canal.readyState, ecoMs: rtt && +rtt.toFixed(2), quadrosDecodificados: 0, codec: null };
  (await z.getStats()).forEach((s) => {
    if (s.type === 'inbound-rtp' && s.kind === 'video') { r.quadrosDecodificados = s.framesDecoded || 0; r.codecId = s.codecId; }
  });
  (await z.getStats()).forEach((s) => { if (s.type === 'codec' && s.id === r.codecId) r.codec = s.mimeType; });
  delete r.codecId; clearInterval(pintar); a.close(); z.close(); return r;
}

// ---------- ponte com o backend (React -> Rust -> React no app de verdade) ----------
async function ponte() {
  const t0 = performance.now();
  try {
    if (window.__TAURI_INTERNALS__) {
      const info = await window.__TAURI_INTERNALS__.invoke('app_info');
      let erro = null; try { await window.__TAURI_INTERNALS__.invoke('falhar'); } catch (e) { erro = e; }
      return { casca: 'tauri', info, erroTratado: erro, ms: +(performance.now() - t0).toFixed(1) };
    }
    const token = new URLSearchParams(location.search).get('t');
    if (token) {
      const chamar = async (cmd, tk) => { const r = await fetch('/api/' + cmd, { method: 'POST', headers: { 'X-Kof-Token': tk } }); return { status: r.status, corpo: await r.json() }; };
      const info = await chamar('app.info', token);
      const semToken = await chamar('app.info', 'errado');
      const erro = await chamar('falhar', token);
      return { casca: 'local', info, semToken, erroTratado: erro, ms: +(performance.now() - t0).toFixed(1) };
    }
    return { casca: 'nenhuma (página aberta solta)' };
  } catch (e) { return { erro: String(e && e.message || e) }; }
}

(async () => {
  etapa('ponte com o backend'); R.ponte = await ponte(); mostrar();
  etapa('ambiente'); R.ambiente = ambiente();
  try { const h = (await fetch(location.href)).headers; R.ambiente.cabecalhos = { coop: h.get('cross-origin-opener-policy'), coep: h.get('cross-origin-embedder-policy') }; } catch (e) { R.ambiente.cabecalhos = String(e); }
  mostrar();
  R.nucleos = [];
  for (const cfg of [
    { nucleo: 'snes9x', rom: romSnes(), arquivo: 'rom.sfc' },
    { nucleo: 'genplus', rom: romMd(), arquivo: 'rom.md' },
    { nucleo: 'fceumm', rom: romNes(), arquivo: 'rom.nes' },
    { nucleo: 'pcsx', rom: exePs1(), caminho: '/bancada.exe' },
  ]) { etapa('núcleo ' + cfg.nucleo); R.nucleos.push(await rodarNucleo(cfg)); mostrar(); }
  etapa('WebGL2'); try { R.webgl = webgl(); } catch (e) { R.webgl = { erro: String(e.message || e) }; } mostrar();
  etapa('som'); try { R.som = await som(); } catch (e) { R.som = { erro: String(e.message || e) }; } mostrar();
  etapa('WebRTC'); try { R.webrtc = await webrtc(); } catch (e) { R.webrtc = { erro: String(e.message || e) }; } mostrar();
  etapa('pronto'); window.__resultado = R;
  if (window.__TAURI_INTERNALS__) window.__TAURI_INTERNALS__.invoke('relatorio', { json: JSON.stringify(R) }).catch(() => {});
})();
