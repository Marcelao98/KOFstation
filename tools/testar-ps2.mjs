// Ponta a ponta do PS2 (N.9/M12) com o app de verdade: o kofstation (LRPS2 na pasta nativo/ ou do repositório), uma
// Kof Games temporária com um DVD de 4,3 GB (ISO com SYSTEM.CNF/BOOT2 de verdade, esticado em arquivo esparso: não
// gasta disco) e uma BIOS falsa (só a tabela ROMDIR e um laço no vetor de reset: nada de BIOS de ninguém). Abre pela
// biblioteca no Chromium e confere: o jogo abre no núcleo nativo, o processo segue vivo, o som anda e a página não lê o
// DVD (memória da página igual a antes de abrir). Imagem só com BIOS de verdade (teste do Marcelo).
// Uso: pnpm build && cargo build -p kof-app && node tools/testar-ps2.mjs [executável]
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');
const exe = process.argv[2] ?? join(import.meta.dirname, '../target/debug/kofstation');
const tmp = mkdtempSync(join(tmpdir(), 'kof-ps2-'));
const falhas = [];
const conferir = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) falhas.push(msg);
};

// BIOS falsa: a mesma do crates/kof-nativo/tests/lrps2.rs
function biosFalsa() {
  const b = Buffer.alloc(4 << 20);
  const tab = 0x2700;
  [
    ['RESET', 0x2700],
    ['ROMDIR', 0x50],
    ['EXTINFO', 0x10],
    ['ROMVER', 0x10],
  ].forEach(([n, t], i) => {
    b.write(n, tab + i * 16, 'latin1');
    b.writeUInt32LE(t, tab + i * 16 + 12);
  });
  b.writeUInt32LE(0x0bf00000, 0); // j 0xBFC00000
  b.write('0160EC20020207', 0x2760, 'latin1');
  return b;
}

// DVD: ISO de verdade com o SYSTEM.CNF de PS2, esticado pra 4,3 GB (esparso)
const raiz = join(tmp, 'Kof Games');
mkdirSync(join(raiz, 'Games', 'ps2'), { recursive: true });
const d = join(tmp, 'dvd');
mkdirSync(d);
writeFileSync(join(d, 'SYSTEM.CNF'), 'BOOT2 = cdrom0:\\SLUS_000.00;1\r\nVER = 1.00\r\nVMODE = NTSC\r\n');
writeFileSync(join(d, 'SLUS_000.00'), Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
const iso = join(raiz, 'Games', 'ps2', 'Teste PS2.iso');
execFileSync('genisoimage', ['-quiet', '-V', 'KOFPS2', '-o', iso, d]);
const DVD = Math.round(4.3 * 2 ** 30 / 2048) * 2048;
truncateSync(iso, DVD);

const picoMb = (pid) => {
  try {
    return Math.round(Number(/VmHWM:\s+(\d+) kB/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024);
  } catch {
    return 0; // fora do Linux
  }
};
const picoPagina = () => {
  let m = 0;
  for (const p of readdirSync('/proc').filter((x) => /^\d+$/.test(x)))
    try {
      if (readFileSync(`/proc/${p}/cmdline`, 'utf8').includes('--type=renderer')) m = Math.max(m, picoMb(p));
    } catch {
      // acabou no meio
    }
  return m;
};

const app = spawn(exe, ['--sem-navegador'], {
  env: { ...process.env, XDG_DATA_HOME: join(tmp, 'dados'), KOF_SEM_SOM: '1', KOF_SEM_REDE: '1' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const url = await new Promise((ok, falhou) => {
  let s = '';
  app.stdout.on('data', (x) => {
    s += x;
    const m = /(http:\/\/127\.0\.0\.1:\d+\/\?t=\w+)/.exec(s);
    if (m) ok(m[1]);
  });
  app.on('exit', (c) => falhou(new Error(`o kofstation saiu (${c})`)));
});
const token = new URL(url).searchParams.get('t');
const nav = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await nav.newPage({ viewport: { width: 1100, height: 700 } });
  page.on('pageerror', (e) => falhas.push(`erro na página: ${e.message}`));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#home', { timeout: 60000 });
  const api = (cmd, args, bin) =>
    page.evaluate(
      async ([cmd, args, token, bin]) => {
        const h = { 'X-Kof-Token': token };
        let body = JSON.stringify(args);
        if (bin) {
          h['Content-Type'] = 'application/octet-stream';
          h['X-Kof-Args'] = encodeURIComponent(JSON.stringify(args));
          body = Uint8Array.from(atob(bin), (c) => c.charCodeAt(0));
        } else h['Content-Type'] = 'application/json';
        const r = await fetch(`/api/${cmd}`, { method: 'POST', headers: h, body });
        return r.json();
      },
      [cmd, args, token, bin],
    );
  conferir((await api('nativo.disponivel', {})).sistemas?.includes('ps2'), 'o kofstation tem o PS2 nativo (LRPS2)');
  await api('library.root.set', { path: raiz });
  const bios = biosFalsa();
  await api(
    'store.put',
    {
      store: 'bios',
      key: 'bios-ps2.bin',
      meta: { arquivo: 'bios-ps2.bin', sistema: 'ps2', nome: 'falsa.bin', tamanho: bios.length },
    },
    bios.toString('base64'),
  );
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#home', { timeout: 60000 });
  const antes = picoPagina();
  await page.keyboard.press('Control+KeyL');
  await page.waitForSelector('#roms li', { timeout: 30000 });
  await page.locator('#roms li', { hasText: 'Teste PS2' }).first().click();
  await page.keyboard.press('Enter');
  const abriu = await page
    .waitForFunction(() => document.querySelector('#st-jogo')?.textContent === 'Teste PS2', null, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  conferir(abriu, 'o DVD de 4,3 GB abriu pela biblioteca');
  const modo = page.locator('#modo-tela button').first();
  if (await modo.isVisible().catch(() => false)) await modo.click();
  await page.waitForTimeout(6000);
  const log = await api('nativo.log', {});
  conferir(log.vivo, `o processo do PS2 segue vivo depois de 6 s (${log.linhas?.slice(-2).join(' | ')})`);
  const aviso = await page
    .locator('#aviso')
    .textContent()
    .catch(() => '');
  conferir(!/não abriu|erro/i.test(aviso ?? ''), `sem erro na tela (${aviso || 'nenhum aviso'})`);
  const depois = picoPagina();
  conferir(
    depois - antes < 200,
    `a página não leu o DVD: ${antes} → ${depois} MB (DVD de ${Math.round(DVD / 2 ** 20)} MB)`,
  );
  console.log(`kofstation: pico ${picoMb(app.pid)} MB`);
} finally {
  await nav.close();
  app.kill();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nPS2: tudo certo');
process.exit(falhas.length ? 1 : 0);
