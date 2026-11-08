// 🖥 Jogar no PC (M13.4; o web/jogarpc.js do antigo, lado do PC): o celular pede pelo canal `jogo` da rede, o PC abre
// o jogo (se o celular escolheu um) e transmite por WebRTC. A conversa (oferta/resposta) passa pelo canal cifrado da
// rede. Vídeo = a imagem crua do jogo ampliada em pixels inteiros (o filtro fica com o celular), som = a saída do jogo
// (o PC fica mudo), botões = canal de dados sem fila (os 6 bytes do celular como controle). Só rede de casa: sem
// STUN/TURN. Também: 📱 Levar pro celular / 📺 Voltar pra TV no menu rápido e os atalhos do celular (💾 ⟲ 🏠 e o menu).
import { listarJogos } from '@kof/app-core';
import { acharJogoPedido, escalaTransmissao, padDoServidor, trocarLocal } from '@kof/domain';
import { Jogo } from '@kof/engine';
import { create } from 'zustand';
import { acao } from '../app/acoes';
import { itensRemotos } from '../components/MenuRapido';
import { continuar } from './auto';
import { usarAvisos } from './avisos';
import { padDaTransmissao } from './celular';
import { aoQuadroNovo, ultimoQuadro, usarJogo } from './jogo';
import { ouvirRede, usarRede } from './rede';
import { servicos } from './servicos';
import { usarTelas } from './telas';

interface Transmissao {
  pc: RTCPeerConnection;
  de: string;
  dc: RTCDataChannel;
  cv: HTMLCanvasElement;
  cx: CanvasRenderingContext2D;
  peq: HTMLCanvasElement;
  pcx: CanvasRenderingContext2D;
  track: CanvasCaptureMediaStreamTrack;
  som: { desfazer: () => void } | null;
  info: string;
  infoQuando: number;
}
let t: Transmissao | null = null;

export const usarTransmissao = create<{ ligada: boolean }>()(() => ({ ligada: false }));

const ipDoAparelho = (id: string) => usarRede.getState().aparelhos.find((x) => x.id === id)?.ip;
const mandarJogo = (para: string, o: unknown) =>
  usarRede.getState().mandar({ t: 'enviar', para, canal: 'jogo', dados: JSON.stringify(o) });
const avisar = (m: string, ms?: number) => usarAvisos.getState().avisar(m, ms);

function esperarIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((ok) => {
    const fim = () => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', fim);
      ok();
    };
    pc.addEventListener('icegatheringstatechange', fim);
    setTimeout(ok, 2500); // rede de casa: os candidatos locais saem na hora
  });
}

ouvirRede((m) => {
  if (m.t === 'msg' && m.canal === 'jogo') {
    let p: { t?: string; a?: string; jogo?: Record<string, string>; sdp?: string };
    try {
      p = JSON.parse(m.dados) as typeof p;
    } catch {
      return; // mensagem torta: ignora, como o antigo
    }
    if (p.t === 'acao') return void acaoDoCelular(p.a ?? '', (o) => mandarJogo(m.de, o)); // atalhos do celular
    void pedidoDoCelular(m.de, p);
  }
  if (m.t === 'lista' && t && !m.aparelhos.some((a) => a.id === t?.de && a.online))
    pararTransmissao('o celular saiu da rede');
});

async function pedidoDoCelular(de: string, p: { t?: string; jogo?: Record<string, string>; sdp?: string }) {
  if (p.t === 'pedir') {
    pararTransmissao();
    if (p.jogo) {
      const ok = await abrirJogoPedido(p.jogo).catch((e: unknown) => {
        console.warn('jogo pedido pelo celular não abriu', e);
        return false;
      });
      if (!ok)
        return mandarJogo(de, { t: 'erro', texto: 'o PC não tem esse jogo na biblioteca: abra ele uma vez no PC' });
    }
    if (!usarJogo.getState().jogo)
      return mandarJogo(de, {
        t: 'erro',
        texto: 'nenhum jogo aberto no PC: escolha um jogo no celular (🖥 Jogar no PC na ficha)',
      });
    try {
      await comecarTransmissao(de);
    } catch (e) {
      pararTransmissao();
      mandarJogo(de, { t: 'erro', texto: 'o PC não conseguiu transmitir: ' + (e as Error).message });
    }
  } else if (p.t === 'resposta' && t && t.de === de) {
    const pc = t.pc;
    await pc
      .setRemoteDescription({ type: 'answer', sdp: trocarLocal(p.sdp ?? '', ipDoAparelho(de)) })
      .catch((e: Error) => pararTransmissao('resposta inválida: ' + e.message));
  } else if (p.t === 'fim' && t?.de === de) {
    pararTransmissao();
    avisar('📺 o jogo voltou pra cá', 3000);
  }
}

async function abrirJogoPedido(j: Record<string, string>): Promise<boolean> {
  const todos = await listarJogos(servicos().armazem);
  const achado = acharJogoPedido(todos, j);
  if (!achado) return false;
  if (usarJogo.getState().jogo && usarJogo.getState().registro?.id === achado.id) return true; // já está aberto
  const w = window as { __kofRemoto?: boolean };
  w.__kofRemoto = true; // aberto pelo celular: sem a pergunta do modo de jogo na tela do PC
  try {
    await continuar(achado);
  } finally {
    w.__kofRemoto = false;
  }
  return !!usarJogo.getState().jogo && usarJogo.getState().registro?.id === achado.id;
}

async function comecarTransmissao(de: string) {
  usarTelas.getState().abrir('jogo');
  usarJogo.getState().fecharRapido();
  if (usarJogo.getState().pausaManual) usarJogo.getState().alternarPausa();
  const l = ultimoQuadro.largura || 256,
    a = ultimoQuadro.altura || 224;
  const K = escalaTransmissao(l, a);
  const cv = document.createElement('canvas');
  cv.width = l * K;
  cv.height = a * K;
  const cx = cv.getContext('2d');
  const peq = document.createElement('canvas');
  const pcx = peq.getContext('2d');
  if (!cx || !pcx) throw new Error('sem canvas 2D');
  cx.imageSmoothingEnabled = false;
  const video = cv.captureStream(0);
  const track = video.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  if (!track) throw new Error('sem trilha de vídeo');
  track.contentHint = 'motion';
  const pc = new RTCPeerConnection({ iceServers: [] });
  const tv = pc.addTransceiver(track, { direction: 'sendonly', streams: [video] });
  // H.264 primeiro: o PC codifica na placa de vídeo e o celular decodifica no chip (menos atraso e bateria)
  try {
    const cods = RTCRtpSender.getCapabilities('video')?.codecs ?? [];
    tv.setCodecPreferences([
      ...cods.filter((c) => /h264/i.test(c.mimeType)),
      ...cods.filter((c) => !/h264/i.test(c.mimeType)),
    ]);
  } catch {
    // navegador sem setCodecPreferences: vai o codec padrão
  }
  const jogo = usarJogo.getState().jogo;
  const som = jogo instanceof Jogo ? jogo.somPraTransmitir() : null; // o nativo toca no processo dele (sem som no celular)
  const somTrilha = som?.stream.getAudioTracks()[0];
  if (som && somTrilha) pc.addTransceiver(somTrilha, { direction: 'sendonly', streams: [video] });
  const dc = pc.createDataChannel('botoes', { ordered: false, maxRetransmits: 0 });
  dc.binaryType = 'arraybuffer';
  t = { pc, de, dc, cv, cx, peq, pcx, track, som, info: '', infoQuando: 0 };
  usarTransmissao.setState({ ligada: true });
  padDaTransmissao(true);
  dc.onmessage = (e: MessageEvent) => {
    if (typeof e.data === 'string') {
      const d = e.data;
      if (d.startsWith('p')) return dc.send('P' + d.slice(1)); // ping: o celular mede o atraso
      let j: { t?: string; a?: string; i?: number; d?: number };
      try {
        j = JSON.parse(d) as typeof j;
      } catch {
        return;
      }
      const responder = (o: unknown) => dc.readyState === 'open' && dc.send(JSON.stringify(o));
      if (j.t === 'acao') void acaoDoCelular(j.a ?? '', responder);
      else if (j.t === 'menu') responder(menuParaCelular());
      else if (j.t === 'menu-item') {
        const it = itensRemotos()[j.i ?? -1];
        if (it) {
          try {
            if (j.d && it.aj) it.aj(j.d);
            else if (it.f) {
              it.f();
              responder({ t: 'feito', a: it.t });
            }
          } catch (x) {
            console.warn('item do menu pelo celular falhou', x);
          }
          setTimeout(() => {
            if (t) voltarAoJogo();
            responder(menuParaCelular());
          }, 50);
        }
      }
      return;
    }
    const p = padDoServidor(e.data as ArrayBuffer);
    if (p) padDaTransmissao(true, p);
  };
  dc.onopen = () => {
    avisar('🖥 transmitindo pro celular', 3000);
    contarAoCelular();
  };
  pc.onconnectionstatechange = () => {
    if (['failed', 'closed'].includes(pc.connectionState) && t?.pc === pc)
      pararTransmissao('a conexão com o celular caiu');
  };
  await pc.setLocalDescription(await pc.createOffer());
  await esperarIce(pc);
  if (t?.pc !== pc) return;
  // qualidade: até 12 Mbps, 60 quadros; se a Wi-Fi apertar, perde nitidez antes de perder quadro
  try {
    const s = tv.sender,
      pr = s.getParameters();
    pr.encodings = pr.encodings?.length ? pr.encodings : [{}];
    const e0 = pr.encodings[0];
    if (e0) Object.assign(e0, { maxBitrate: 12e6, maxFramerate: 60 });
    (pr as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'maintain-framerate';
    await s.setParameters(pr);
  } catch {
    // sem ajuste fino: o navegador escolhe
  }
  mandarJogo(de, { t: 'oferta', sdp: pc.localDescription?.sdp ?? '' });
  aoQuadroNovo.add(transmitirQuadro);
}

function voltarAoJogo() {
  usarTelas.getState().abrir('jogo');
  if (usarJogo.getState().pausaManual) usarJogo.getState().alternarPausa();
}

/** A cada quadro novo: a imagem crua, ampliada sem borrar. */
function transmitirQuadro() {
  const q = ultimoQuadro;
  if (!t || !q.pixels) return;
  const { largura: l, altura: a } = q;
  if (t.peq.width !== l || t.peq.height !== a) Object.assign(t.peq, { width: l, height: a });
  const K = escalaTransmissao(l, a);
  if (t.cv.width !== l * K || t.cv.height !== a * K) {
    Object.assign(t.cv, { width: l * K, height: a * K });
    t.cx.imageSmoothingEnabled = false;
  }
  t.pcx.putImageData(
    new ImageData(new Uint8ClampedArray(q.pixels.buffer as ArrayBuffer, q.pixels.byteOffset, l * a * 4), l, a),
    0,
    0,
  );
  t.cx.drawImage(t.peq, 0, 0, t.cv.width, t.cv.height);
  t.track.requestFrame();
  if (t.dc.readyState === 'open' && performance.now() - t.infoQuando > 1000) {
    t.infoQuando = performance.now();
    contarAoCelular();
  }
}

/** Console e nome do jogo pro celular trocar o controle (e o tamanho: o celular põe o filtro dele). */
function contarAoCelular() {
  if (!t || t.dc.readyState !== 'open') return;
  const j = usarJogo.getState();
  const info = JSON.stringify({
    t: 'jogo',
    sis: j.info?.sistema ?? '',
    nome: j.jogo ? j.nome : '',
    l: ultimoQuadro.largura,
    a: ultimoQuadro.altura,
  });
  if (info !== t.info) {
    t.info = info;
    t.dc.send(info);
  }
}

export function pararTransmissao(motivo?: string) {
  if (!t) return;
  const { pc, de, som } = t;
  t = null;
  aoQuadroNovo.delete(transmitirQuadro);
  try {
    pc.close();
  } catch {
    // já fechada
  }
  som?.desfazer();
  padDaTransmissao(false);
  usarTransmissao.setState({ ligada: false });
  if (motivo) {
    avisar('🖥 transmissão encerrada: ' + motivo, 4000);
    mandarJogo(de, { t: 'erro', texto: motivo });
  }
}

// 📱 Levar pro celular / 📺 Voltar pra TV (menu rápido): o jogo continua de onde está, só muda a tela
export const celularOnline = () => usarRede.getState().aparelhos.find((a) => a.online && a.tipo === 'celular');
export function levarProCelular() {
  const c = celularOnline();
  if (!c)
    return avisar('📱 nenhum celular pareado na rede: abra o KOFstation no celular (📡 Aparelhos pra parear)', 5000);
  if (!usarJogo.getState().jogo) return avisar('📱 abra um jogo primeiro', 3000);
  mandarJogo(c.id, { t: 'levar' });
  avisar('📱 mandando pro ' + c.nome + '…', 3000);
}

// atalhos do celular (☰ do Jogar no PC, ou a barrinha do celular como controle pela rede)
const ACOES_CELULAR = ['salvar-estado', 'carregar-ultimo', 'home'];
async function acaoDoCelular(a: string, responder: (o: unknown) => void) {
  if (!ACOES_CELULAR.includes(a)) return;
  await Promise.resolve(acao(a));
  if (t && a !== 'home') voltarAoJogo(); // jogando no celular: o jogo segue
  responder({ t: 'feito', a });
}

/** O menu rápido do PC no celular: só o que muda o jogo sem abrir tela no PC (ajustes ◀▶, salvar, carregar, reiniciar). */
function menuParaCelular() {
  return {
    t: 'menu',
    itens: itensRemotos().map((it, i) => ({ i, t: it.t, v: it.v ? String(it.v()) : '', aj: !!it.aj })),
  };
}

/** Pros testes: o estado da transmissão (como o KOFnes.transmissao do antigo). */
export const estadoTransmissao = () => ({
  ligada: !!t,
  estado: t?.pc.connectionState ?? null,
  dc: t?.dc.readyState ?? null,
});
