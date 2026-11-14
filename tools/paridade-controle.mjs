// Paridade do CONTROLE DE TOQUE no celular (M14): abre o mesmo jogo na página do APK antigo e na do novo (mesma casca falsa com
// PS1/N64 nativos), aperta cada botão do controle de toque e compara: o que chega na casca (ps1Pad/n64Pad: máscara e eixos),
// o rótulo de cada botão, as marcas do <body> (data-sis, analogico, so-ab) e quais botões aparecem. Jogos em WebAssembly: compara
// rótulos/marcas/botões visíveis. Uso: node tools/paridade-controle.mjs <url antigo> <url novo> <pasta com os arquivos>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(new URL('../apps/desktop/', import.meta.url).pathname);
const { chromium } = require('playwright');
const [urlAntigo, urlNovo, pasta] = process.argv.slice(2);
const JOGOS = ['CD com iso.zip', 'Mario.z64', 'Jogo GB.gb', 'Vermelho.md'];
const BOTOES = ['A', 'B', 'X', 'Y', 'L', 'R', 'L2', 'R2', 'Start', 'Select'];
const b = await chromium.launch();

async function medir(url, arquivo) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const g = globalThis;
    g.__pads = [];
    g.KOFnesApk = new Proxy(
      {},
      {
        get: (_, n) => {
          if (typeof n !== 'string') return undefined;
          if (n === 'ps1Nativo' || n === 'n64Nativo') return () => true;
          if (n === 'pastaNome') return () => '';
          if (n === 'versao') return () => '0';
          if (n === 'savesNativos') return () => '[]';
          if (n === 'ps1Pad' || n === 'n64Pad') return (m, e) => g.__pads.push([m, e]);
          if (n === 'ps1Abrir' || n === 'n64Abrir')
            return (nome) =>
              setTimeout(
                () => g['__' + n.slice(0, 3) + 'Pronto']?.({ principal: nome, largura: 320, altura: 240, fps: 59.94 }),
                50,
              );
          return () => undefined;
        },
      },
    );
  });
  await page.goto(url);
  await page.waitForTimeout(1200);
  await page
    .locator('#arquivo')
    .setInputFiles({ name: arquivo, mimeType: 'application/octet-stream', buffer: readFileSync(join(pasta, arquivo)) });
  await page.waitForTimeout(2500);
  // a pergunta do modo de jogo (se aparecer) fecha no Normal, nas duas
  await page.evaluate(() => document.querySelector('[data-modo="normal"]')?.click());
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const b = document.body;
    const rot = {};
    for (const e of document.querySelectorAll('#ctl [data-b]')) {
      const st = getComputedStyle(e);
      rot[e.dataset.b] =
        (st.display === 'none' || st.visibility === 'hidden' ? '(escondido) ' : '') + e.textContent.trim();
    }
    return {
      sis: b.dataset.sis ?? '',
      analogico: b.classList.contains('analogico'),
      soAb: b.classList.contains('so-ab'),
      rotulos: rot,
    };
  });
  // cada botão: o que chega na casca
  r.pads = {};
  for (const nome of [...BOTOES, 'cima', 'direita']) {
    const sel = nome === 'cima' || nome === 'direita' ? '#ctl [data-b="dpad"]' : `#ctl [data-b="${nome}"]`;
    const ok = await page.evaluate(
      ([s, n]) => {
        const el = document.querySelector(s);
        if (!el) return false;
        const q = el.getBoundingClientRect();
        const x = q.left + q.width / 2 + (n === 'direita' ? q.width * 0.4 : 0),
          y = q.top + q.height / 2 + (n === 'cima' ? -q.height * 0.4 : 0);
        globalThis.__pads.length = 0;
        el.dispatchEvent(
          new PointerEvent('pointerdown', { pointerId: 7, clientX: x, clientY: y, bubbles: true, cancelable: true }),
        );
        return true;
      },
      [sel, nome],
    );
    if (!ok) {
      r.pads[nome] = 'sem botão';
      continue;
    }
    await page.waitForTimeout(150);
    const p = await page.evaluate(() => globalThis.__pads.at(-1) ?? null);
    r.pads[nome] = p ? `máscara ${p[0]} eixos ${p[1]}` : 'nada chegou na casca';
    await page.evaluate(() =>
      document.querySelector('#ctl').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })),
    );
    await page.waitForTimeout(80);
  }
  await ctx.close();
  return r;
}

let dif = 0;
for (const j of JOGOS) {
  const a = await medir(urlAntigo, j),
    n = await medir(urlNovo, j);
  console.log(`\n=== ${j}`);
  for (const k of ['sis', 'analogico', 'soAb']) {
    const igual = String(a[k]) === String(n[k]);
    if (!igual) dif++;
    console.log(`${igual ? 'IGUAL    ' : 'DIFERENTE'} body.${k}: antigo ${a[k]} · novo ${n[k]}`);
  }
  for (const k of Object.keys(a.rotulos)) {
    const igual = a.rotulos[k] === n.rotulos[k];
    if (!igual) dif++;
    console.log(
      `${igual ? 'IGUAL    ' : 'DIFERENTE'} rótulo ${k.padEnd(6)} antigo "${a.rotulos[k]}" · novo "${n.rotulos[k]}"`,
    );
  }
  if (/zip|z64/.test(j))
    for (const k of Object.keys(a.pads)) {
      const igual = a.pads[k] === n.pads[k];
      if (!igual) dif++;
      console.log(
        `${igual ? 'IGUAL    ' : 'DIFERENTE'} botão ${k.padEnd(7)} antigo: ${a.pads[k]} · novo: ${n.pads[k]}`,
      );
    }
}
await b.close();
console.log(dif ? `\n${dif} DIFERENÇA(S)` : '\nTUDO IGUAL');
process.exit(dif ? 1 : 0);
