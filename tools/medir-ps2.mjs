// Banco de medição do PS2 (tarefa D, docs/PS2-LISO.md): abre o KOFstation de verdade (o pacote instalado, com a janela
// do Chrome na placa de vídeo da máquina e o som ligado), abre um jogo de verdade da máquina de quem roda, espera o
// trecho de teste e mede sozinho. Nada daqui vai pro repositório: jogo, BIOS, dados do app e resultados ficam na pasta
// de medidas (~/kof-medidas), e o jogo entra na biblioteca por um atalho chamado "Jogo pesado A/B" (o nome de verdade
// não aparece em relatório nenhum).
//
//   KOF_APP=<pasta do KOFstation instalado>/kofstation   (o executável a medir)
//   KOF_JOGO_A=<iso>  KOF_JOGO_B=<iso>  KOF_BIOS_PS2=<bios>
//   --estado <arquivo .bin da loja estados>: começa desse estado (F8); --teclas: no meio da medição aperta F5 (salvar
//   estado) duas vezes e F8 (carregar) uma, e mede a maior travada da tela depois de cada uma.
//   --sistema wii|gc (tarefa W): o Dolphin, com KOF_JOGO_WII_A (ou KOF_JOGO_GC_A) e sem BIOS
//   node tools/medir-ps2.mjs [--sistema ps2|wii|gc] [--jogo A|B] [--rodadas 3] [--aquecer 60] [--segundos 60] [--rotulo texto] [--print] [--janela] [--opcao chave=valor]...
//
// Saída: uma linha por rodada e a variação entre elas; o JSON completo em <medidas>/resultados/.
import { spawn } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  statSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const { chromium } = createRequire(join(import.meta.dirname, '../apps/desktop/package.json'))('@playwright/test');

const arg = (n, p) => {
  const i = process.argv.indexOf('--' + n);
  return i < 0 ? p : (process.argv[i + 1] ?? p);
};
const tem = (n) => process.argv.includes('--' + n);
const qual = String(arg('jogo', 'A')).toUpperCase();
const sistema = String(arg('sistema', 'ps2')).toLowerCase();
const ehPs2 = sistema === 'ps2';
const rodadas = Number(arg('rodadas', 3));
const aquecer = Number(arg('aquecer', 60));
const segundos = Number(arg('segundos', 60));
const rotulo = arg('rotulo', 'base');
const PORTA = Number(arg('porta', 9377));
// --opcao chave=valor (pode repetir): ajuste do PS2 por cima do perfil ⚖, como a tela ⚙ Opções de emulação grava
const opcoes = Object.fromEntries(
  process.argv.flatMap((a, i) =>
    a === '--opcao' && process.argv[i + 1]?.includes('=') ? [process.argv[i + 1].split(/=(.*)/s).slice(0, 2)] : [],
  ),
);
const ALVO_MS = 1000 / 59.94; // NTSC

const medidas = process.env.KOF_MEDIDAS || join(homedir(), 'kof-medidas');
const exe = process.env.KOF_APP;
const varJogo = ehPs2 ? `KOF_JOGO_${qual}` : `KOF_JOGO_${sistema.toUpperCase()}_${qual}`;
const jogo = process.env[varJogo];
const bios = process.env.KOF_BIOS_PS2;
for (const [n, v] of [['KOF_APP', exe], [varJogo, jogo], ...(ehPs2 ? [['KOF_BIOS_PS2', bios]] : [])])
  if (!v || !existsSync(v)) {
    console.error(`falta ${n} (ou o arquivo não existe)`);
    process.exit(2);
  }

const NOME = ehPs2 ? `Jogo pesado ${qual}` : `Jogo de teste ${sistema === 'gc' ? 'GameCube' : 'Wii'} ${qual}`;
const dados = join(medidas, 'dados');
// o jogo fica onde está: <Kof Games>/Games/ps2/<arquivo>. Na tela (e nos relatórios do 🩺, que ficam fora do
// repositório) aparece o nome de verdade; o que este programa imprime usa só "Jogo pesado A/B".
const raiz = resolve(jogo, '..', '..', '..');
const NA_TELA = basename(jogo).replace(/\.[^.]+$/, '');
mkdirSync(join(medidas, 'resultados'), { recursive: true });

// O app abre o navegador dele; este embrulho só acrescenta a porta de depuração pra gente olhar a página.
const NAVEGADORES = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'brave-browser'];
const navegador =
  process.env.KOF_NAVEGADOR ||
  NAVEGADORES.flatMap((n) => (process.env.PATH ?? '').split(':').map((d) => join(d, n))).find((p) => existsSync(p));
if (!navegador) {
  console.error('não achei um Chrome/Chromium (use KOF_NAVEGADOR)');
  process.exit(2);
}
const embrulho = join(medidas, 'navegador.sh');
writeFileSync(embrulho, `#!/bin/sh\nexec "${navegador}" "$@" --remote-debugging-port=${PORTA}\n`);
chmodSync(embrulho, 0o755);

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
const percentil = (v, p) => {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))];
};
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

function processos() {
  const r = [];
  for (const p of readdirSync('/proc').filter((x) => /^\d+$/.test(x)))
    try {
      const cmd = readFileSync(`/proc/${p}/cmdline`, 'utf8').replaceAll('\0', ' ');
      const st = readFileSync(`/proc/${p}/status`, 'utf8');
      r.push({
        pid: Number(p),
        cmd,
        pai: Number(/PPid:\s+(\d+)/.exec(st)?.[1] ?? 0),
        rss: Math.round(Number(/VmRSS:\s+(\d+)/.exec(st)?.[1] ?? 0) / 1024),
        troca: Math.round(Number(/VmSwap:\s+(\d+)/.exec(st)?.[1] ?? 0) / 1024),
      });
    } catch {
      // o processo acabou no meio da leitura
    }
  return r;
}

/** Roda na página: a cada vsync anota o instante e uma assinatura miúda do canvas do jogo (novo ou repetido?). */
function instalarSonda({ segundos, leve }) {
  const w = document.createElement('canvas');
  w.width = 64;
  w.height = 36;
  const g = w.getContext('2d', { willReadFrequently: true });
  const amostras = [];
  const fim = performance.now() + segundos * 1000;
  window.__inicioSonda = performance.now();
  window.__ritmo = new Promise((ok) => {
    // janela escondida não recebe vsync: o relógio garante que a sonda termina (e a rodada sai marcada)
    setTimeout(() => ok(amostras), segundos * 1000 + 1500);
    const laco = (t) => {
      if (t > fim) return ok(amostras);
      requestAnimationFrame(laco);
      // --sonda-leve: só o relógio de cada vsync (ler a tela espera a placa e pesa por conta própria); aí "quadro novo"
      // não é medido e cada vsync conta como novo
      if (leve) return void amostras.push([t, amostras.length]);
      const c = document.querySelector('#tela');
      if (!c || !g) return;
      g.drawImage(c, 0, 0, 64, 36);
      const d = g.getImageData(0, 0, 64, 36).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619);
      amostras.push([t, h >>> 0]);
    };
    requestAnimationFrame(laco);
  });
}

function lerCsv(arq) {
  if (!existsSync(arq)) return [];
  const [cab, ...linhas] = readFileSync(arq, 'utf8').trim().split('\n');
  const cols = cab.split(',');
  return linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], isNaN(Number(v)) ? v : Number(v)])));
}

/** O 🩺 Modo diagnóstico ligado antes de o app abrir (pela página não dá: ela regrava a configuração ao recarregar). */
function ligarDiagnostico() {
  const arq = join(dados, 'KOFstation', 'config', 'config.json');
  let c = { versao: 1, valores: {} };
  try {
    c = JSON.parse(readFileSync(arq, 'utf8'));
  } catch {
    // primeira vez: o arquivo ainda não existe
  }
  const emu = { geral: 'equilibrado', consoles: {}, jogos: {} };
  if (Object.keys(opcoes).length) emu.consoles[sistema] = { opcoes };
  c.valores = { ...c.valores, diagnostico: '1', emuOpcoes: JSON.stringify(emu) };
  mkdirSync(join(dados, 'KOFstation', 'config'), { recursive: true });
  writeFileSync(arq, JSON.stringify(c, null, 2));
}

const estado = arg('estado', '');
const TECLAS = tem('teclas')
  ? [
      [Math.round(segundos * 0.15), 'F5'],
      [Math.round(segundos * 0.45), 'F5'],
      [Math.round(segundos * 0.75), 'F8'],
    ]
  : [];
// --mexer: anda pelo cenário (setas seguradas 1–3 s, às vezes com o botão de correr) durante a medição
const MEXER = tem('mexer');

/** O estado escolhido vai pra loja do app de medição (mesmo nome de arquivo: a chave tem o jogo e o momento). */
function prepararEstado() {
  if (!estado) return;
  const loja = join(dados, 'KOFstation', 'lojas', 'estados');
  mkdirSync(loja, { recursive: true });
  for (const ext of ['.bin', '.json'])
    copyFileSync(estado.replace(/\.bin$/, ext), join(loja, basename(estado).replace(/\.bin$/, ext)));
}

async function rodada(n) {
  ligarDiagnostico();
  prepararEstado();
  const app = spawn(exe, [], {
    env: { ...process.env, XDG_DATA_HOME: dados, KOF_NAVEGADOR: embrulho, KOF_SEM_REDE: '1' },
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
  let nav;
  const fechar = async () => {
    // --fechar-janela: fecha o navegador como quem clica no X e espera o app sair sozinho (o caminho que deve gravar o
    // cartão de memória); confere se o cartão do PS2 foi tocado ao fechar
    if (tem('fechar-janela') && nav) {
      const cartoes = join(dados, 'KOFstation', 'nativo', 'sistema', 'ps2', 'pcsx2', 'memcards');
      const antes = Date.now();
      const s = await nav.newBrowserCDPSession().catch(() => null);
      await s?.send('Browser.close').catch(() => {});
      let saiu = false;
      for (let i = 0; i < 60 && !saiu; i++) {
        await dormir(500);
        saiu = app.exitCode !== null || app.signalCode !== null;
      }
      const tocados = existsSync(cartoes)
        ? readdirSync(cartoes).filter((f) => statSync(join(cartoes, f)).mtimeMs >= antes - 1000)
        : [];
      console.log(
        `fechar pela janela: o app ${saiu ? `saiu em ${((Date.now() - antes) / 1000).toFixed(1)} s` : 'NÃO saiu em 30 s'}; ` +
          `cartões gravados ao fechar: ${tocados.length ? tocados.join(', ') : 'nenhum'}`,
      );
    }
    await nav?.close().catch(() => {});
    try {
      process.kill(-app.pid, 'SIGTERM');
    } catch {
      // já saiu
    }
    // o Chrome do app (perfil da pasta de medidas) e o processo do jogo não podem sobrar pra próxima rodada
    for (let i = 0; i < 20; i++) {
      const sobras = processos().filter(
        (p) => p.cmd.includes(`--user-data-dir=${dados}`) || (p.cmd.startsWith(exe) && p.pai === app.pid),
      );
      if (!sobras.length) break;
      for (const p of sobras)
        try {
          process.kill(p.pid, i < 10 ? 'SIGTERM' : 'SIGKILL');
        } catch {
          // já saiu
        }
      await dormir(500);
    }
  };
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
    const print = async (nome) => {
      if (tem('print')) await page.screenshot({ path: join(medidas, 'resultados', `${nome}.png`) }).catch(() => {});
    };
    const token = new URL(page.url()).searchParams.get('t');
    const api = (cmd, args, bin) =>
      page.evaluate(
        async ([cmd, args, token, bin]) => {
          const t = token ?? sessionStorage.getItem('kofstation.token');
          const h = { 'X-Kof-Token': t };
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
    // preparo (só muda alguma coisa na primeira vez): pasta dos jogos, BIOS e o modo diagnóstico ligado
    const sis = await api('nativo.disponivel', {});
    if (!sis.sistemas?.includes(sistema))
      throw new Error(
        `este KOFstation não tem o núcleo de ${sistema} na pasta nativo/ (${JSON.stringify(sis).slice(0, 200)})`,
      );
    const pasta0 = await api('library.root.set', { path: raiz });
    if (pasta0?.code) throw new Error(`a pasta dos jogos não foi aceita: ${JSON.stringify(pasta0)}`);
    if (tem('print')) console.log('pasta dos jogos:', JSON.stringify(pasta0).slice(0, 300));
    const b = ehPs2 ? readFileSync(bios) : Buffer.alloc(0);
    if (ehPs2)
      await api(
        'store.put',
        {
          store: 'bios',
          key: 'bios-ps2.bin',
          meta: { arquivo: 'bios-ps2.bin', sistema: 'ps2', nome: 'bios.bin', tamanho: b.length },
        },
        b.toString('base64'),
      );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#home', { timeout: 60000 });
    // a tela de abertura ("pressione qualquer botão") e as boas-vindas da primeira vez
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      await dormir(700);
    }
    // a tela de abertura ("pressione qualquer botão") e as boas-vindas da primeira vez
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      await dormir(700);
    }
    // a tela de abertura ("pressione qualquer botão") e as boas-vindas da primeira vez
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      await dormir(700);
    }
    await print(`${rotulo}-${qual}-${n}-0-inicio`);

    const antes = new Set(
      existsSync(join(dados, 'KOFstation', 'diagnostico')) ? readdirSync(join(dados, 'KOFstation', 'diagnostico')) : [],
    );
    await page.keyboard.press('Control+KeyL');
    await page.waitForSelector('#roms li', { timeout: 30000 }).catch(() => {});
    // a lista mostra só os primeiros 150: procura pelo nome
    await page.locator('input[placeholder^="procure"]').first().fill(NA_TELA);
    await dormir(800);
    await print(`${rotulo}-${qual}-${n}-0-biblioteca`);
    await page.locator('#roms li', { hasText: NA_TELA }).first().click();
    await page.keyboard.press('Enter');
    await dormir(4000);
    await print(`${rotulo}-${qual}-${n}-1-abrindo`);
    await page.waitForFunction((nome) => document.querySelector('#st-jogo')?.textContent === nome, NA_TELA, {
      timeout: 90000,
    });
    const aberto = Date.now();
    await dormir(1500);
    const modo = page.locator('#modo-tela button').first();
    if (await modo.isVisible().catch(() => false)) await modo.click();
    if (!tem('janela')) await page.keyboard.press('F11'); // tela cheia, como se joga
    await dormir(1000);
    await print(`${rotulo}-${qual}-${n}-1-aberto`);
    if (estado) {
      await dormir(3000);
      await page.keyboard.press('F8');
    }

    // memória: uma amostra por segundo do processo do jogo e da página
    const mem = { filho: [], pagina: [], chrome: [], trocaFilho: 0 };
    const relogio = setInterval(() => {
      const ps = processos();
      const filho = ps.find((p) => p.cmd.startsWith(exe) && p.cmd.includes('--nativo'));
      const pag = ps
        .filter((p) => p.cmd.includes('--type=renderer') && p.cmd.includes(dados))
        .sort((a, b) => b.rss - a.rss)[0];
      const gpu = ps.find((p) => p.cmd.includes('--type=gpu-process') && p.cmd.includes(dados));
      if (filho) {
        mem.filho.push(filho.rss);
        mem.trocaFilho = Math.max(mem.trocaFilho, filho.troca);
      }
      if (pag) mem.pagina.push(pag.rss + (gpu?.rss ?? 0));
      // 3.2: o Chrome do app inteiro (principal, renderers, GPU, utilitários, zygote)
      const todos = ps.filter((p) => p.cmd.includes(`--user-data-dir=${dados}`));
      if (todos.length) mem.chrome.push(todos.reduce((a, p) => a + p.rss, 0));
    }, 1000);
    // --memoria: a cada 5 s, o renderer da página (RAM + swap) e a pilha do JS, pra achar vazamento (2.3)
    const serie = [];
    const t0 = Date.now();
    const sonda = tem('memoria')
      ? setInterval(() => {
          const ps = processos().filter((p) => p.cmd.includes(dados));
          const tot = (l) => l.reduce((a, p) => a + p.rss + p.troca, 0);
          const pag = ps
            .filter((p) => p.cmd.includes('--type=renderer'))
            .sort((a, b) => b.rss + b.troca - (a.rss + a.troca))[0];
          const gpu = tot(ps.filter((p) => p.cmd.includes('--type=gpu-process')));
          const princ = tot(ps.filter((p) => !p.cmd.includes('--type=')));
          const todo = tot(ps);
          void page
            .evaluate(() => {
              const m = performance.memory;
              return m ? Math.round(m.usedJSHeapSize / 1048576) : -1;
            })
            .catch(() => -1)
            .then((js) =>
              serie.push({
                s: Math.round((Date.now() - t0) / 1000),
                rss: pag?.rss ?? 0,
                troca: pag?.troca ?? 0,
                js,
                gpu,
                princ,
                todo,
              }),
            );
        }, 5000)
      : null;

    await dormir(aquecer * 1000);
    await print(`${rotulo}-${qual}-${n}-2-trecho`);
    const mostrarSerie = () => {
      if (!sonda) return;
      clearInterval(sonda);
      console.log(
        'memória (s: renderer, JS, GPU, principal, Chrome todo; RAM+swap MB): ' +
          serie.map((x) => `${x.s}: ${x.rss + x.troca}, ${x.js}, ${x.gpu}, ${x.princ}, ${x.todo}`).join(' · '),
      );
    };
    process.once('exit', mostrarSerie);
    // --sem-cdp: solta a depuração do Chrome (ela guarda cada mensagem da WebSocket pras ferramentas e o processo
    // principal cresce ~600 MB/min) e só olha a memória pelo /proc, a cada 10 s; sem sonda, sem teclas (2.3)
    if (tem('sem-cdp')) {
      clearInterval(relogio);
      if (sonda) clearInterval(sonda);
      await nav.close().catch(() => {});
      nav = null;
      const linhas = [];
      for (let s = 0; s <= segundos; s += 10) {
        const ps = processos().filter((p) => p.cmd.includes(dados));
        const tot = (l) => l.reduce((a, p) => a + p.rss + p.troca, 0);
        const filho = processos().find((p) => p.cmd.startsWith(exe) && p.cmd.includes('--nativo'));
        linhas.push(
          `${s}: principal ${tot(ps.filter((p) => !p.cmd.includes('--type=')))}, renderer ${tot(ps.filter((p) => p.cmd.includes('--type=renderer')))}, GPU ${tot(ps.filter((p) => p.cmd.includes('--type=gpu-process')))}, Chrome ${tot(ps)}, jogo ${filho ? filho.rss + filho.troca : 0}`,
        );
        if (s < segundos) await dormir(10000);
      }
      console.log('sem CDP (RAM+swap MB):\n  ' + linhas.join('\n  '));
      clearInterval(relogio);
      return;
    }
    const inicioTrecho = Date.now() - aberto;
    await page.evaluate(instalarSonda, { segundos, leve: tem('sonda-leve') });
    const teclas = [];
    let mexendo = MEXER;
    const mexer = (async () => {
      const setas = ['ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
      for (let i = 0; mexendo; i++) {
        const seta = setas[i % setas.length];
        await page.keyboard.down(seta);
        if (i % 3 === 0) await page.keyboard.down('KeyX');
        await dormir(1000 + ((i * 700) % 2000));
        await page.keyboard.up('KeyX');
        await page.keyboard.up(seta);
        await dormir(200);
      }
    })();
    for (const [s, tecla] of TECLAS) {
      const quando = await page.evaluate(() => performance.now());
      const espera = s * 1000 - (quando - (await page.evaluate(() => window.__inicioSonda ?? 0)));
      if (espera > 0) await dormir(espera);
      teclas.push({ tecla, t: await page.evaluate(() => performance.now()) });
      // --perfil: o profiler do Chrome nos 4 s depois da tecla; imprime as funções que mais pararam a página
      const cdp = tem('perfil') ? await page.context().newCDPSession(page) : null;
      if (cdp) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
        await cdp.send('Profiler.start');
      }
      await page.keyboard.press(tecla);
      if (cdp) {
        await dormir(4000);
        const { profile } = await cdp.send('Profiler.stop');
        const dt = {};
        const nos = new Map(profile.nodes.map((x) => [x.id, x]));
        profile.samples.forEach((id, i) => {
          const x = nos.get(id);
          const f = x.callFrame;
          const k = `${f.functionName || '(anônima)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
          dt[k] = (dt[k] ?? 0) + (profile.timeDeltas[i + 1] ?? 0) / 1000;
        });
        console.log(
          `perfil ${tecla}: ` +
            Object.entries(dt)
              .filter(([k]) => !k.startsWith('(idle)'))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([k, v]) => `${Math.round(v)} ms ${k}`)
              .join(' | '),
        );
        await cdp.detach();
      }
    }
    const amostras = await page.evaluate(() => window.__ritmo);
    mexendo = false;
    await mexer;
    await print(`${rotulo}-${qual}-${n}-3-fim`);
    await dormir(7000); // o gravador do diagnóstico descarrega a cada 5 s
    clearInterval(relogio);
    const log = await api('nativo.log', {}).catch(() => ({}));

    const pasta = readdirSync(join(dados, 'KOFstation', 'diagnostico'))
      .filter((d) => !antes.has(d))
      .sort()
      .pop();
    if (!pasta) throw new Error('o modo diagnóstico não gravou sessão');
    const dir = join(dados, 'KOFstation', 'diagnostico', pasta);
    // o relógio do CSV começa perto da abertura do jogo: o trecho é [fim-segundos, fim] do que a sonda viu
    const todos = lerCsv(join(dir, 'quadros.csv'));
    const fimCsv = (todos.at(-1)?.t_ms ?? 0) - 7000;
    const q = todos.filter((x) => x.t_ms >= fimCsv - segundos * 1000 && x.t_ms <= fimCsv);
    const dt = q.slice(1).map((x, i) => x.t_ms - q[i].t_ms);
    const seg = lerCsv(join(dir, 'segundos.csv')).filter(
      (s) => s.t_s * 1000 >= fimCsv - segundos * 1000 && s.t_s * 1000 <= fimCsv,
    );
    const cpu = {};
    for (const k of Object.keys(seg[0] ?? {}).filter((k) => k.startsWith('cpu_')))
      cpu[k.slice(4).replace(/_pct$/, '')] = Math.round(media(seg.map((s) => Number(s[k]) || 0)));

    // a página, pelo olho: quadro novo ou repetido a cada vsync
    let novos = 0;
    let repetidos = 0;
    let maiorSeq = 0;
    let seq = 0;
    const entreNovos = [];
    let ultimoNovo = amostras[0]?.[0] ?? 0;
    for (let i = 1; i < amostras.length; i++) {
      if (amostras[i][1] === amostras[i - 1][1]) {
        repetidos++;
        seq++;
        maiorSeq = Math.max(maiorSeq, seq);
      } else {
        novos++;
        seq = 0;
        entreNovos.push(amostras[i][0] - ultimoNovo);
        ultimoNovo = amostras[i][0];
      }
    }
    const vs = amostras.slice(1).map((a, i) => a[0] - amostras[i][0]);
    // depois de cada tecla: a maior parada da página (vsync sem desenhar) e o maior tempo sem quadro novo, em 8 s
    const depois = teclas.map(({ tecla, t }) => {
      const j = amostras.filter((a) => a[0] >= t - 50 && a[0] <= t + 8000);
      let pagina = 0;
      let semNovo = 0;
      let ult = j[0]?.[0] ?? t;
      for (let i = 1; i < j.length; i++) {
        pagina = Math.max(pagina, j[i][0] - j[i - 1][0]);
        if (j[i][1] !== j[i - 1][1]) {
          semNovo = Math.max(semNovo, j[i][0] - ult);
          ult = j[i][0];
        }
      }
      return { tecla, paginaParadaMs: Math.round(pagina), semQuadroNovoMs: Math.round(semNovo) };
    });
    const min = segundos / 60;
    return {
      rodada: n,
      janelaVisivel: amostras.length > segundos * 30, // menos que 30 vsync/s: a janela estava coberta ou minimizada
      sessao: pasta,
      vivo: log.vivo ?? null,
      inicioTrechoS: Math.round(inicioTrecho / 1000),
      quadros: q.length,
      fps: r1(q.length / segundos),
      p50: r2(percentil(dt, 50)),
      p95: r2(percentil(dt, 95)),
      p99: r2(percentil(dt, 99)),
      max: r2(Math.max(0, ...dt)),
      engasgosMin: r1(dt.filter((d) => d > 1.5 * ALVO_MS).length / min),
      nucleoP50: r2(
        percentil(
          q.map((x) => x.nucleo_ms),
          50,
        ),
      ),
      nucleoP99: r2(
        percentil(
          q.map((x) => x.nucleo_ms),
          99,
        ),
      ),
      leituraP50: r2(
        percentil(
          q.map((x) => x.leitura_ms),
          50,
        ),
      ),
      leituraP99: r2(
        percentil(
          q.map((x) => x.leitura_ms),
          99,
        ),
      ),
      envioP50: r2(
        percentil(
          q.map((x) => x.envio_ms),
          50,
        ),
      ),
      envioP99: r2(
        percentil(
          q.map((x) => x.envio_ms),
          99,
        ),
      ),
      paginaP50: r2(
        percentil(
          q.map((x) => x.pagina_ms),
          50,
        ),
      ),
      paginaP99: r2(
        percentil(
          q.map((x) => x.pagina_ms),
          99,
        ),
      ),
      somFilaP50: r1(
        percentil(
          q.map((x) => x.som_fila_ms),
          50,
        ),
      ),
      faltasDeSom: q.reduce((a, x) => a + (x.faltas || 0), 0),
      cpu,
      teclas: depois,
      tela: {
        vsyncHz: r1(1000 / percentil(vs, 50)),
        vsyncP99: r2(percentil(vs, 99)),
        novosPorS: r1(novos / segundos),
        repetidosMin: Math.round(repetidos / min),
        maiorSeqRepetida: maiorSeq,
        entreNovosP50: r2(percentil(entreNovos, 50)),
        entreNovosP99: r2(percentil(entreNovos, 99)),
        entreNovosMax: r2(Math.max(0, ...entreNovos)),
        pausasMin: r1(entreNovos.filter((d) => d > 2.5 * ALVO_MS).length / min),
      },
      memoria: {
        filhoMb: Math.max(0, ...mem.filho),
        filhoFimMb: mem.filho.at(-1) ?? 0,
        trocaFilhoMb: mem.trocaFilho,
        paginaMb: Math.max(0, ...mem.pagina),
        paginaInicioMb: mem.pagina[0] ?? 0,
        paginaFimMb: mem.pagina.at(-1) ?? 0,
        chromeMb: Math.max(0, ...mem.chrome),
        chromeFimMb: mem.chrome.at(-1) ?? 0,
        filhoInicioMb: mem.filho[0] ?? 0,
      },
    };
  } finally {
    await fechar();
  }
}

const linha = (r) =>
  `#${r.rodada}${r.janelaVisivel ? '' : ' [JANELA ESCONDIDA: os números da tela não valem]'} fps ${r.fps} · quadro p50/p95/p99/máx ${r.p50}/${r.p95}/${r.p99}/${r.max} ms · engasgos ${r.engasgosMin}/min · ` +
  `núcleo ${r.nucleoP50}/${r.nucleoP99} leitura ${r.leituraP50}/${r.leituraP99} envio ${r.envioP50}/${r.envioP99} página ${r.paginaP50}/${r.paginaP99} ms (p50/p99) · ` +
  `som ${r.somFilaP50} ms, faltas ${r.faltasDeSom} · tela: ${r.tela.novosPorS} novos/s, ${r.tela.repetidosMin} repetidos/min, pausas ${r.tela.pausasMin}/min, ` +
  `entre novos p99/máx ${r.tela.entreNovosP99}/${r.tela.entreNovosMax} ms (vsync ${r.tela.vsyncHz} Hz) · ` +
  (r.teclas.length
    ? `teclas: ${r.teclas.map((k) => `${k.tecla} página parada ${k.paginaParadaMs} ms, sem quadro novo ${k.semQuadroNovoMs} ms`).join(' | ')} · `
    : '') +
  `CPU ${Object.entries(r.cpu)
    .map(([k, v]) => `${k} ${v}%`)
    .join(
      ' ',
    )} · memória jogo ${r.memoria.filhoInicioMb}→${r.memoria.filhoFimMb} (máx ${r.memoria.filhoMb}) MB (troca ${r.memoria.trocaFilhoMb}), página ${r.memoria.paginaInicioMb}→${r.memoria.paginaFimMb} (máx ${r.memoria.paginaMb}) MB, Chrome inteiro máx ${r.memoria.chromeMb} → fim ${r.memoria.chromeFimMb} MB`;

console.log(
  `${NOME} · ${rotulo} · ${rodadas} rodada(s) · aquece ${aquecer} s, mede ${segundos} s · opções ${JSON.stringify(opcoes)}`,
);
const res = [];
for (let n = 1; n <= rodadas; n++) {
  try {
    const r = await rodada(n);
    if (!r) continue; // --sem-cdp: a série de memória já saiu na tela
    res.push(r);
    console.log(linha(r));
  } catch (e) {
    console.log(`#${n} FALHOU: ${e.message}`);
  }
}
if (res.length > 1) {
  const faixa = (f) => {
    const v = res.map(f);
    return `${Math.min(...v)}–${Math.max(...v)}`;
  };
  console.log(
    `variação: fps ${faixa((r) => r.fps)} · p99 ${faixa((r) => r.p99)} ms · engasgos ${faixa((r) => r.engasgosMin)}/min · ` +
      `repetidos na tela ${faixa((r) => r.tela.repetidosMin)}/min · pausas ${faixa((r) => r.tela.pausasMin)}/min · faltas de som ${faixa((r) => r.faltasDeSom)}`,
  );
}
const saida = join(
  medidas,
  'resultados',
  `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}-${rotulo}-${qual}.json`,
);
writeFileSync(saida, JSON.stringify({ jogo: NOME, rotulo, opcoes, aquecer, segundos, rodadas: res }, null, 2));
console.log(`guardado em ${saida.replace(homedir(), '~')}`);
process.exit(res.length === rodadas ? 0 : 1);
