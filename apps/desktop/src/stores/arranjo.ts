// 📡 Aparelhos com papéis (tarefa N.2–N.5): a ficha de cada aparelho (canal `ficha`), o arranjo de agora (quem é o
// 🧠 Núcleo, a 📺 Tela e o 🎮 Controle) e a troca com o jogo rodando. O jogo fica sempre no núcleo (este aparelho);
// trocar só muda pra onde vai a imagem (a transmissão por WebRTC de sempre, o `levar`) e de onde vêm os botões
// (o canal `pad`). O canal `papel` manda um aparelho virar controle do núcleo, ou parar.
import {
  ARRANJOS,
  consolesDoTipo,
  lerFicha,
  lerOrdemPapel,
  montarArranjo,
  papeisDe,
  qualArranjo,
  semQuemCaiu,
  SISTEMAS,
  SO_NO_PC,
  trocarPapel,
  validarArranjo,
  type AparelhoComPapel,
  type Arranjo,
  type Ficha,
  type Papel,
} from '@kof/domain';
import { controlesDoNavegador } from '@kof/engine';
import { create } from 'zustand';
import { emModoCelular } from '../app/celular';
import { usarAvisos } from './avisos';
import { config } from './config';
import { usarJogo } from './jogo';
import { entrarModoControle, modoControleCom, sairModoControle } from './modoControle';
import { ouvirRede, transporte, usarRede } from './rede';
import { pararTransmissao, transmitindoPara, transmitirPara } from './transmissao';

const EU = 'eu';

export interface EstadoArranjo {
  arranjo: Arranjo;
  fichas: Record<string, Ficha | null>;
}

export const usarArranjo = create<EstadoArranjo>()(() => ({
  arranjo: { nucleo: EU, tela: EU, controles: [EU] },
  fichas: {},
}));

const avisar = (m: string, ms = 4000) => usarAvisos.getState().avisar(m, ms);

/** A ficha deste aparelho (N.2): o que o navegador sabe dele. */
export function minhaFicha(): Ficha {
  const tipo = emModoCelular() ? 'celular' : 'pc';
  const n = globalThis.navigator as Navigator & { deviceMemory?: number };
  const ua = n?.userAgent ?? '';
  const sistema = /Android/.test(ua)
    ? 'Android'
    : /Windows/.test(ua)
      ? 'Windows'
      : /Mac OS/.test(ua)
        ? 'macOS'
        : /Linux/.test(ua)
          ? 'Linux'
          : '';
  const f: Ficha = {
    tipo,
    consoles: consolesDoTipo(tipo, [...SISTEMAS.map((s) => s.id as string), ...SO_NO_PC.filter((s) => s !== 'ps2')]),
  };
  if (sistema) f.sistema = sistema;
  if (n?.hardwareConcurrency) f.cpus = n.hardwareConcurrency;
  if (n?.deviceMemory) f.memoriaGb = n.deviceMemory;
  if (globalThis.screen?.width) f.tela = `${screen.width}×${screen.height}`;
  const pads = controlesDoNavegador()
    .filter((g): g is Gamepad => !!g && (g as Gamepad).connected)
    .map((g) => g.id.replace(/\s*\(.*$/, ''));
  if (pads.length) f.controles = pads;
  return f;
}

/** Os aparelhos com papel possível: este aqui (id `eu`) e os pareados, com a ficha de cada. */
export function aparelhosComPapel(): AparelhoComPapel[] {
  const r = usarRede.getState();
  const { fichas } = usarArranjo.getState();
  const eu = minhaFicha();
  return [
    {
      id: EU,
      nome: r.eu?.nome || (eu.tipo === 'pc' ? 'Este PC' : 'Este celular'),
      tipo: eu.tipo,
      online: true,
      ficha: eu,
    },
    ...r.aparelhos.map((a) => ({ ...a, ficha: fichas[a.id] ?? null })),
  ];
}

// ---------------------------------------------------------------- a ficha pela rede
const mandeiFicha = new Set<string>();
function mandarFicha(id: string) {
  if (transporte().enviar(id, 'ficha', JSON.stringify(minhaFicha()))) mandeiFicha.add(id);
}

transporte().ouvir('ficha', (de, dados) => {
  usarArranjo.setState((s) => ({ fichas: { ...s.fichas, [de]: lerFicha(dados) } }));
  if (!mandeiFicha.has(de)) mandarFicha(de); // ele mandou a dele: devolve a minha
});

ouvirRede((m) => {
  if (m.t !== 'lista') return;
  for (const a of m.aparelhos) {
    if (!a.online) mandeiFicha.delete(a.id);
    else if (!mandeiFicha.has(a.id)) mandarFicha(a.id);
  }
  conferirQuemCaiu();
});

// ---------------------------------------------------------------- o lado de quem recebe um papel
transporte().ouvir('papel', (de, dados) => {
  const o = lerOrdemPapel(dados);
  if (!o) return;
  if (o.tela) return; // a tela vem pelo `levar` do canal `jogo` (o mesmo de sempre, que o APK já entende)
  if (o.controle) {
    if (modoControleCom() === de) return;
    sairModoControle();
    entrarModoControle({ rede: de });
    return;
  }
  if (modoControleCom() === de) sairModoControle(); // o núcleo tirou o papel deste aparelho
});

// ---------------------------------------------------------------- o lado do núcleo
function online(id: string): boolean {
  return id === EU || usarRede.getState().aparelhos.some((a) => a.id === id && a.online);
}
const nomeDe = (id: string) => aparelhosComPapel().find((a) => a.id === id)?.nome ?? 'o aparelho';

/** Põe o arranjo em prática: a imagem vai pra tela, os controles recebem a ordem. */
function aplicar(novo: Arranjo, velho: Arranjo) {
  // a tela
  if (novo.tela === EU) {
    if (transmitindoPara()) pararTransmissao();
    if (velho.tela !== EU)
      transporte().enviar(velho.tela, 'papel', JSON.stringify({ t: 'papel', tela: false, controle: false }));
  } else if (transmitindoPara() !== novo.tela) {
    if (transmitindoPara()) pararTransmissao();
    pedidoEm.set(novo.tela, performance.now());
    transmitirPara(novo.tela);
  }
  // os controles (a tela que também controla já manda os botões pela própria transmissão)
  const antes = new Set(velho.controles.filter((c) => c !== EU && c !== velho.tela));
  const agora = new Set(novo.controles.filter((c) => c !== EU && c !== novo.tela));
  for (const c of agora)
    if (!antes.has(c)) transporte().enviar(c, 'papel', JSON.stringify({ t: 'papel', tela: false, controle: true }));
  for (const c of antes)
    if (!agora.has(c) && c !== novo.tela)
      transporte().enviar(c, 'papel', JSON.stringify({ t: 'papel', tela: false, controle: false }));
  usarArranjo.setState({ arranjo: novo });
}

/** Troca o arranjo inteiro (devolve o motivo se não deu). */
export function trocarArranjo(novo: Arranjo): string {
  const sis = usarJogo.getState().info?.sistema ?? '';
  const v = validarArranjo(novo, aparelhosComPapel(), EU, sis);
  if (!v.ok) {
    avisar('📡 ' + v.motivo);
    return v.motivo;
  }
  const precisaJogo = novo.tela !== EU;
  if (precisaJogo && !usarJogo.getState().jogo) {
    avisar('📡 abra um jogo primeiro: a imagem vai pra outra tela quando há jogo rodando');
    return 'sem jogo';
  }
  aplicar(novo, usarArranjo.getState().arranjo);
  lembrar(novo);
  return '';
}

/** Um toque num arranjo pronto. */
export function usarArranjoPronto(id: string): string {
  const r = montarArranjo(id, aparelhosComPapel(), EU);
  if ('falta' in r) {
    avisar('📡 ' + (ARRANJOS.find((a) => a.id === id)?.nome ?? '') + ': ' + r.falta, 4500);
    return r.falta;
  }
  const erro = trocarArranjo(r.arranjo);
  if (!erro)
    avisar(
      '📡 ' + (ARRANJOS.find((a) => a.id === id)?.i ?? '') + ' ' + (ARRANJOS.find((a) => a.id === id)?.nome ?? ''),
      2500,
    );
  return erro;
}

/** Tocar num chip: o papel passa pro aparelho `id` (o controle liga/desliga). */
export function trocarPapelAvulso(papel: Papel, id: string): string {
  return trocarArranjo(trocarPapel(usarArranjo.getState().arranjo, papel, id));
}

export const arranjoAtual = (): string => qualArranjo(usarArranjo.getState().arranjo, aparelhosComPapel(), EU);
export const papeisDoAparelho = (id: string): Papel[] => papeisDe(usarArranjo.getState().arranjo, id);

/** Um aparelho caiu: volta sozinho pro arranjo possível e avisa. */
function conferirQuemCaiu() {
  const a = usarArranjo.getState().arranjo;
  const r = semQuemCaiu(a, online, nomeDe);
  if (!r) return;
  aplicar(r.arranjo, { ...a, tela: online(a.tela) ? a.tela : EU, controles: a.controles.filter(online) });
  avisar(r.aviso, 5000);
}

// a transmissão parou sozinha (o outro lado fechou): a tela volta pra cá no arranjo também. A transmissão leva uns
// segundos pra ligar depois do pedido: dá 8 s antes de desistir.
const pedidoEm = new Map<string, number>();
const pendente = (id: string) => performance.now() - (pedidoEm.get(id) ?? -1e9) < 8000;
setInterval(() => {
  const a = usarArranjo.getState().arranjo;
  if (a.tela !== EU && !transmitindoPara() && !pendente(a.tela)) usarArranjo.setState({ arranjo: { ...a, tela: EU } });
}, 2000);

// ---------------------------------------------------------------- N.5: lembrar por console e por jogo
function chaves(): string[] {
  const j = usarJogo.getState();
  const sis = j.info?.sistema ?? '';
  const id = j.registro?.id ?? '';
  return [id ? 'arranjo.jogo.' + id : '', sis ? 'arranjo.' + sis : '', 'arranjo'].filter(Boolean);
}
function lembrar(a: Arranjo) {
  const id = qualArranjo(a, aparelhosComPapel(), EU) || 'sozinho';
  for (const k of chaves()) config().guardar(k, id);
}
/** O arranjo lembrado pro jogo aberto agora (do jogo, senão do console, senão o último). */
export function arranjoLembrado(): string {
  for (const k of chaves()) {
    const v = config().ler(k);
    if (v) return v;
  }
  return '';
}

// abriu um jogo: volta pro arranjo que ele usou da última vez (se os aparelhos estão na rede)
let ultimoJogo: unknown = null;
usarJogo.subscribe((j) => {
  if (j.jogo === ultimoJogo) return;
  ultimoJogo = j.jogo;
  if (!j.jogo) return;
  const id = arranjoLembrado();
  if (!id || id === arranjoAtual()) return;
  const r = montarArranjo(id, aparelhosComPapel(), EU);
  if ('arranjo' in r) setTimeout(() => trocarArranjo(r.arranjo), 800); // deixa o jogo abrir antes de mandar a imagem
});
