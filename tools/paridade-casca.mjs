// Paridade de desempenho da casca do APK (M14): mede, com a MESMA casca falsa de PS1/N64 (KOFnesApk), o que a página do APK
// ANTIGO e a do NOVO fazem ao abrir um jogo nativo e depois jogando: chamadas à casca por nome (Pad/Area/Volume...), tempo de
// tarefa e de script da página, tarefas longas (>50 ms). Uso: (servir o antigo: publicado/android/KOFnes-android.html como
// index.html + nucleos/ numa porta; o novo: `pnpm --filter @kof/desktop exec vite preview --port 4191`)
//   node tools/paridade-casca.mjs ANTIGO http://127.0.0.1:4190/index.html ps1
//   node tools/paridade-casca.mjs NOVO "http://127.0.0.1:4191/?celular=1" ps1
// Mede, com a MESMA casca falsa de PS1/N64, o que a página do APK antigo e a do novo fazem na hora de abrir um jogo nativo e depois jogando.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/desktop/', import.meta.url).pathname);
const { chromium } = require('@playwright/test');
const alvo = process.argv[2],
  url = process.argv[3],
  console_ = process.argv[4] || 'ps1';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERRO DA PÁGINA:', e.message.slice(0, 120)));
await page.addInitScript(() => {
  const g = globalThis;
  g.__t0 = performance.now();
  g.__calls = [];
  g.__long = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) g.__long.push([Math.round(e.startTime), Math.round(e.duration)]);
  }).observe({ entryTypes: ['longtask'] });
  const reg = (n) => g.__calls.push([n, Math.round(performance.now())]);
  const apk = new Proxy(
    {},
    {
      get: (_, n) => {
        if (typeof n !== 'string') return undefined;
        if (n === 'ps1Nativo' || n === 'n64Nativo') return () => true;
        if (n === 'pastaNome') return () => '';
        if (n === 'versao') return () => '0';
        if (n === 'ps1Estado' || n === 'n64Estado') return () => btoa('x'.repeat(100));
        if (n === 'savesNativos') return () => '[]';
        if (n === 'ps1Abrir' || n === 'n64Abrir')
          return (nome) => {
            reg(n);
            setTimeout(
              () => g['__' + n.slice(0, 3) + 'Pronto']?.({ principal: nome, largura: 320, altura: 240, fps: 59.94 }),
              300,
            );
          };
        return () => {
          reg(n);
          return undefined;
        };
      },
      has: () => true,
    },
  );
  g.KOFnesApk = apk;
});
await page.goto(url);
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const m0 = (await cdp.send('Performance.getMetrics')).metrics;
const ext = console_ === 'ps1' ? 'cue' : 'z64';
const input = page.locator('#arquivo');
await input.setInputFiles({
  name: 'Meu Jogo.' + ext,
  mimeType: 'application/octet-stream',
  buffer: Buffer.from(ext === 'cue' ? 'FILE "a.bin" BINARY\n' : '\x80\x37\x12\x40'.repeat(1024)),
});
await page.waitForTimeout(8000);
const m1 = (await cdp.send('Performance.getMetrics')).metrics;
const val = (m, n) => m.find((x) => x.name === n)?.value ?? 0;
const calls = await page.evaluate(() => globalThis.__calls);
const longs = await page.evaluate(() => globalThis.__long);
const porNome = {};
for (const [n] of calls) porNome[n] = (porNome[n] || 0) + 1;
const abriu = calls.find(([n]) => /Abrir$/.test(n));
const depois = longs.filter(([t]) => abriu && t >= abriu[1] - 100);
console.log(
  JSON.stringify(
    {
      alvo,
      console: console_,
      chamadas_em_8s: porNome,
      tarefa_ms_total: Math.round((val(m1, 'TaskDuration') - val(m0, 'TaskDuration')) * 1000),
      script_ms_total: Math.round((val(m1, 'ScriptDuration') - val(m0, 'ScriptDuration')) * 1000),
      longtasks_apos_abrir: depois.length,
      longtask_pior_ms: depois.reduce((a, [, d]) => Math.max(a, d), 0),
      longtask_soma_ms: depois.reduce((a, [, d]) => a + d, 0),
    },
    null,
    1,
  ),
);
await b.close();
