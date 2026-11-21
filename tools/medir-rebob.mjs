// Rebobinar liso (fase R): abre o KOFstation de verdade com os dados de quem roda, abre um jogo da biblioteca (com o
// "Continuar" do save automático), joga uns segundos (↑ segurado e Z pulando) e segura o Backspace. A cada vsync a sonda diz se a imagem
// da tela é nova ou repetida: compara jogando × rebobinando. Nada daqui vai pro repositório além deste programa: o nome
// do jogo vem da linha de comando e não aparece no que é impresso.
//
//   node tools/medir-rebob.mjs "<nome como aparece na biblioteca>" [--exe target/release/kofstation]
//        [--jogar 3] [--voltar 2.5] [--rodadas 3] [--soltar 1.5]
//
// Desde 21/11 (tarefa P) o app abre com os dados da pasta de medidas (KOF_MEDIDAS, padrão ~/kof-medidas/dados), nunca
// com os de quem joga, e o rebobinar é medido em três momentos: ao apertar (o primeiro meio segundo), voltando (o
// resto) e ao soltar (o tempo depois de largar a tecla, quando o jogo volta a andar).
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');
const arg = (n, p) => {
  const i = process.argv.indexOf('--' + n);
  return i > 0 ? process.argv[i + 1] : p;
};
const nome = process.argv[2];
if (!nome || nome.startsWith('--')) {
  console.error('uso: node tools/medir-rebob.mjs "<nome na biblioteca>" [--jogar 3] [--voltar 2.5] [--rodadas 3]');
  process.exit(2);
}
const exe = resolve(arg('exe', 'target/release/kofstation'));
const jogar = Number(arg('jogar', '3'));
const voltar = Number(arg('voltar', '2.5'));
const rodadas = Number(arg('rodadas', '3'));
const soltar = Number(arg('soltar', '1.5'));
const dados = join(process.env.KOF_MEDIDAS || join(homedir(), 'kof-medidas'), 'dados');
const PORTA = 9333;
const navegador = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const pasta = mkdtempSync(join(tmpdir(), 'kof-rebob-'));
const embrulho = join(pasta, 'navegador.sh');
writeFileSync(embrulho, `#!/bin/sh\nexec "${navegador}" "$@" --remote-debugging-port=${PORTA}\n`);
chmodSync(embrulho, 0o755);
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Na página: a cada vsync, o instante e uma assinatura miúda do canvas do jogo. */
function sonda(segundos) {
  const w = document.createElement('canvas');
  w.width = 64;
  w.height = 36;
  const g = w.getContext('2d', { willReadFrequently: true });
  const a = [];
  const fim = performance.now() + segundos * 1000;
  return new Promise((ok) => {
    const laco = (t) => {
      if (t > fim) return ok(a);
      requestAnimationFrame(laco);
      const c = document.querySelector('#tela');
      if (!c || !g) return;
      g.drawImage(c, 0, 0, 64, 36);
      const d = g.getImageData(0, 0, 64, 36).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ (d[i] + d[i + 1] + d[i + 2]), 16777619);
      a.push([t, h >>> 0]);
    };
    requestAnimationFrame(laco);
  });
}

/** Resumo de um trecho: vsyncs, quantos com imagem nova, imagens novas por segundo e as maiores sequências paradas. */
function resumo(a) {
  let novos = 0;
  let parado = 0;
  const paradas = [];
  const intervalos = [];
  let ultimoNovo = a[0]?.[0] ?? 0;
  let maior = { n: 0, em: 0 };
  for (let i = 1; i < a.length; i++) {
    if (a[i][1] !== a[i - 1][1]) {
      novos++;
      intervalos.push(a[i][0] - ultimoNovo);
      ultimoNovo = a[i][0];
      if (parado > maior.n) maior = { n: parado, em: Math.round(a[i - parado][0] - a[0][0]) };
      if (parado) paradas.push(parado);
      parado = 0;
    } else parado++;
  }
  const seg = a.length > 1 ? (a[a.length - 1][0] - a[0][0]) / 1000 : 1;
  const hist = {};
  for (const p of paradas) hist[p] = (hist[p] ?? 0) + 1;
  intervalos.sort((x, y) => x - y);
  const pc = (p) => Math.round(intervalos[Math.min(intervalos.length - 1, Math.floor(p * intervalos.length))] ?? 0);
  return {
    vsyncs: a.length,
    hz: Math.round(a.length / seg),
    novasPorSeg: Math.round(novos / seg),
    entreNovas: `p50 ${pc(0.5)} ms, p95 ${pc(0.95)} ms, máx ${pc(1)} ms`,
    vsyncsParadosSeguidos: hist,
    maiorParada:
      parado > maior.n
        ? `${parado} vsyncs, do ${Math.round(a[a.length - parado - 1][0] - a[0][0])} ms até o fim`
        : `${maior.n} vsyncs, aos ${maior.em} ms`,
  };
}

async function rodada(n) {
  const app = spawn(exe, [], {
    env: { ...process.env, XDG_DATA_HOME: dados, KOF_NAVEGADOR: embrulho, KOF_SEM_REDE: '1' },
    stdio: 'ignore',
    detached: true,
  });
  let nav;
  try {
    for (let i = 0; i < 60 && !nav; i++) {
      await dormir(500);
      nav = await chromium.connectOverCDP(`http://127.0.0.1:${PORTA}`).catch(() => null);
    }
    if (!nav) throw new Error('o navegador do app não abriu a porta de depuração');
    let page;
    for (let i = 0; i < 40 && !page; i++) {
      page = nav
        .contexts()
        .flatMap((c) => c.pages())
        .find((p) => p.url().includes('127.0.0.1') && !p.url().includes(`:${PORTA}`));
      if (!page) await dormir(250);
    }
    if (!page) throw new Error('não achei a página do KOFstation');
    await page.waitForSelector('#home', { timeout: 60000 });
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await dormir(600);
    }
    await page.keyboard.press('Control+KeyL');
    await page.waitForSelector('#roms li', { timeout: 30000 });
    await page.locator('input[placeholder^="procure"]').first().fill(nome);
    await dormir(800);
    await page.locator('#roms li', { hasText: nome }).first().click();
    await page.keyboard.press('Enter');
    await page.waitForFunction((x) => (document.querySelector('#st-jogo')?.textContent ?? '').includes(x), nome, {
      timeout: 90000,
    });
    await dormir(1500);
    const modo = page.locator('#modo-tela button').first();
    if (await modo.isVisible().catch(() => false)) await modo.click();
    await dormir(6000); // o save automático entra e o jogo assenta
    // escuta o canal do núcleo nativo: quando cada quadro CHEGA na página (antes da fila e do desenho)
    await page.evaluate(() => {
      const w = window;
      w.__chegadas = [];
      const ouvir = (ws) => {
        if (ws.__ouvindo) return;
        ws.__ouvindo = true;
        ws.addEventListener('message', (e) => {
          if (typeof e.data === 'string') {
            if (e.data.includes('"rebob"')) w.__chegadas.push([performance.now(), 'rebob']);
            return;
          }
          const u = new Uint8Array(e.data);
          if (u[0] === 1) {
            // assinatura miúda dos pixels: diz se o quadro que chegou é uma imagem nova ou repetida
            let h = 2166136261;
            for (let i = 64; i < u.length; i += 509) h = Math.imul(h ^ u[i], 16777619);
            w.__chegadas.push([performance.now(), new DataView(e.data).getUint32(8, true), h >>> 0]);
          }
        });
      };
      const send = WebSocket.prototype.send;
      WebSocket.prototype.send = function (d) {
        ouvir(this);
        return send.call(this, d);
      };
    });

    // joga de verdade: segura ↑ (direcional) e pula com Z (o X do PS1) enquanto mede, pra ter movimento na tela
    await page.keyboard.down('ArrowUp');
    const medindo = page.evaluate(sonda, jogar + 0.8);
    const fimJogo = Date.now() + jogar * 1000 + 800;
    while (Date.now() < fimJogo) {
      await page.keyboard.press('KeyZ', { delay: 120 });
      await dormir(600);
    }
    const jogando = await medindo;

    await page.keyboard.up('ArrowUp');
    if (process.env.KOF_PRINT) await page.screenshot({ path: process.env.KOF_PRINT + `/antes-de-voltar-${n}.png` });
    // --sem-efeito: tira o preto e branco tremulando do rebobinar (só nesta medição), pra ver se o tranco é dele
    if (process.argv.includes('--sem-efeito'))
      await page.addStyleTag({
        content: 'body.rebobinando #tela { animation: none !important; filter: none !important; }',
      });
    await page.keyboard.down('Backspace');
    await dormir(250); // o começo do voltar (fade do som)
    const voltandoTudo = await page.evaluate(sonda, voltar);
    await page.keyboard.up('Backspace');
    const soltouEm = await page.evaluate(() => performance.now());
    // ao soltar, volta a andar e pular como no "jogando" (parado, a tela do jogo quase não muda e pareceria travada)
    await page.keyboard.down('ArrowUp');
    const medindoDepois = page.evaluate(sonda, soltar);
    const fimDepois = Date.now() + soltar * 1000;
    while (Date.now() < fimDepois) {
      await page.keyboard.press('KeyZ', { delay: 120 });
      await dormir(600);
    }
    const depois = await medindoDepois;
    await page.keyboard.up('ArrowUp');
    const t00 = voltandoTudo[0]?.[0] ?? 0;
    const apertando = voltandoTudo.filter((x) => x[0] - t00 < 500);
    const voltando = voltandoTudo.filter((x) => x[0] - t00 >= 500);
    const ch = await page.evaluate(() => window.__chegadas);
    const t0 = t00;
    const q = ch.filter((c) => c[1] !== 'rebob');
    const gaps = [];
    for (let i = 1; i < q.length; i++)
      gaps.push([Math.round(q[i][0] - t0), Math.round(q[i][0] - q[i - 1][0]), q[i][1]]);
    const grandes = gaps.filter((g) => g[1] > 50);
    console.log(
      `  chegadas: ${q.length} quadros em ${Math.round((q.at(-1)?.[0] ?? 0) - (q[0]?.[0] ?? 0))} ms; buracos > 50 ms (ms desde a sonda, buraco, número): ${JSON.stringify(grandes)}`,
    );
    console.log(
      `  avisos rebob (ms desde a sonda): ${JSON.stringify(
        ch
          .filter((c) => c[1] === 'rebob')
          .map((c) => Math.round(c[0] - t0))
          .slice(0, 6),
      )}`,
    );
    // os quadros que chegaram em volta do soltar: ms desde o soltar e se a imagem era nova (N) ou repetida (r)
    const perto = q.filter((c) => c[0] > soltouEm - 150 && c[0] < soltouEm + 400);
    console.log(
      `  chegando ao soltar: ${perto
        .map((c, i) => `${Math.round(c[0] - soltouEm)}${i && c[2] === perto[i - 1][2] ? 'r' : 'N'}`)
        .join(' ')}`,
    );
    console.log(`rodada ${n}`);
    console.log('  jogando:   ', JSON.stringify(resumo(jogando)));
    console.log('  ao apertar: ', JSON.stringify(resumo(apertando)));
    console.log('  rebobinando:', JSON.stringify(resumo(voltando)));
    console.log('  ao soltar:  ', JSON.stringify(resumo(depois)));
  } finally {
    await nav?.close().catch(() => {});
    try {
      process.kill(-app.pid, 'SIGTERM');
    } catch {
      // já saiu
    }
    await dormir(3000);
  }
}

for (let n = 1; n <= rodadas; n++) await rodada(n);
