// Ponta a ponta do PS1 nativo (M11b N.3), com o app de verdade: sobe o `kofstation` (com o PCSX nativo embutido), uma
// Kof Games temporária com um PS-X EXE gerado aqui (pinta a tela de vermelho com um retângulo verde; nada de ROM nem
// BIOS de ninguém), abre pela biblioteca no Chromium e confere os pixels da tela do app, o estado salvo e o fechar.
// Uso: pnpm build && cargo build -p kof-app && node tools/testar-nativo.mjs [executável] [pasta-dos-prints]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// o Playwright mora no apps/desktop (é dele que os testes de tela usam)
const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');

const exe = process.argv[2] ?? join(import.meta.dirname, '../target/debug/kofstation');
const prints = process.argv[3];

/** O mesmo PS-X EXE do crates/kof-nativo/tests/pcsx.rs. */
function psxExe() {
  const T0 = 8,
    T1 = 9;
  const lui = (rt, imm) => (0x3c000000 | (rt << 16) | (imm & 0xffff)) >>> 0;
  const ori = (rt, rs, imm) => (0x34000000 | (rs << 21) | (rt << 16) | (imm & 0xffff)) >>> 0;
  const sw = (rt, base, off) => (0xac000000 | (base << 21) | (rt << 16) | (off & 0xffff)) >>> 0;
  const code = [lui(T0, 0x1f80), ori(T0, T0, 0x1810)];
  const escrever = (gp1, v) => code.push(lui(T1, v >>> 16), ori(T1, T1, v & 0xffff), sw(T1, T0, gp1 ? 4 : 0));
  for (const v of [0, 0x03000000, 0x08000001, 0x06c60260, 0x07040010, 0x05000000]) escrever(true, v);
  for (const v of [
    0xe1000400, 0xe3000000, 0xe403bd3f, 0xe5000000, 0x020000ff, 0, 0x00f00140, 0x0200ff00, 0x00100010, 0x00200040,
  ])
    escrever(false, v);
  const base = 0x80010000;
  const aqui = base + (code.length + 1) * 4;
  code.push(0x25290001, (0x08000000 | ((aqui >>> 2) & 0x03ffffff)) >>> 0, 0);
  const corpo = Buffer.alloc(Math.ceil((code.length * 4) / 2048) * 2048);
  code.forEach((w, i) => corpo.writeUInt32LE(w, i * 4));
  const cab = Buffer.alloc(2048);
  cab.write('PS-X EXE', 0, 'latin1');
  cab.writeUInt32LE(base, 0x10);
  cab.writeUInt32LE(base, 0x18);
  cab.writeUInt32LE(corpo.length, 0x1c);
  cab.writeUInt32LE(0x801ffff0, 0x30);
  cab.write('Sony Computer Entertainment Inc. for North America area', 0x4c, 'latin1');
  return Buffer.concat([cab, corpo]);
}

const tmp = mkdtempSync(join(tmpdir(), 'kof-nativo-'));
const raiz = join(tmp, 'Kof Games');
mkdirSync(join(raiz, 'Games', 'psx'), { recursive: true });
writeFileSync(join(raiz, 'Games', 'psx', 'Desenha.exe'), psxExe());

const app = spawn(exe, ['--sem-navegador'], {
  env: { ...process.env, XDG_DATA_HOME: join(tmp, 'dados'), KOF_SEM_SOM: '1' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const url = await new Promise((ok, falhou) => {
  let s = '';
  app.stdout.on('data', (d) => {
    s += d;
    const m = /(http:\/\/127\.0\.0\.1:\d+\/\?t=\w+)/.exec(s);
    if (m) ok(m[1]);
  });
  app.on('exit', (c) => falhou(new Error(`o kofstation saiu (${c})`)));
});
const token = new URL(url).searchParams.get('t');
const falhas = [];
const conferir = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) falhas.push(msg);
};

const nav = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await nav.newPage({ viewport: { width: 1100, height: 700 } });
  page.on('pageerror', (e) => falhas.push(`erro na página: ${e.message}`));
  await page.goto(url);
  await page.waitForSelector('#home');
  const api = (cmd, args) =>
    page.evaluate(
      async ([cmd, args, token]) => {
        const r = await fetch(`/api/${cmd}`, {
          method: 'POST',
          headers: { 'X-Kof-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        return r.json();
      },
      [cmd, args, token],
    );
  conferir((await api('nativo.disponivel', {})).sistemas?.includes('ps1'), 'o kofstation tem o PS1 nativo embutido');
  await api('library.root.set', { path: raiz });
  await page.reload();
  await page.waitForSelector('#home');
  await page.keyboard.press('Control+KeyL');
  await page.waitForSelector('#roms li');
  await page.locator('#roms li', { hasText: 'Desenha' }).first().click();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#st-jogo')?.textContent === 'Desenha', null, {
    timeout: 15000,
  });
  // o modo de jogo pode perguntar: escolhe o primeiro
  const modo = page.locator('#modo-tela button').first();
  if (await modo.isVisible().catch(() => false)) await modo.click();

  const cor = (fx, fy) =>
    page.evaluate(
      ([fx, fy]) => {
        const t = document.querySelector('#tela');
        const c = document.createElement('canvas');
        c.width = t.width;
        c.height = t.height;
        const g = c.getContext('2d');
        g.drawImage(t, 0, 0);
        return [...g.getImageData(Math.floor(t.width * fx), Math.floor(t.height * fy), 1, 1).data].slice(0, 3);
      },
      [fx, fy],
    );
  const vermelho = ([r, g, b]) => r > 200 && g < 50 && b < 50;
  const verde = ([r, g, b]) => g > 200 && r < 50 && b < 50;
  const ate = async (f, ms = 15000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      if (await f()) return true;
      await page.waitForTimeout(200);
    }
    return false;
  };
  conferir(await ate(async () => vermelho(await cor(0.8, 0.8))), 'tela vermelha pelo PCSX nativo');
  // retângulo verde em (16..80, 16..48) de 320x240: o meio dele é (48/320, 32/240)
  conferir(verde(await cor(48 / 320, 32 / 240)), 'retângulo verde no lugar certo');
  const log = await api('nativo.log', {});
  conferir(log.vivo === true, 'processo nativo vivo');
  if (prints) {
    mkdirSync(prints, { recursive: true });
    await page.screenshot({ path: join(prints, 'ps1-nativo.png') });
  }
  await page.keyboard.press('F3');
  await page.waitForTimeout(2500);
  const painel =
    (await page
      .locator('#desempenho')
      .textContent()
      .catch(() => '')) ?? '';
  const fps = Number(/([\d.]+) fps/.exec(painel)?.[1] ?? 0);
  conferir(fps > 50, `quadros andando (${fps} fps no painel)`);
  // fechar o jogo fecha o processo
  await page.keyboard.press('Home');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  console.log('log do processo:', log.linhas.slice(-5).join(' | '));
} finally {
  await nav.close();
  app.kill();
}
if (falhas.length) {
  console.error(`\n${falhas.length} falha(s):\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
console.log('\nPS1 nativo ok');
