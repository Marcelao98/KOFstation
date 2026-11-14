// Paridade da ABERTURA no celular (M14): manda os mesmos arquivos (zip com ISO, zip com .cue+.bin, .bin de CD, .iso, .z64,
// zip com .z64, ROM de GB...) pra página do APK antigo e pra do novo, com a mesma casca falsa (KOFnesApk com PS1 e N64 nativos),
// e compara a decisão de cada uma: qual núcleo nativo abriu (ps1Abrir/n64Abrir, com o nome) ou nenhum, e quantos bytes do
// arquivo a página leu (o CD não pode passar pela página). Uso:
//   node tools/paridade-abrir.mjs <url do antigo> <url do novo> <pasta com os arquivos>
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(new URL('../apps/desktop/', import.meta.url).pathname);
const { chromium } = require('@playwright/test');
const [urlAntigo, urlNovo, pasta] = process.argv.slice(2);
const b = await chromium.launch();

async function abrir(url, arquivo) {
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const g = globalThis;
    g.__calls = [];
    // conta quanto do arquivo a página leu (Blob.slice/arrayBuffer)
    g.__lidos = 0;
    const ab = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = function () {
      g.__lidos += this.size;
      return ab.call(this);
    };
    g.KOFnesApk = new Proxy(
      {},
      {
        get: (_, n) => {
          if (typeof n !== 'string') return undefined;
          if (n === 'ps1Nativo' || n === 'n64Nativo') return () => true;
          if (n === 'pastaNome') return () => '';
          if (n === 'versao') return () => '0';
          if (n === 'savesNativos') return () => '[]';
          if (n === 'ps1Abrir' || n === 'n64Abrir')
            return (nome) => {
              g.__calls.push(n + ':' + nome);
              setTimeout(
                () => g['__' + n.slice(0, 3) + 'Pronto']?.({ principal: nome, largura: 320, altura: 240, fps: 59.94 }),
                100,
              );
            };
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
  const r = await page.evaluate(() => ({
    abriu: globalThis.__calls.find((c) => /Abrir:/.test(c)) ?? 'nenhum nativo',
    lidos: globalThis.__lidos,
  }));
  await ctx.close();
  return r;
}

let diferentes = 0;
for (const f of readdirSync(pasta).sort()) {
  const a = await abrir(urlAntigo, f),
    n = await abrir(urlNovo, f);
  const igual = a.abriu === n.abriu;
  if (!igual) diferentes++;
  console.log(
    `${igual ? 'IGUAL    ' : 'DIFERENTE'} ${f.padEnd(24)} antigo: ${a.abriu.padEnd(32)} novo: ${n.abriu.padEnd(32)} (lidos: antigo ${a.lidos} B · novo ${n.lidos} B)`,
  );
}
await b.close();
console.log(diferentes ? `${diferentes} DIFERENÇA(S)` : 'TUDO IGUAL');
process.exit(diferentes ? 1 : 0);
