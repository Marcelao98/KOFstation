// Ponta a ponta da tela 📡 Aparelhos (M13.2) com o app de verdade: o kofstation (serviço de rede dentro), a página no
// Chromium, e um "outro aparelho" (o kof-rede, com o mesmo protocolo do APK) que pareia digitando o código que a tela
// mostra, conecta e aparece 🟢 na lista. Grava um print.
// Com o kofstation-old (só leitura), também o celular como controle pelo servidor do APK (o ControleServidor.java de
// verdade, compilado numa pasta temporária): o PC conecta com a senha, o celular aperta A e a tela Jogadores acende.
// Uso: pnpm build && cargo build -p kof-app -p kof-net && node tools/testar-aparelhos.mjs [--print x.png] [--antigo dir]
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');
const RAIZ = join(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'kof-aparelhos-'));
const procs = [];
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
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
  if (arg('--print')) await page.screenshot({ path: arg('--print') });
  await page.click('#aparelhos .x');
  ok(
    (await page.textContent('#hm-aparelhos')) === '🟢 conectado: Celular B',
    'cartão do Início: 🟢 conectado: Celular B',
  );
  const antigo = arg('--antigo');
  if (antigo) {
    // o celular do jeito antigo: o ControleServidor do APK (senha de 4 números, porta 8642), sem parear
    const cls = join(tmp, 'java');
    execFileSync(
      'javac',
      ['-nowarn', '-d', cls, join(antigo, 'android/src/dev/kofnes/android/ControleServidor.java')],
      { stdio: 'ignore' },
    );
    const cel = spawn('java', ['-cp', cls, 'dev.kofnes.android.ControleServidor', '4821', '18642', 'entrada'], {
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    procs.push(cel);
    let est = '';
    cel.stdout.on('data', (d) => (est += d));
    for (let i = 0; i < 100 && !/porta 18642/.test(est); i++) await new Promise((r) => setTimeout(r, 100));
    page.once('dialog', (d) => void d.accept('127.0.0.1:18642 4821'));
    await page.click('#menu >> text=Arquivo');
    await page.click('#menu [data-acao="controle-celular"]');
    await page.locator('#aviso', { hasText: 'celular conectado' }).waitFor({ timeout: 10000 });
    ok(true, 'o PC conectou no servidor do APK com a senha');
    for (let i = 0; i < 50 && !/ESTADO 1\t/.test(est); i++) await new Promise((r) => setTimeout(r, 100));
    ok(/ESTADO 1\t/.test(est), `o celular viu o PC conectado (${est.match(/ESTADO 1\t[^\n]*/)?.[0].trim()})`);
    await page.click('#menu >> text=Arquivo');
    await page.click('#menu [data-acao="jogadores"]');
    cel.stdin.write('128 0\n'); // A apertado
    await page.locator('#jog-lista li.apertando', { hasText: 'Celular (controle do PC)' }).waitFor({ timeout: 5000 });
    ok(true, 'o celular aperta A e a luz dele acende na tela Jogadores');
  }
  console.log('\naparelhos: tudo certo');
} finally {
  await browser.close();
  for (const p of procs) p.kill();
  rmSync(tmp, { recursive: true, force: true });
}
