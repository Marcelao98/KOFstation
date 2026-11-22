// Tarefa M (refazer): a linha de base com DOIS KOFstation de verdade, pela rede de verdade (kof-net, TCP cifrado),
// sem "cabo" de teste. O A é o PC (roda o jogo); o B finge ser o celular: a página abre com `?celular=1` e o serviço de
// rede dele se apresenta como `celular` (KOF_REDE_TIPO, como o APK). Os dois pareiam pelo código que a tela do A
// mostra, e o A abre um jogo gerado aqui (Mega Drive que pinta de vermelho; nunca jogo de verdade).
// Confere, em cada passo da M (tem que continuar passando):
//   1. 🎮 o B como controle chega no J1 do A e o botão dele acende lá (tela 🎮 Jogadores do A);
//   2. 📺 "ver o jogo do PC" no B mostra a imagem do A (WebRTC);
//   3. 📱 "levar pro celular" no A leva a imagem pro B, e "voltar pra TV" traz de volta.
// Uso: pnpm build && cargo build -p kof-app && node tools/testar-mesa.mjs [--prints pasta] [--ver] [--ficar]
// (--ver abre o Chromium na tela, pra olhar; --ficar deixa os dois abertos no fim, até o Ctrl+C; o seu KOFstation aberto não atrapalha: cada um pega a porta seguinte).
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');
const RAIZ = join(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'kof-mesa-'));
const procs = [];
// os dois KOFstation morrem junto com o teste, saia ele como sair (Ctrl+C no --ficar, erro, fim)
process.on('exit', () => procs.forEach((p) => p.kill()));
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
const prints = arg('--prints');
if (prints) mkdirSync(prints, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let passo = 0;
const ok = (c, m) => {
  if (!c) throw new Error('FALHOU: ' + m);
  console.log('✓ ' + m);
};
const print = async (p, nome) =>
  prints && p.screenshot({ path: join(prints, `${String(++passo).padStart(2, '0')}-${nome}.png`) });

/** O que está no meio da tela (o que a pessoa vê): a imagem do jogo é o vídeo ou o canvas #tela. */
const noMeio = (p) =>
  p.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const r = el?.getBoundingClientRect();
    return `${el?.tagName.toLowerCase()}${el?.id ? '#' + el.id : ''}.${el?.className} ${Math.round(r?.width)}x${Math.round(r?.height)}`;
  });

/** Mega Drive que pinta o fundo de vermelho (o mesmo de apps/desktop/e2e/roms.ts). */
function romVermelha() {
  const r = Buffer.alloc(0x400);
  r.writeUInt32BE(0xfffe00, 0);
  r.writeUInt32BE(0x200, 4);
  r.write('SEGA MEGA DRIVE ', 0x100);
  [
    0x33fc, 0x8004, 0x00c0, 0x0004, 0x33fc, 0x8144, 0x00c0, 0x0004, 0x33fc, 0x8700, 0x00c0, 0x0004, 0x23fc, 0xc000,
    0x0000, 0x00c0, 0x0004, 0x33fc, 0x000e, 0x00c0, 0x0000, 0x60fe,
  ].forEach((w, i) => r.writeUInt16BE(w, 0x200 + 2 * i));
  return r;
}

/** Um KOFstation de verdade, com a pasta de dados dele; devolve o endereço da página (com o token). */
async function abrirKof(nome, env = {}) {
  const p = spawn(join(RAIZ, 'target/debug/kofstation'), ['--sem-navegador'], {
    env: { ...process.env, XDG_DATA_HOME: join(tmp, nome), KOF_SEM_SOM: '1', ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  procs.push(p);
  let saida = '';
  p.stdout.on('data', (d) => (saida += d));
  for (let i = 0; i < 150 && !/\?t=/.test(saida); i++) await espera(100);
  const url = saida.match(/http:\/\/127\.0\.0\.1:\d+\/\?t=[0-9a-f]+/)?.[0];
  ok(!!url, `KOFstation ${nome} aberto (${url?.replace(/\?t=.*/, '')})`);
  return url;
}

// No B, guarda a WebSocket da rede (a que recebe `lista`), pra mandar o `parear-com` que a tela Achado manda depois de
// digitar o código (o "achar" por UDP bate no KOFstation que estiver aberto na 8650, não no A deste teste).
function espiarRede() {
  const Orig = WebSocket;
  globalThis.__redeEventos = [];
  globalThis.WebSocket = class extends Orig {
    constructor(...a) {
      super(...a);
      this.addEventListener('message', (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m && typeof m.t === 'string' && ['lista', 'pareado', 'achados', 'parear'].includes(m.t)) {
            globalThis.__wsRede = this;
            globalThis.__redeEventos.push(m);
          }
        } catch {
          // não é JSON: não é a rede
        }
      });
    }
  };
}

const urlA = await abrirKof('a');
const urlB = await abrirKof('b', { KOF_REDE_TIPO: 'celular' });
const browser = await chromium.launch({
  headless: !process.argv.includes('--ver') && !process.argv.includes('--ficar'),
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--disable-features=WebRtcHideLocalIpsWithMdns',
    // sem placa de vídeo no headless: o WebGL (a imagem do jogo e o filtro do celular) no swiftshader, como no e2e
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const erros = [];
let a, b;
try {
  a = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const ctxB = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await ctxB.addInitScript(espiarRede);
  b = await ctxB.newPage();
  for (const [n, p] of [
    ['A', a],
    ['B', b],
  ])
    p.on('pageerror', (e) => erros.push(`${n}: ${e.message}`));
  await a.goto(urlA);
  await b.goto(urlB + '&celular=1');
  await b.waitForFunction(() => document.documentElement.classList.contains('celular'), null, { timeout: 15000 });
  ok(true, 'o B está no modo celular');

  // ---- parear: o A mostra o código, o B manda o código (o mesmo pedido da tela Achado)
  await a.locator('#home [data-acao="aparelhos"]').first().click();
  await a.locator('#ap-com').waitFor({ state: 'visible', timeout: 15000 });
  await a.click('[data-acao="ap-parear"]');
  await a.locator('#ap-codigo').waitFor();
  const codigo = (await a.textContent('#ap-codigo')).replace(/\D/g, '');
  const porta = Number((await a.textContent('#ap-tempo')).match(/:(\d+)$/)[1]);
  ok(/^\d{6}$/.test(codigo), `o A mostra o código ${codigo} (porta ${porta})`);
  await b.waitForFunction(() => !!globalThis.__wsRede, null, { timeout: 15000 });
  await b.evaluate(
    ([porta, senha]) =>
      globalThis.__wsRede.send(JSON.stringify({ t: 'parear-com', ip: '127.0.0.1', porta, senha, modo: 'c' })),
    [porta, codigo],
  );
  await a.locator('#ap-lista li', { hasText: '📱' }).waitFor({ timeout: 15000 });
  ok(true, 'pareou: o A vê o B como 📱 celular');
  const idA = await b.evaluate(() => globalThis.__redeEventos.find((m) => m.t === 'pareado')?.aparelho.id);
  await b.evaluate((id) => globalThis.__wsRede.send(JSON.stringify({ t: 'conectar', id })), idA);
  await a.locator('#ap-lista li.tem', { hasText: '🟢 conectado' }).waitFor({ timeout: 15000 });
  ok(true, 'conectou (cifrado): 🟢 nos dois');
  await a.click('#aparelhos .x');

  // ---- o jogo no A
  await a.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await a.locator('#st-jogo', { hasText: 'Teste Vermelho' }).waitFor({ timeout: 30000 });
  ok(true, 'o A abriu o jogo de teste');
  await print(a, 'A-jogo');

  // ---- 1. 🎮 o B como controle: J1 e o botão chega
  await b.locator('[data-acao="rede-controle"]').first().click({ timeout: 15000 });
  await b.locator('#modo-controle').waitFor({ state: 'visible', timeout: 15000 });
  await b.locator('#ctl').waitFor({ state: 'visible', timeout: 15000 });
  await b.waitForFunction(
    () => document.getElementById('modo-controle')?.style.getPropertyValue('--jog-cor') === '#e84545',
    null,
    { timeout: 15000 },
  );
  ok(true, 'o B virou controle e o A disse: Jogador 1');
  await a.click('#menu >> text=Arquivo');
  await a.click('#menu [data-acao="jogadores"]');
  const apertar = (t) =>
    b.evaluate((tipo) => {
      const el = document.querySelector('#ctl [data-b="A"]');
      el.dispatchEvent(new PointerEvent(tipo, { pointerId: 5, bubbles: true, cancelable: true }));
    }, t);
  await apertar('pointerdown');
  const li = a.locator('#jog-lista li.apertando').filter({ hasNotText: 'Teclado' });
  await li.waitFor({ timeout: 10000 });
  const jog = await li.locator('button.ativo').textContent();
  await print(a, 'A-jogadores');
  await print(b, 'B-controle');
  ok(jog === 'J1', `o A recebe o A do B no ${jog} (tem que ser J1)`);
  const jogTeclado = await a.locator('#jog-lista li', { hasText: 'Teclado' }).locator('button.ativo').textContent();
  ok(jogTeclado === 'J1', `a): o teclado do A continua no ${jogTeclado} junto com o B (divide o J1)`);
  await apertar('pointerup');
  await a
    .locator('#jog-lista li.apertando')
    .filter({ hasNotText: 'Teclado' })
    .waitFor({ state: 'detached', timeout: 10000 });
  ok(true, 'soltou: a luz apaga no A');
  await a.click('#jogadores .x');
  await b.click('#modo-controle .mc-sair');
  await b.locator('#modo-controle').waitFor({ state: 'detached', timeout: 10000 });

  // ---- 2. 📺 ver o jogo do PC no B, com a janela do PC escondida (outra aba na frente): o navegador para o vsync do A
  // e os quadros tinham que continuar indo (22/11: no celular de verdade ficava preto, com o ping funcionando)
  // (o headless não esconde a aba de trás: aqui o vsync do A para do mesmo jeito que o Chrome faz com a janela escondida)
  await a.evaluate(() => {
    globalThis.__rafDeVerdade = requestAnimationFrame;
    globalThis.requestAnimationFrame = () => 0;
  });
  await espera(300);
  await b.locator('[data-acao="rede-ver-jogo"]').first().click({ timeout: 15000 });
  await b.waitForFunction(() => (document.querySelector('.mc-video')?.videoWidth ?? 0) > 0, null, { timeout: 30000 });
  const quadrosNoB = () =>
    b.evaluate(() => document.querySelector('.mc-video')?.getVideoPlaybackQuality().totalVideoFrames ?? 0);
  const q0 = await quadrosNoB();
  await espera(2000);
  const q1 = await quadrosNoB();
  ok(q1 - q0 > 20, `com a janela do PC escondida, os quadros continuam chegando no B (${q1 - q0} em 2 s)`);
  const meio = await noMeio(b);
  ok(/^(canvas#tela|video\.mc-video)/.test(meio), `ver o jogo do PC (com o filtro): a imagem aparece no B (${meio})`);
  await b.evaluate(() => document.querySelector('.mc-menu [data-r="filtro"]').click());
  await espera(500);
  const meio2 = await noMeio(b);
  ok(/^video\.mc-video/.test(meio2), `e sem o filtro também (${meio2})`);
  await print(b, 'B-ver-jogo-sem-filtro');
  await b.evaluate(() => document.querySelector('.mc-menu [data-r="filtro"]').click());
  await print(b, 'B-ver-jogo');

  await b.click('#modo-controle .mc-sair');
  await b.locator('#modo-controle').waitFor({ state: 'detached', timeout: 10000 });
  await espera(1000);

  await a.evaluate(() => (globalThis.requestAnimationFrame = globalThis.__rafDeVerdade));
  // ---- 3. 📱 levar pro celular (no A) e 📺 voltar pra TV
  const rapido = async (texto) => {
    await a.keyboard.press('F2');
    await a.locator('#rapido-lista li', { hasText: texto }).first().click({ timeout: 10000 });
  };
  await rapido('Levar pro celular');
  await b.locator('#modo-controle').waitFor({ state: 'visible', timeout: 15000 });
  await b.waitForFunction(() => (document.querySelector('.mc-video')?.videoWidth ?? 0) > 0, null, { timeout: 30000 });
  await espera(1000);
  const meio3 = await noMeio(b);
  ok(/^(canvas#tela|video\.mc-video)/.test(meio3), `levado: a imagem aparece no B (${meio3})`);
  await print(b, 'B-levado');

  await rapido('Voltar pra TV');
  await b.locator('#modo-controle').waitFor({ state: 'detached', timeout: 15000 });
  await a.locator('#st-jogo', { hasText: 'Teste Vermelho' }).waitFor();
  await print(a, 'A-voltou');
  ok(true, 'voltar pra TV: o B largou a imagem e o jogo continua no A');

  ok(erros.length === 0, 'nenhum erro nas páginas' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log('\nmesa (linha de base): tudo certo');
} catch (e) {
  console.error(e.message);
  if (prints)
    for (const [n, p] of [
      ['A', a],
      ['B', b],
    ])
      await p?.screenshot({ path: join(prints, `falhou-${n}.png`) });
  if (erros.length) console.error('erros nas páginas:', erros);
  process.exitCode = 1;
} finally {
  if (process.argv.includes('--ficar')) {
    console.log('\n(--ficar) os dois KOFstation e as páginas continuam abertos: Ctrl+C pra fechar');
    await new Promise((r) => process.once('SIGINT', r));
  }
  await browser.close();
  for (const p of procs) p.kill();
  rmSync(tmp, { recursive: true, force: true });
}
