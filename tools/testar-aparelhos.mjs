// Ponta a ponta da tela 📡 Aparelhos (M13.2) com o app de verdade: o kofstation (serviço de rede dentro), a página no
// Chromium, e um "outro aparelho" (o kof-rede, com o mesmo protocolo do APK) que pareia digitando o código que a tela
// mostra, conecta e aparece 🟢 na lista. Grava um print.
// Uso: pnpm build && cargo build -p kof-app -p kof-net && node tools/testar-aparelhos.mjs [print.png]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');
const RAIZ = join(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'kof-aparelhos-'));
const procs = [];
const ok = (c, m) => {
  if (!c) throw new Error('FALHOU: ' + m);
  console.log('✓ ' + m);
};

const app = spawn(join(RAIZ, 'target/debug/kofstation'), ['--sem-navegador'], {
  env: { ...process.env, XDG_DATA_HOME: join(tmp, 'app') },
  stdio: ['ignore', 'pipe', 'inherit'],
});
procs.push(app);
let saida = '';
app.stdout.on('data', (d) => (saida += d));
const b = spawn(
  join(RAIZ, 'target/debug/kof-rede'),
  ['--pasta', join(tmp, 'b'), '--nome', 'Celular B', '--porta', '18660', '--udp', '18660', '--ws', '18654'],
  { stdio: 'ignore' },
);
procs.push(b);
const browser = await chromium.launch();
try {
  for (let i = 0; i < 100 && !/\?t=/.test(saida); i++) await new Promise((r) => setTimeout(r, 100));
  const url = saida.match(/http:\/\/127\.0\.0\.1:\d+\/\?t=[0-9a-f]+/)?.[0];
  ok(!!url, 'kofstation aberto');
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(url);
  await page.locator('#home [data-acao="aparelhos"]').first().click();
  await page.locator('#ap-com').waitFor({ state: 'visible', timeout: 15000 });
  ok(true, 'a tela Aparelhos ligou na rede do kofstation');
  await page.click('[data-acao="ap-parear"]');
  await page.locator('#ap-codigo').waitFor();
  const codigo = (await page.textContent('#ap-codigo')).replace(/\D/g, '');
  const porta = Number((await page.textContent('#ap-tempo')).match(/:(\d+)$/)[1]);
  ok(/^\d{6}$/.test(codigo), `código ${codigo} na porta ${porta}`);
  // o outro aparelho
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      const w = new WebSocket('ws://127.0.0.1:18654');
      await new Promise((r, e) => ((w.onopen = r), (w.onerror = e)));
      ws = w;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const eventos = [];
  ws.onmessage = (e) => eventos.push(JSON.parse(e.data));
  ws.send(JSON.stringify({ t: 'parear-com', ip: '127.0.0.1', porta, senha: codigo, modo: 'c' }));
  await page.locator('#ap-lista li', { hasText: 'Celular B' }).waitFor({ timeout: 10000 });
  ok(true, 'o aparelho pareou pelo código da tela e aparece na lista');
  const pc = eventos.find((m) => m.t === 'pareado')?.aparelho.id;
  ws.send(JSON.stringify({ t: 'conectar', id: pc }));
  await page.locator('#ap-lista li.tem', { hasText: '🟢 conectado' }).waitFor({ timeout: 10000 });
  ok(true, 'conectou (cifrado) e a tela mostra 🟢 conectado');
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  await page.click('#aparelhos .x');
  ok(
    (await page.textContent('#hm-aparelhos')) === '🟢 conectado: Celular B',
    'cartão do Início: 🟢 conectado: Celular B',
  );
  console.log('\naparelhos: tudo certo');
} finally {
  await browser.close();
  for (const p of procs) p.kill();
  rmSync(tmp, { recursive: true, force: true });
}
