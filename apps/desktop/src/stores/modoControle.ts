// O celular como controle do PC e o 🖥 Jogar no PC, do lado do CELULAR (`entrarModoControle` do web/android.js do antigo).
// Três jeitos, escolhidos por quem chama:
//  - Jogar no PC (`pc`): o PC roda o jogo e manda imagem e som por WebRTC; os botões voltam pelo canal de dados;
//  - pela rede pareada (`rede`): "botões,eixos" no canal `pad` do 📡 Aparelhos (o PC diz o jogador e o console);
//  - servidor do APK (`ControleServidor.java`, KOFnesApk.controle*): o PC conecta por endereço e senha (Arquivo → Celular como controle).
// Os botões vêm do controle de toque (stores/toque), como no antigo.
import { empacotarEixos } from '@kof/engine';
import { trocarLocal } from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { aoQuadroNovo, ultimoQuadro } from './jogo';
import { ouvirRede, usarRede } from './rede';
import { soltarToque, toque } from './toque';

type Apk = Record<string, (...a: never[]) => unknown>;
const apk = (): Apk | undefined => (globalThis as { KOFnesApk?: Apk }).KOFnesApk;
const chamarApk = (n: string, ...a: unknown[]): unknown =>
  (apk()?.[n] as ((...x: unknown[]) => unknown) | undefined)?.(...a);

export interface ItemDoMenu {
  i: number;
  t: string;
  v: string;
  aj: boolean;
}

export interface EstadoMC {
  ativo: boolean;
  ligado: boolean;
  /** endereço e senha à mostra (nunca conectou, ou o ⓘ) */
  pareando: boolean;
  status: string;
  sisNome: string;
  jogoNome: string;
  endereco: string;
  dica: string;
  /** Jogar no PC */
  remoto: boolean;
  filtro: boolean;
  ping: string;
  menuAberto: boolean;
  menuItens: ItemDoMenu[];
  stream: MediaStream | null;
  /** console do jogo do PC (muda os rótulos e os botões do controle) */
  sis: string;
  jogador: number;
  info: boolean;
}

const vazio: EstadoMC = {
  ativo: false,
  ligado: false,
  pareando: false,
  status: '',
  sisNome: '',
  jogoNome: '',
  endereco: '',
  dica: '',
  remoto: false,
  filtro: true,
  ping: '',
  menuAberto: false,
  menuItens: [],
  stream: null,
  sis: '',
  jogador: 0,
  info: false,
};

export const usarMC = create<EstadoMC>()(() => vazio);

const CONSOLE_PARECIDO: Record<string, string> = { ps2: 'ps1', gbc: 'gb' };
const NOME_CONSOLE: Record<string, string> = {
  snes: 'Super Nintendo',
  gb: 'Game Boy',
  gbc: 'Game Boy Color',
  nes: 'NES',
  md: 'Mega Drive',
  sms: 'Master System',
  gba: 'Game Boy Advance',
  neogeo: 'Neo Geo',
  gg: 'Game Gear',
  ps1: 'PlayStation',
  n64: 'Nintendo 64',
  ps2: 'PlayStation 2',
};

interface Rodando {
  pc: string | null;
  rede: string | null;
  b: number;
  e: number;
  quando: number;
  visto: number;
  n: number;
  nomePc: string;
  jogo: string;
  extra: number;
  menu: number;
  timer: number;
  rtc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  prazo: number;
  tam: [number, number] | null;
  ouvinte: (() => void) | null;
  an: 'misto' | 'puro';
}
let m: Rodando | null = null;

const avisar = (t: string, ms?: number) => usarAvisos.getState().avisar(t, ms);
const mandarJogo = (para: string, o: unknown) =>
  usarRede.getState().mandar({ t: 'enviar', para, canal: 'jogo', dados: JSON.stringify(o) });

function esperarIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((ok) => {
    const fim = () => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', fim);
      ok();
    };
    pc.addEventListener('icegatheringstatechange', fim);
    setTimeout(ok, 2500);
  });
}

/** O PC abriu outro jogo (ou nenhum): o controle troca de console. */
function consoleDoControle(sis: string, nome: string) {
  const base = CONSOLE_PARECIDO[sis] ?? sis;
  document.body.dataset.sis = NOME_CONSOLE[base] ? base : 'ps1';
  if (m) m.an = sis === 'n64' || sis === 'ps2' ? 'puro' : 'misto';
  usarMC.setState({
    sis: sis ? base : '',
    sisNome: sis ? (NOME_CONSOLE[sis] ?? sis) : 'nenhum jogo aberto',
    jogoNome: sis ? nome : 'abra um jogo no PC',
  });
}

function marcar() {
  if (!m) return;
  const ligado = m.n > 0;
  const pareado = config().ler('controlePareado') === '1';
  const s = usarMC.getState();
  usarMC.setState({
    ligado,
    pareando: s.info || (!ligado && !pareado),
    status: ligado ? m.nomePc || 'PC' : pareado ? 'procurando o PC…' : 'esperando o PC…',
  });
}

const deadzone = (v: number) => (Math.abs(v) < 0.15 ? 0 : Math.round(Math.max(-1, Math.min(1, v)) * 32767));

/** A cada 8 ms: manda o que os dedos seguram (só quando muda, ou a cada 250 ms). */
function enviar() {
  if (!m) return;
  const agora = performance.now();
  const b = (toque.bits & 0xffff) | m.extra | (agora - m.menu < 150 ? 0x3000 : 0);
  const e = empacotarEixos([deadzone(toque.eixos[0] ?? 0), deadzone(toque.eixos[1] ?? 0), 0, 0]);
  const mudou = b !== m.b || e !== m.e || agora - m.quando > 250;
  if (m.pc) {
    const dc = m.dc;
    if (!dc || dc.readyState !== 'open') return;
    if (mudou) {
      dc.send(new Int8Array([b, b >> 8, e, e >> 8, e >> 16, e >> 24]).buffer);
      m.b = b;
      m.e = e;
      m.quando = agora;
    }
    if (agora - m.visto > 1000) {
      m.visto = agora;
      dc.send('p' + agora);
    }
    return;
  }
  if (m.rede) {
    if (mudou) {
      usarRede.getState().mandar({ t: 'enviar', para: m.rede, canal: 'pad', dados: b + ',' + e });
      m.b = b;
      m.e = e;
      m.quando = agora;
    }
    return;
  }
  if (mudou) {
    chamarApk('controleEnviar', b, e);
    m.b = b;
    m.e = e;
    m.quando = agora;
  }
  if (agora - m.visto > 300) {
    m.visto = agora;
    const t = String(chamarApk('controleEstado') ?? '0');
    const [n = '0', nomePc = '', sis = '', jogo = ''] = t.includes('\t') ? t.split('\t') : t.split('|');
    if (+n !== m.n || nomePc !== m.nomePc) {
      if (+n > 0 && !(m.n > 0)) {
        config().guardar('controlePareado', '1');
        usarMC.setState({ info: false });
      }
      m.n = +n;
      m.nomePc = nomePc;
      marcar();
    }
    const j = +n > 0 ? sis + '\t' + jogo : '\t';
    if (j !== m.jogo) {
      m.jogo = j;
      consoleDoControle(+n > 0 ? sis : '', jogo);
    }
  }
}

/** Os PCs pareados que estão na rede agora. */
export const pcOnline = () => usarRede.getState().aparelhos.find((a) => a.online && a.tipo === 'pc') ?? null;

export function entrarModoControle(op: { pc?: string; jogo?: Record<string, string> } = {}): void {
  const pcId = op.pc ?? null;
  const pcRede = !pcId ? pcOnline() : null;
  // Jogar no PC e o controle pela rede usam a rede entre aparelhos (do backend); o servidor de endereço e senha é do APK
  if ((pcId ?? pcRede) ? !usarRede.getState().ok : !apk()?.['controleIniciar']) {
    avisar(
      (pcId ?? pcRede)
        ? 'a rede entre aparelhos não está ligada agora'
        : 'isso precisa do app KOFstation (APK) no celular',
      4000,
    );
    return;
  }
  let r: { ip?: string; porta?: number; senha?: string; erro?: string; casa?: boolean } = {};
  if (!pcId && !pcRede) {
    try {
      r = JSON.parse(String(chamarApk('controleIniciar') ?? '{}')) as typeof r;
    } catch {
      r = { erro: 'a casca respondeu algo ilegível' };
    }
    if (r.erro || !r.ip) {
      avisar('não consegui abrir o controle: ' + (r.erro ?? 'o celular está sem Wi-Fi?'), 5000);
      return;
    }
  }
  if (m) sairModoControle();
  document.body.classList.add('modo-controle', 'cel-jogo');
  const pcNome = pcId ? (usarRede.getState().aparelhos.find((a) => a.id === pcId)?.nome ?? 'PC') : (pcRede?.nome ?? '');
  m = {
    pc: pcId,
    rede: pcRede ? pcRede.id : null,
    b: -1,
    e: -1,
    quando: 0,
    visto: 0,
    n: -1,
    nomePc: '',
    jogo: '',
    extra: 0,
    menu: 0,
    timer: 0,
    rtc: null,
    dc: null,
    prazo: 0,
    tam: null,
    ouvinte: null,
    an: 'misto',
  };
  usarMC.setState({
    ...vazio,
    ativo: true,
    remoto: !!pcId,
    filtro: config().ler('remotoFiltro') !== '0',
    endereco: pcId || pcRede ? '' : `${r.ip}${r.porta !== 8642 ? ':' + r.porta : ''} ${r.senha}`,
    dica:
      r.casa === false
        ? '⚠️ o celular não parece estar na Wi-Fi (4G ou VPN?): ligue a Wi-Fi da mesma rede do PC'
        : `Não conectou? No navegador do PC abra http://${r.ip}:${r.porta}`,
    status: pcId ? 'chamando o PC…' : pcRede ? 'chamando ' + pcRede.nome + '…' : 'procurando o PC…',
  });
  consoleDoControle('', '');
  marcar();
  if (pcRede) usarMC.setState({ status: 'chamando ' + pcRede.nome + '…' });
  m.timer = setInterval(enviar, 8) as unknown as number;
  window.dispatchEvent(new Event('resize'));
  if (pcId) conectarAoPc(m, pcId, pcNome, op.jogo ?? null);
}

export function sairModoControle(): void {
  const x = m;
  if (!x) return;
  clearInterval(x.timer);
  m = null;
  soltarToque();
  if (x.rede) usarRede.getState().mandar({ t: 'enviar', para: x.rede, canal: 'pad', dados: '0,0' }); // solta tudo no PC
  if (x.pc) {
    clearTimeout(x.prazo);
    mandarJogo(x.pc, { t: 'fim' });
    x.ouvinte?.();
    try {
      x.rtc?.close();
    } catch {
      // a conexão já estava fechada
    }
  } else if (!x.rede)
    try {
      chamarApk('controleParar');
    } catch {
      // sem ponte: nada a parar
    }
  document.body.classList.remove('modo-controle', 'cel-jogo', 'remoto-filtro');
  delete document.body.dataset.sis;
  usarMC.setState({ ...vazio });
}

function conectarAoPc(x: Rodando, pcId: string, pcNome: string, jogo: Record<string, string> | null) {
  x.ouvinte = ouvirRede((msg) => {
    if (msg.t !== 'msg' || msg.canal !== 'jogo' || msg.de !== pcId || m !== x) return;
    let p: { t?: string; texto?: string; sdp?: string };
    try {
      p = JSON.parse(msg.dados) as typeof p;
    } catch {
      return; // mensagem torta: ignora
    }
    if (p.t === 'erro') {
      avisar('🖥 ' + (p.texto ?? 'o PC recusou'), 7000);
      sairModoControle();
      return;
    }
    if (p.t !== 'oferta' || x.rtc || !p.sdp) return;
    const pc = new RTCPeerConnection({ iceServers: [] });
    x.rtc = pc;
    pc.ontrack = (e) => {
      try {
        (e.receiver as unknown as { playoutDelayHint: number }).playoutDelayHint = 0;
        (e.receiver as unknown as { jitterBufferTarget: number }).jitterBufferTarget = 0;
      } catch {
        // navegador antigo: sem controle do atraso
      }
      const s = e.streams[0];
      if (s) usarMC.setState({ stream: s });
    };
    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.binaryType = 'arraybuffer';
      x.dc = dc;
      dc.onopen = () => {
        clearTimeout(x.prazo);
        x.n = 1;
        x.nomePc = pcNome;
        marcar();
      };
      dc.onmessage = (ev: MessageEvent<unknown>) => {
        if (typeof ev.data !== 'string') return;
        if (ev.data[0] === 'P') {
          usarMC.setState({ ping: '📶 ' + Math.round(performance.now() - +ev.data.slice(1)) + ' ms' });
          return;
        }
        let j: { t?: string; itens?: ItemDoMenu[]; a?: string | number; sis?: string; nome?: string; l?: number };
        try {
          j = JSON.parse(ev.data) as typeof j;
        } catch {
          return;
        }
        if (j.t === 'menu') usarMC.setState({ menuItens: j.itens ?? [] });
        else if (j.t === 'feito')
          avisar(
            j.a === 'salvar-estado'
              ? '💾 estado salvo no PC'
              : j.a === 'carregar-ultimo'
                ? '📂 último estado carregado'
                : j.a === 'home'
                  ? '🏠 Início do PC'
                  : '✅ ' + (j.a ?? ''),
            2500,
          );
        else if (j.t === 'jogo') {
          if (j.l) x.tam = [j.l, Number(j.a)]; // no 'jogo', `a` é a altura
          const k = j.sis + '\t' + j.nome;
          if (k !== x.jogo) {
            x.jogo = k;
            consoleDoControle(j.sis ?? '', j.nome ?? '');
          }
        }
      };
      dc.onclose = () => {
        if (m === x) {
          avisar('🖥 a conexão com o PC caiu', 5000);
          sairModoControle();
        }
      };
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && m === x) {
        avisar('🖥 não deu pra receber a imagem do PC (mesma Wi-Fi?)', 6000);
        sairModoControle();
      }
    };
    void (async () => {
      try {
        const ip = usarRede.getState().aparelhos.find((a) => a.id === pcId)?.ip;
        await pc.setRemoteDescription({ type: 'offer', sdp: trocarLocal(p.sdp ?? '', ip) });
        await pc.setLocalDescription(await pc.createAnswer());
        await esperarIce(pc);
        if (m === x) mandarJogo(pcId, { t: 'resposta', sdp: pc.localDescription?.sdp });
      } catch (er) {
        avisar('🖥 ' + (er instanceof Error ? er.message : String(er)), 6000);
        sairModoControle();
      }
    })();
  });
  mandarJogo(pcId, { t: 'pedir', jogo });
  x.prazo = setTimeout(() => {
    if (m === x && !x.dc) {
      avisar('🖥 o PC não respondeu: o KOFstation está aberto nele?', 6000);
      sairModoControle();
    }
  }, 20000) as unknown as number;
}

// ---------------------------------------------------------------- ações da tela do controle

/** 💾 📂 🏠 do controle: no Jogar no PC pelo canal de dados; no celular como controle, pela rede (precisa estar pareado). */
export function atalhoPc(a: string) {
  const x = m;
  if (!x) return;
  if (x.pc) {
    if (x.dc?.readyState === 'open') x.dc.send(JSON.stringify({ t: 'acao', a }));
    return;
  }
  const pcs = usarRede.getState().aparelhos.filter((p) => p.online && p.tipo === 'pc');
  const pc = pcs.find((p) => p.nome === x.nomePc) ?? pcs[0];
  if (!pc) {
    avisar('pareie este celular com o PC em 📡 Aparelhos pra usar 💾 📂 🏠', 5000);
    return;
  }
  mandarJogo(pc.id, { t: 'acao', a });
}

export function rebobinarNoPc(sim: boolean) {
  if (m) m.extra = sim ? 0x6000 : 0; // Select+Y no PC
}

export function menuDoPc() {
  const x = m;
  if (!x) return;
  if (!x.pc) {
    x.menu = performance.now(); // Select+Start: abre o menu rápido do PC (a TV)
    return;
  }
  const s = usarMC.getState();
  if (s.menuAberto) usarMC.setState({ menuAberto: false });
  else {
    usarMC.setState({ menuAberto: true });
    if (x.dc?.readyState === 'open') x.dc.send(JSON.stringify({ t: 'menu' }));
  }
}

export function itemDoMenuPc(i: number, d: number) {
  const x = m;
  if (x?.dc?.readyState === 'open') x.dc.send(JSON.stringify({ t: 'menu-item', i, d }));
  if (d === 0) usarMC.setState({ menuAberto: false });
}

export function alternarFiltroRemoto() {
  const f = !usarMC.getState().filtro;
  config().guardar('remotoFiltro', f ? '1' : '0');
  usarMC.setState({ filtro: f });
}

export function mostrarInfoDoControle() {
  usarMC.setState({ info: !usarMC.getState().info });
  marcar();
}

/** 🎛 filtro do celular por cima do vídeo: cada quadro volta pro tamanho do jogo e passa pelo mesmo desenho dos jogos daqui. */
export function puxarVideo(v: HTMLVideoElement): () => void {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  let vivo = true;
  const vez = () =>
    'requestVideoFrameCallback' in v
      ? (v as unknown as { requestVideoFrameCallback: (f: () => void) => void }).requestVideoFrameCallback(quadro)
      : requestAnimationFrame(quadro);
  const quadro = () => {
    if (!vivo) return;
    const x = m;
    if (x && usarMC.getState().filtro && x.tam && v.videoWidth && g) {
      const [l, a] = x.tam;
      if (cv.width !== l || cv.height !== a) {
        cv.width = l;
        cv.height = a;
      }
      g.imageSmoothingEnabled = false;
      g.drawImage(v, 0, 0, l, a);
      const px = new Uint32Array(g.getImageData(0, 0, l, a).data.buffer.slice(0));
      Object.assign(ultimoQuadro, { pixels: px, largura: l, altura: a, novo: true });
      for (const f of aoQuadroNovo) f();
    }
    vez();
  };
  vez();
  return () => {
    vivo = false;
  };
}

// celular como controle pela rede: o PC diz o número do jogador e o console do jogo aberto
ouvirRede((msg) => {
  if (msg.t !== 'msg') return;
  const x = m;
  if (msg.canal === 'pad-ok' && x && x.rede === msg.de) {
    let p: { jogador: number; sis?: string; nome?: string };
    try {
      p = JSON.parse(msg.dados) as typeof p;
    } catch {
      return;
    }
    const pc = usarRede.getState().aparelhos.find((a) => a.id === msg.de);
    if (!(x.n > 0)) config().guardar('controlePareado', '1');
    x.n = 1;
    x.nomePc = (pc ? pc.nome : 'PC') + ' · Jogador ' + p.jogador;
    usarMC.setState({ jogador: p.jogador });
    marcar();
    const k = (p.sis ?? '') + '\t' + (p.nome ?? '');
    if (k !== x.jogo) {
      x.jogo = k;
      consoleDoControle(p.sis ?? '', p.nome ?? '');
    }
  } else if (msg.canal === 'jogo') {
    let p: { t?: string; a?: string };
    try {
      p = JSON.parse(msg.dados) as typeof p;
    } catch {
      return;
    }
    // 📱 Levar pro celular (apertado no PC): o jogo que está lá passa pra esta tela
    if (p.t === 'levar') {
      if (x && x.pc === msg.de) return;
      if (x) sairModoControle();
      entrarModoControle({ pc: msg.de });
      return;
    }
    if (!x || x.pc) return;
    if (p.t === 'feito')
      avisar(
        p.a === 'salvar-estado'
          ? '💾 estado salvo no PC'
          : p.a === 'carregar-ultimo'
            ? '📂 último estado carregado'
            : '🏠 Início do PC',
        2500,
      );
  }
});
