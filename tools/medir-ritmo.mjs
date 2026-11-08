// Ritmo dos quadros "do jeito que o olho vê" (tarefa A): abre o app novo e o antigo no Chromium com a mesma ROM gerada
// (romGbContador: o Game Boy troca o tom da tela inteira a cada quadro, então o tom diz o número do quadro mod 4) e, em
// cada requestAnimationFrame, anota o quadro que foi pra tela: novo, repetido (nada novo neste vsync) ou pulado (o
// número andou 2 ou 3). A imagem é lida no envio pra placa de vídeo (texSubImage2D/putImageData), que nos dois apps só
// acontece quando chega quadro novo: é o que o vsync seguinte mostra.
// Uso:
//   pnpm build && node tools/medir-ritmo.mjs [--segundos 10] [--lento 4] [--antigo ../kofstation-old] [--so novo|antigo]
//                                            [--json]
// O antigo é servido como página estática da pasta publicado/ do clone (só leitura).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { romGbContador } from '../apps/desktop/e2e/roms.ts';

const RAIZ = join(import.meta.dirname, '..');
const { chromium } = createRequire(join(RAIZ, 'apps/desktop/package.json'))('@playwright/test');
const arg = (n, p) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : p);
const SEGUNDOS = Number(arg('--segundos', '10'));
const ANTIGO = resolve(arg('--antigo', join(RAIZ, '../kofstation-old')));
const SO = arg('--so', '');
const JSON_SAIDA = process.argv.includes('--json');
/** --lento 4: a CPU da página 4x mais lenta (Emulation.setCPUThrottlingRate; ≈ celular médio, como no antigo) */
const LENTO = Number(arg('--lento', '1'));
const FPS_GB = 4194304 / 70224; // 59,7275

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** Servidor estático mínimo (o novo precisa do isolamento: SharedArrayBuffer do som). */
function servir(pasta, isolado, inicial) {
  const s = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/' + inicial;
    const arq = normalize(join(pasta, p));
    const ok = arq.startsWith(pasta) && existsSync(arq) && statSync(arq).isFile();
    const final = ok ? arq : join(pasta, inicial);
    const h = { 'Content-Type': TIPOS[extname(final)] ?? 'application/octet-stream' };
    if (isolado)
      Object.assign(h, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    res.writeHead(200, h);
    createReadStream(final).pipe(res);
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok({ s, url: `http://127.0.0.1:${s.address().port}/` })));
}

/** Roda na página antes do app: anota o tom do quadro enviado em cada vsync e as faltas de som. */
function espiao() {
  const r = (window.__ritmo = { vsyncs: [], faltas: 0, taxa: 0, medir: false, fila: [] });
  let atual = null;
  const laco = (t) => {
    requestAnimationFrame(laco); // registrado antes do app: roda primeiro em cada vsync, o envio do app cai neste
    if (!r.medir) return (atual = null);
    atual = { t, v: -1 };
    r.vsyncs.push(atual);
  };
  requestAnimationFrame(laco);
  const anotar = (w, h, d) => {
    if (!atual || !d || w < 100 || h < 100) return;
    const u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    const i = ((h >> 1) * w + (w >> 2)) * 4; // um quarto da largura, no meio da altura
    atual.v = u8[i] * 299 + u8[i + 1] * 587 + u8[i + 2] * 114;
  };
  for (const P of [globalThis.WebGLRenderingContext?.prototype, globalThis.WebGL2RenderingContext?.prototype]) {
    if (!P) continue;
    const orig = P.texSubImage2D;
    P.texSubImage2D = function (...a) {
      if (a.length === 9 && ArrayBuffer.isView(a[8])) anotar(a[4], a[5], a[8]);
      return orig.apply(this, a);
    };
  }
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (img, ...a) {
    if (this.canvas.id === 'tela') anotar(img.width, img.height, img.data);
    return put.call(this, img, ...a);
  };
  // faltas de som: o novo manda pelo Worker (medicao.faltasDeSom, em amostras); o antigo, KOFnes.desempenho()
  const W = window.Worker;
  window.Worker = class extends W {
    constructor(...a) {
      super(...a);
      this.addEventListener('message', (e) => {
        if (!r.medir || e.data?.tipo !== 'medicao') return;
        r.faltas += e.data.m.faltasDeSom;
        r.fila.push([e.data.m.somNaFilaMs, e.data.m.faltasDeSom, e.data.m.fps]);
      });
    }
  };
  const AC = window.AudioContext;
  window.AudioContext = class extends AC {
    constructor(...a) {
      super(...a);
      r.taxa = this.sampleRate;
    }
  };
  let visto = null;
  setInterval(() => {
    const d = window.KOFnes?.desempenho?.();
    if (d && d !== visto) {
      visto = d;
      if (r.medir) r.faltas += d.faltas;
    }
  }, 200);
}

/** Tons em ordem (claro → escuro) = número do quadro mod 4. */
function analisar(vsyncs) {
  const tons = [...new Set(vsyncs.filter((x) => x.v >= 0).map((x) => x.v))].sort((a, b) => b - a);
  if (tons.length !== 4) throw new Error(`esperava 4 tons na tela, vi ${tons.length} (${tons.join(', ')})`);
  let novos = 0;
  let repetidos = 0;
  let pulados = 0;
  let antes = -1;
  let tNovo = -1;
  const intervalos = [];
  for (const { t, v } of vsyncs) {
    const q = v < 0 ? -1 : tons.indexOf(v);
    if (q < 0 || q === antes) {
      if (antes >= 0) repetidos++;
      continue;
    }
    if (antes >= 0) {
      const passo = (q - antes + 4) % 4;
      novos++;
      pulados += passo - 1;
      if (tNovo >= 0) intervalos.push(t - tNovo);
    }
    antes = q;
    tNovo = t;
  }
  const dur = (vsyncs.at(-1).t - vsyncs[0].t) / 1000;
  const vsyncMs = (vsyncs.at(-1).t - vsyncs[0].t) / (vsyncs.length - 1);
  intervalos.sort((a, b) => a - b);
  const p = (x) => +(intervalos[Math.min(intervalos.length - 1, Math.floor(x * intervalos.length))] ?? 0).toFixed(2);
  // o certo: o GB tem 59,73 quadros/s e a tela ~60: alguns repetidos por minuto são inevitáveis (o "esperado")
  const esperado = Math.max(0, 60 * (1000 / vsyncMs - FPS_GB));
  return {
    segundos: +dur.toFixed(1),
    vsyncHz: +(1000 / vsyncMs).toFixed(2),
    quadrosNovosPorSeg: +(novos / dur).toFixed(2),
    repetidosPorMin: Math.round((repetidos / dur) * 60),
    puladosPorMin: Math.round((pulados / dur) * 60),
    inevitaveisSemTravaPorMin: Math.round(esperado),
    p50: p(0.5),
    p95: p(0.95),
    p99: p(0.99),
  };
}

async function medir(nome, url, abrir) {
  const b = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });
  try {
    const page = await b.newPage({ viewport: { width: 1100, height: 700 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.addInitScript(espiao);
    if (LENTO > 1)
      await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: LENTO });
    await page.goto(url);
    await abrir(page);
    await page.keyboard.press('Shift'); // um gesto: o antigo só liga o som depois de uma tecla ou clique
    // espera o jogo andar (o tom mudando) e mais 2 s pra assentar
    await page.waitForFunction(
      () => window.__ritmo && (window.__ritmo.medir = true) && window.__ritmo.vsyncs.some((x) => x.v >= 0),
      null,
      { timeout: 20_000 },
    );
    await page.waitForTimeout(2000);
    await page.evaluate(() => Object.assign(window.__ritmo, { vsyncs: [], faltas: 0 }));
    await page.waitForTimeout(SEGUNDOS * 1000);
    const { vsyncs, faltas, taxa, fila } = await page.evaluate(() => {
      const r = window.__ritmo;
      r.medir = false;
      return { vsyncs: r.vsyncs, faltas: r.faltas, taxa: r.taxa, fila: r.fila };
    });
    const res = analisar(vsyncs);
    if (process.env.KOF_RITMO_FILA)
      console.error(nome, 'som na fila (ms), faltas (amostras), fps por segundo:', JSON.stringify(fila));
    const faltasMs = taxa ? +((faltas * 1000) / taxa).toFixed(1) : null;
    return { app: nome, ...res, faltasDeSomMs: faltasMs, erros };
  } finally {
    await b.close();
  }
}

const rom = romGbContador();
const resultados = [];

if (SO !== 'antigo') {
  const dist = join(RAIZ, 'apps/desktop/dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error('falta o build do app novo: rode `pnpm build` antes');
  const { s, url } = await servir(dist, true, 'index.html');
  try {
    resultados.push(
      await medir('novo', url, async (page) => {
        await page.setInputFiles('#arquivo', { name: 'Ritmo.gb', mimeType: 'application/octet-stream', buffer: rom });
        await page.waitForSelector('#tela');
      }),
    );
  } finally {
    s.close();
  }
}

if (SO !== 'novo') {
  const pasta = join(ANTIGO, 'publicado');
  if (!existsSync(join(pasta, 'KOFstation.html')))
    throw new Error(`não achei o antigo em ${pasta} (git clone https://github.com/Marcelao98/kofstation-old)`);
  const { s, url } = await servir(pasta, false, 'KOFstation.html');
  try {
    resultados.push(
      await medir('antigo', url, async (page) => {
        await page.waitForFunction(() => !!window.KOFnes);
        await page.setInputFiles('#arquivo', { name: 'Ritmo.gb', mimeType: 'application/octet-stream', buffer: rom });
      }),
    );
  } finally {
    s.close();
  }
}

if (JSON_SAIDA) console.log(JSON.stringify(resultados, null, 1));
else {
  console.log(
    `Ritmo dos quadros na tela (Game Boy, ${SEGUNDOS} s${LENTO > 1 ? `, CPU ${LENTO}x mais lenta` : ''}; certo = 16,74 ms entre quadros novos)`,
  );
  console.table(Object.fromEntries(resultados.map(({ app, erros, ...r }) => [app, { ...r, erros: erros.length }])));
  for (const r of resultados) for (const e of r.erros) console.log(`  erro na página (${r.app}): ${e}`);
}
