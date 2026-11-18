// Mede o ritmo dos quadros do jeito que o olho vê: a cada requestAnimationFrame, o quadro que está na tela é novo,
// repetido ou houve quadro pulado? Roda no app novo (build do apps/desktop, servido aqui) e no antigo
// (kofstation-old/publicado/KOFstation.html aberto como página estática), com a mesma ROM gerada aqui (nunca ROM de
// verdade): um Game Boy que anda 1 pixel o fundo a cada quadro.
//
//   node tools/medir-ritmo.mjs                      # os dois, 10 s cada (precisa de `pnpm build` e do clone do antigo)
//   node tools/medir-ritmo.mjs --so novo|antigo --segundos 20 --antigo /caminho/kofstation-old --cpu 4 --json
//
// Saída por app: quadros novos/repetidos/pulados por minuto e p50/p95/p99 do intervalo entre quadros novos (ms).
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, p) => {
  const i = process.argv.indexOf('--' + n);
  return i < 0 ? p : (process.argv[i + 1] ?? p);
};
const tem = (n) => process.argv.includes('--' + n);
const segundos = Number(arg('segundos', 10));
const so = arg('so', 'os dois');
const cpu = Number(arg('cpu', 1));
const pastaAntigo = resolve(arg('antigo', join(raiz, '..', 'kofstation-old')));

const require = createRequire(join(raiz, 'apps/desktop/package.json'));
const { chromium } = require('@playwright/test');

/** Game Boy que liga o LCD com um tile listrado e anda o fundo 1 pixel por quadro (espera o início do VBlank). */
function romGbAndando() {
  const r = Buffer.alloc(0x8000);
  r.set([0x00, 0xc3, 0x50, 0x01], 0x100);
  r.write('KOFRITMO', 0x134, 'latin1');
  r.set(
    [
      0x3e,
      0x00,
      0xe0,
      0x40, // LCD desligado
      0x21,
      0x00,
      0x80,
      0x06,
      0x10, // hl = $8000; b = 16
      0x3e,
      0xf0,
      0x22,
      0x05,
      0x20,
      0xfa, // tile 0 listrado
      0x3e,
      0xe4,
      0xe0,
      0x47, // paleta
      0x3e,
      0x91,
      0xe0,
      0x40, // LCD ligado
      0xf0,
      0x44,
      0xfe,
      0x90,
      0x20,
      0xfa, // espera LY = 144
      0xf0,
      0x43,
      0x3c,
      0xe0,
      0x43, // SCX++
      0xf0,
      0x44,
      0xfe,
      0x90,
      0x28,
      0xfa, // espera sair do 144
      0x18,
      0xed, // volta
    ],
    0x150,
  );
  let x = 0;
  for (let i = 0x134; i <= 0x14c; i++) x = (x - (r[i] ?? 0) - 1) & 0xff;
  r[0x14d] = x;
  return r;
}

/** Roda dentro da página: um rAF por vsync; anota o instante e a assinatura (versão miúda) do canvas do jogo. */
function instalarSonda({ seletor, segundos }) {
  const w = document.createElement('canvas');
  w.width = 64;
  w.height = 4;
  const g = w.getContext('2d', { willReadFrequently: true });
  const amostras = [];
  const fim = performance.now() + segundos * 1000;
  window.__ritmo = new Promise((ok) => {
    const laco = (t) => {
      if (t > fim) return ok(amostras);
      requestAnimationFrame(laco);
      const c = document.querySelector(seletor);
      if (!c || !g) return;
      g.drawImage(c, 0, 0, 64, 4);
      const d = g.getImageData(0, 0, 64, 4).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619);
      amostras.push([t, h >>> 0]);
    };
    requestAnimationFrame(laco);
  });
}

const percentil = (v, p) => {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))];
};

/** [t, assinatura][] → números. O ciclo (8 imagens) é aprendido: o sucessor mais comum de cada assinatura. */
function analisar(amostras) {
  const util = amostras.slice(Math.min(30, amostras.length >> 2)); // joga fora o começo (carregando)
  // assinaturas que quase não aparecem são ruído (um quadro de transição do desenho): não entram na conta
  const conta = new Map();
  for (const a of util) conta.set(a[1], (conta.get(a[1]) ?? 0) + 1);
  const firmes = util.filter((a) => (conta.get(a[1]) ?? 0) >= util.length / 40);
  const novos = []; // [t, assinatura]
  let repetidos = 0;
  for (let i = 1; i < firmes.length; i++) {
    if (firmes[i][1] === firmes[i - 1][1]) repetidos++;
    else novos.push(firmes[i]);
  }
  if (process.env.RITMO_DEBUG) {
    const id = new Map();
    console.error(
      util
        .slice(0, 120)
        .map((a) => (id.has(a[1]) ? id.get(a[1]) : (id.set(a[1], id.size), id.size - 1)))
        .join(''),
    );
  }
  const sucessor = new Map();
  for (let i = 1; i < novos.length; i++) {
    const m = sucessor.get(novos[i - 1][1]) ?? new Map();
    m.set(novos[i][1], (m.get(novos[i][1]) ?? 0) + 1);
    sucessor.set(novos[i - 1][1], m);
  }
  const mais = new Map([...sucessor].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1])[0][0]]));
  let pulados = 0;
  const intervalos = [];
  for (let i = 1; i < novos.length; i++) {
    intervalos.push(novos[i][0] - novos[i - 1][0]);
    let a = novos[i - 1][1];
    for (let k = 0; k < 8 && a !== novos[i][1]; k++) {
      a = mais.get(a) ?? a;
      if (a !== novos[i][1]) pulados++;
      else break;
    }
  }
  const dur = util.length > 1 ? (util[util.length - 1][0] - util[0][0]) / 60000 : 1; // minutos
  return {
    ticks: util.length,
    ciclo: mais.size,
    novosPorMin: Math.round(novos.length / dur),
    repetidosPorMin: Math.round(repetidos / dur),
    puladosPorMin: Math.round(pulados / dur),
    p50: +percentil(intervalos, 50).toFixed(2),
    p95: +percentil(intervalos, 95).toFixed(2),
    p99: +percentil(intervalos, 99).toFixed(2),
  };
}

async function medir(browser, url, { seletor, aoAbrir, nome }) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(500);
  await page.setInputFiles('#arquivo', {
    name: 'Ritmo.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbAndando(),
  });
  await aoAbrir(page);
  if (cpu > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.waitForTimeout(2500); // jogo andando, som enchendo o anel
  await page.evaluate(instalarSonda, { seletor, segundos });
  const amostras = await page.evaluate(() => window.__ritmo);
  // faltas de som do medidor do app novo, quando existe (o painel F3 mostra)
  let extra = {};
  try {
    extra = await page.evaluate(() => {
      const el = document.querySelector('#desempenho');
      return el ? { painel: el.textContent } : {};
    });
  } catch {
    // sem painel: segue só com o ritmo
  }
  await ctx.close();
  if (erros.length) console.error(`[${nome}] erros na página:`, erros.slice(0, 3));
  return { nome, ...analisar(amostras), ...extra };
}

/** Servidor estático mínimo (o preview do Vite precisa dos cabeçalhos de isolamento; este também manda). */
function servirDist(pasta) {
  const tipos = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  const srv = createServer((q, s) => {
    const caminho = decodeURIComponent((q.url ?? '/').split('?')[0]);
    let f = join(pasta, caminho === '/' ? 'index.html' : caminho);
    if (!f.startsWith(pasta) || !existsSync(f)) f = join(pasta, 'index.html');
    const ext = f.slice(f.lastIndexOf('.'));
    s.writeHead(200, {
      'content-type': tipos[ext] ?? 'application/octet-stream',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-embedder-policy': 'require-corp',
    });
    s.end(readFileSync(f));
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

const resultados = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
try {
  if (so === 'os dois' || so === 'novo') {
    const dist = join(raiz, 'apps/desktop/dist');
    if (!existsSync(dist)) throw new Error('faltou o build do app novo: rode `pnpm build` antes');
    const srv = await servirDist(dist);
    const url = `http://127.0.0.1:${srv.address().port}/`;
    resultados.push(
      await medir(browser, url, {
        nome: 'novo',
        seletor: '#tela',
        aoAbrir: async (p) => {
          await p.waitForFunction(() => document.querySelector('#st-jogo')?.textContent === 'Ritmo', null, {
            timeout: 15000,
          });
        },
      }),
    );
    srv.close();
  }
  if (so === 'os dois' || so === 'antigo') {
    const html = join(pastaAntigo, 'publicado', 'KOFstation.html');
    if (!existsSync(html)) throw new Error(`não achei o app antigo em ${html} (use --antigo <pasta do clone>)`);
    resultados.push(
      await medir(browser, pathToFileURL(html).href, {
        nome: 'antigo',
        seletor: '#tela',
        aoAbrir: async (p) => {
          await p.waitForTimeout(1500);
        },
      }),
    );
  }
} finally {
  await browser.close();
}
if (tem('json')) console.log(JSON.stringify(resultados, null, 2));
else {
  console.log(`ritmo na tela · ${segundos} s por app · CPU ${cpu}x`);
  console.table(resultados.map((r) => ({ ...r, painel: undefined })));
}
