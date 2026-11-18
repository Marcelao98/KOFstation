// 📱 Celular como controle (M13.3), os dois jeitos do antigo:
// 1. pela rede pareada (📡): o celular manda "botões,eixos" no canal `pad`; cada celular vira um jogador (o PC
//    responde no `pad-ok` qual jogador ele é e o console do jogo aberto) — jogadores.js do antigo
// 2. pelo servidor do APK (Controles → "Usar como controle do PC", sem parear): o PC conecta em ws://ip:8642 com a
//    senha de 4 números que o celular mostra, e religa sozinho na próxima abertura — app.js 1000–1050 do antigo
import {
  enderecoDoControle,
  juntarJogadores,
  linhaDoJogo,
  padDaRede,
  padDoServidor,
  type Aparelho,
  type PadCelular,
} from '@kof/domain';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { vagas } from './jogadores';
import { usarJogo } from './jogo';
import { ouvirRede, usarRede } from './rede';

// ---------------------------------------------------------------- pela rede
const celRede = new Map<string, PadCelular & { quando: number }>();

function jogoAgora() {
  const j = usarJogo.getState();
  return { sis: j.info?.sistema ?? '', nome: j.jogo ? j.nome : '' };
}

/** Conta pra cada celular da rede (ou só pra um) qual jogador ele é e o jogo aberto. */
export function avisarCelularJogador(so?: string) {
  const ids = so ? [so] : [...celRede.keys()];
  const l = aparelhosCelular();
  const r = juntarJogadores(l, vagas);
  const { sis, nome } = jogoAgora();
  for (const id of ids) {
    const i = l.findIndex((a) => a.k === 'cel:' + id);
    const dados = JSON.stringify({ jogador: (r.j[i] ?? 0) + 1, sis, nome });
    usarRede.getState().mandar({ t: 'enviar', para: id, canal: 'pad-ok', dados });
  }
}

ouvirRede((m) => {
  if (m.t !== 'msg' || m.canal !== 'pad') return;
  const era = celRede.has(m.de);
  celRede.set(m.de, { ...padDaRede(m.dados), quando: performance.now() });
  if (!era) avisarCelularJogador(m.de);
});

// ---------------------------------------------------------------- pelo servidor do APK
interface Remoto {
  ws: WebSocket | null;
  pad: PadCelular;
  alvo: { url: string; senha: string } | null;
  tentativas: number;
  ligado: boolean;
  calado: boolean;
}
const remoto: Remoto = {
  ws: null,
  pad: { b: 0, e: [0, 0, 0, 0] },
  alvo: null,
  tentativas: 0,
  ligado: false,
  calado: false,
};

export const usarCelular = create<{ ligado: boolean }>()(() => ({ ligado: false }));
const marcar = () => usarCelular.setState({ ligado: remoto.ligado });

const nomeDoPc = () => config().ler('aparelhoNome') ?? usarRede.getState().eu?.nome ?? 'PC';

function contarJogoAoServidor() {
  if (!remoto.ligado || !remoto.ws) return;
  const { sis, nome } = jogoAgora();
  try {
    remoto.ws.send(linhaDoJogo(sis, nome));
  } catch {
    // caiu: manda de novo ao religar
  }
}

/** Conta pros celulares (dos dois jeitos) o jogo que abriu. */
export function contarJogoAoControle() {
  avisarCelularJogador();
  contarJogoAoServidor();
}
usarJogo.subscribe((s, a) => {
  if (s.info !== a.info) contarJogoAoControle();
});

function abrirControle() {
  const a = remoto.alvo;
  if (!a) return;
  let ws: WebSocket;
  try {
    ws = new WebSocket(a.url);
  } catch (e) {
    usarAvisos.getState().avisar('📱 não consegui conectar: ' + (e as Error).message, 5000);
    return;
  }
  ws.binaryType = 'arraybuffer';
  remoto.ws = ws;
  ws.onopen = () => ws.send('KOF ' + a.senha + ' ' + nomeDoPc());
  ws.onmessage = (e) => {
    if (typeof e.data === 'string') {
      if (e.data === 'ok') {
        Object.assign(remoto, { ligado: true, tentativas: 0, calado: false });
        config().guardar('controleAuto', '1');
        usarAvisos.getState().avisar('📱 celular conectado: já pode jogar com ele', 3000);
        marcar();
        contarJogoAoServidor();
      } else {
        if (!remoto.calado) usarAvisos.getState().avisar('📱 ' + String(e.data), 5000);
        remoto.alvo = null;
        config().guardar('controleAuto', '0');
      }
      return;
    }
    const p = padDoServidor(e.data as ArrayBuffer);
    if (p) remoto.pad = p;
  };
  ws.onclose = () => {
    if (remoto.ws !== ws) return;
    const era = remoto.ligado;
    Object.assign(remoto, { ligado: false, ws: null, pad: { b: 0, e: [0, 0, 0, 0] } });
    marcar();
    if (!remoto.alvo) return;
    const religar = (ms: number) => setTimeout(() => remoto.alvo && !remoto.ws && abrirControle(), ms);
    if (remoto.calado) return void religar(5000); // quieto, sem desistir
    if (!era && !remoto.tentativas)
      usarAvisos
        .getState()
        .avisar(
          `📱 ainda não achei o celular (sigo tentando). Abra ${a.url.replace('ws:', 'http:')} no navegador do PC: abriu "✅ Celular achado"? Então é o navegador bloqueando a rede local. Não abriu? PC e celular precisam estar na mesma Wi-Fi (Wi-Fi de visitante isola os aparelhos).`,
          15000,
        );
    if (remoto.tentativas++ < 30) {
      if (era) usarAvisos.getState().avisar('📱 o celular caiu: tentando de novo…', 3000);
      religar(2000);
    } else {
      usarAvisos.getState().avisar('📱 não achei o celular. Ele está na tela "Controle do PC" e na mesma Wi-Fi?', 6000);
      remoto.alvo = null;
    }
  };
}

/** `silencioso` = religar sozinho com o último celular (tenta quieto até o celular entrar no modo controle). */
export function conectarControle(texto: string, silencioso = false): boolean {
  const a = enderecoDoControle(texto);
  if (!a) {
    usarAvisos.getState().avisar('digite o endereço e a senha que aparecem no celular, ex.: 192.168.0.15 4821', 6000);
    return false;
  }
  desconectarControle();
  config().guardar('controleUltimo', texto.trim());
  Object.assign(remoto, { alvo: a, tentativas: 0, calado: silencioso });
  abrirControle();
  return true;
}

export function desconectarControle() {
  remoto.alvo = null;
  const w = remoto.ws;
  Object.assign(remoto, { ws: null, ligado: false, pad: { b: 0, e: [0, 0, 0, 0] } });
  if (w)
    try {
      w.close();
    } catch {
      // já fechado
    }
  marcar();
}

/** O item "📱 Celular como controle…" do menu Arquivo. */
export function menuControleCelular() {
  if (remoto.ligado || (remoto.alvo && !remoto.calado)) {
    desconectarControle();
    config().guardar('controleAuto', '0');
    usarAvisos.getState().avisar('📱 celular desconectado');
    return;
  }
  const t = prompt(
    'No celular, abra o KOFstation → Controles → "Usar como controle do PC".\nDigite aqui o endereço e a senha que aparecem lá (ex.: 192.168.0.15 4821):\n\n(Celular pareado em 📡 Aparelhos não precisa disso: é só abrir o modo controle nele.)',
    config().ler('controleUltimo') ?? '',
  );
  if (t && conectarControle(t)) usarAvisos.getState().avisar('📱 conectando…', 2000);
}

/** Na abertura: se da última vez o celular conectou, tenta de novo sozinho (a senha do celular não muda). */
export function religarControleNaAbertura() {
  setTimeout(() => {
    const u = config().ler('controleUltimo');
    if (config().ler('controleAuto') === '1' && u && !remoto.alvo) conectarControle(u, true);
  }, 1500);
}

/** Jogar no PC (M13.4): os botões que chegam pelo canal de dados do WebRTC entram como o celular do PC. */
const transmissao = { ativa: false, pad: { b: 0, e: [0, 0, 0, 0] } as PadCelular };
export function padDaTransmissao(ativa: boolean, pad?: PadCelular) {
  transmissao.ativa = ativa;
  transmissao.pad = pad ?? { b: 0, e: [0, 0, 0, 0] };
}

/** Pros testes: os botões que o celular está mandando agora pelo Jogar no PC. */
export const padDaTransmissaoAgora = (): PadCelular => transmissao.pad;

// ---------------------------------------------------------------- pros jogadores
/** Os celulares ligados agora, como aparelhos de controle (o celular sem mandar nada por 5 s sai). */
export function aparelhosCelular(agora = performance.now()): Aparelho[] {
  const l: Aparelho[] = [];
  if (remoto.ligado || transmissao.ativa) {
    const b = remoto.pad.b | transmissao.pad.b;
    const e = transmissao.pad.e.some((x) => x) ? transmissao.pad.e : remoto.pad.e;
    l.push({ k: 'cel-pc', nome: '📱 Celular (controle do PC)', b, e });
  }
  for (const [id, c] of celRede) {
    if (agora - c.quando > 5000) {
      celRede.delete(id);
      continue;
    }
    const a = usarRede.getState().aparelhos.find((x) => x.id === id);
    l.push({ k: 'cel:' + id, nome: '📱 ' + (a?.nome || 'Celular'), b: agora - c.quando > 1500 ? 0 : c.b, e: c.e });
  }
  return l;
}

/** Pros testes: um "celular" apertando botões (como o KOFnes.padTeste do antigo). */
export function padTeste(id: string, b: number, e: number[] = [0, 0, 0, 0]) {
  const era = celRede.has(id);
  celRede.set(id, { b, e, quando: performance.now() });
  if (!era) avisarCelularJogador(id);
}
