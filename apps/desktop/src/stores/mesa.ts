// 🎲 A Mesa de aparelhos (tarefa M): o núcleo (este aparelho, com o jogo aberto), a tela e os jogadores J1..J4, cada
// um com o seu aparelho e o seu tipo de controle. Fica em cima do arranjo da tarefa N (stores/arranjo): a mesa diz
// quem joga em que vaga; o arranjo põe em prática (pra onde vai a imagem, quem recebe o papel de controle).
//
// O canal `mesa`: o núcleo conta pra cada aparelho a mesa vista de lá (a cada mudança e a cada 3 s) e mede o atraso
// (ping/pong); qualquer aparelho pede "📺 trazer a imagem pra cá" e "🎮 entrar como jogador". Quem cai fica com a vaga
// reservada (cinza, "esperando") e volta pra ela ao religar. APK antigo: não conhece o canal e ignora.
import {
  arranjoDaMesa,
  chavesDaMesa,
  entrarNaMesa,
  lerMensagemMesa,
  lerMesaGuardada,
  mesaDoArranjo,
  mesaSozinho,
  mesmoArranjo,
  porNunchuk,
  sairDaMesa,
  textoDoJogador,
  tipoPadrao,
  validarMesa,
  vagaDe,
  vistaPara,
  type Mesa,
  type PedidoMesa,
  type TipoControle,
  type VistaDaMesa,
} from '@kof/domain';
import { create } from 'zustand';
import { aparelhosComPapel, trocarArranjo, usarArranjo } from './arranjo';
import { usarAvisos } from './avisos';
import { config } from './config';
import { vagas } from './jogadores';
import { usarJogo } from './jogo';
import { minhaVista, usarMinhaVaga } from './minhaVaga';
import { ouvirRede, transporte, usarRede } from './rede';

const EU = 'eu';

export interface EstadoMesa {
  mesa: Mesa;
  /** atraso de ida e volta (ms) de cada aparelho da mesa, medido pelo canal `mesa` */
  atraso: Record<string, number>;
  /** celulares que passaram pelo assistente de calibração do Wiimote (eles contam no canal `mesa`) */
  calibrados: Record<string, boolean>;
}

const lerCalibrados = (): Record<string, boolean> => {
  try {
    const o = JSON.parse(config().ler('wiimote.calibrados') ?? '{}') as unknown;
    return o && typeof o === 'object' ? (o as Record<string, boolean>) : {};
  } catch {
    return {}; // guardado torto: ninguém calibrado (eles contam de novo ao conectar)
  }
};

export const usarMesa = create<EstadoMesa>()(() => ({
  mesa: mesaSozinho(EU),
  atraso: {},
  calibrados: {},
}));

// a configuração carrega depois dos módulos: os calibrados guardados entram no primeiro uso
let carregouCalibrados = false;
function calibrados(): Record<string, boolean> {
  if (!carregouCalibrados) {
    carregouCalibrados = true;
    usarMesa.setState((s) => ({ calibrados: { ...lerCalibrados(), ...s.calibrados } }));
  }
  return usarMesa.getState().calibrados;
}

const avisar = (m: string, ms = 3500) => usarAvisos.getState().avisar(m, ms);
const sistema = () => usarJogo.getState().info?.sistema ?? '';
const online = (id: string) => id === EU || usarRede.getState().aparelhos.some((a) => a.id === id && a.online);
export const nomeNaMesa = (id: string): string => aparelhosComPapel().find((a) => a.id === id)?.nome ?? 'aparelho';
export const ehCelular = (id: string): boolean => aparelhosComPapel().find((a) => a.id === id)?.tipo === 'celular';
export const calibrado = (id: string): boolean => !!calibrados()[id];

/** Põe a mesa em prática: as vagas pros botões, o arranjo (imagem e papéis), e conta pra todo mundo. */
function assentar(m: Mesa) {
  const chaves = chavesDaMesa(m, EU);
  vagas.mesa = chaves;
  // quem ganhou vaga pela mesa larga a que pegou sozinho na sessão (senão dois aparelhos caem no mesmo jogador)
  vagas.sessao = Object.fromEntries(Object.entries(vagas.sessao).filter(([k]) => chaves[k] === undefined));
  usarMesa.setState({ mesa: m });
  contarATodos();
}

/**
 * Troca a mesa inteira (devolve o motivo se não deu). A imagem e os papéis vão pelo arranjo; as vagas reservadas
 * (aparelho fora da rede) não recebem papel até ele voltar.
 */
export function trocarMesa(m: Mesa): string {
  const v = validarMesa(m, aparelhosComPapel(), EU, sistema());
  if (!v.ok) {
    avisar('🎲 ' + v.motivo, 4500);
    return v.motivo;
  }
  const a = arranjoDaMesa(m, online);
  if (!mesmoArranjo(m, usarArranjo.getState().arranjo, online)) {
    const erro = trocarArranjo(a);
    if (erro) return erro;
  }
  assentar(m);
  lembrar(m);
  return '';
}

/** "🎮 Entrar como jogador" (o aparelho `id`; a vaga pedida ou a próxima livre). */
export function entrarComoJogador(id: string, tipo?: TipoControle, vaga = -1): string {
  const ap = aparelhosComPapel().find((a) => a.id === id);
  const t = tipo ?? tipoPadrao(ap?.tipo ?? 'pc', id === EU, sistema());
  const r = entrarNaMesa(usarMesa.getState().mesa, id, t, vaga, EU);
  if ('falta' in r) {
    avisar('🎲 ' + r.falta);
    return r.falta;
  }
  const erro = trocarMesa(r.mesa);
  if (!erro) avisar('🎮 ' + textoDoJogador(r.mesa, r.vaga, nomeNaMesa), 3000);
  return erro;
}

export const tirarJogador = (vaga: number): string => trocarMesa(sairDaMesa(usarMesa.getState().mesa, vaga, EU));

export function trocarTipo(vaga: number, tipo: TipoControle): string {
  const m = usarMesa.getState().mesa;
  const j = m.jogadores[vaga];
  if (!j) return 'vaga livre';
  const jogadores = [...m.jogadores];
  const novo = { ...j, tipo };
  if (tipo !== 'wiimote+nunchuk') delete novo.nunchuk;
  jogadores[vaga] = novo;
  return trocarMesa({ ...m, jogadores });
}

export const trocarNunchuk = (vaga: number, id: string | undefined): string =>
  trocarMesa(porNunchuk(usarMesa.getState().mesa, vaga, id));

export function usarSemCalibrar(vaga: number, sim: boolean): string {
  const m = usarMesa.getState().mesa;
  const j = m.jogadores[vaga];
  if (!j) return 'vaga livre';
  const jogadores = [...m.jogadores];
  const novo = { ...j, semCalibrar: true };
  if (!sim) delete (novo as Partial<typeof novo>).semCalibrar;
  jogadores[vaga] = novo;
  return trocarMesa({ ...m, jogadores });
}

/** "📺 Trazer a imagem pra cá", no núcleo: a tela volta pra ele. */
export const imagemPraCa = (): string => trocarMesa({ ...usarMesa.getState().mesa, tela: EU });

/** O núcleo pede pra um celular da mesa recentrar a mira (sem abrir o assistente). */
export const recentrarNoCelular = (id: string): boolean =>
  transporte().enviar(id, 'mesa', JSON.stringify({ t: 'recentrar' }));

// ---------------------------------------------------------------- o arranjo mudou por fora (pronto, chip, caiu)
usarArranjo.subscribe((s, antes) => {
  if (s.arranjo === antes.arranjo) return;
  const m = usarMesa.getState().mesa;
  if (mesmoArranjo(m, s.arranjo, online)) return;
  assentar(mesaDoArranjo(s.arranjo, m, aparelhosComPapel(), EU, sistema()));
});

// ---------------------------------------------------------------- contar a mesa pros aparelhos
function vista(id: string): VistaDaMesa {
  const j = usarJogo.getState();
  return vistaPara(usarMesa.getState().mesa, id, nomeNaMesa, online, sistema(), j.jogo ? j.nome : '');
}

let tinhaJogo = false;
function contarATodos() {
  const temJogo = !!usarJogo.getState().jogo;
  // só o aparelho com o jogo aberto é o núcleo: sem jogo, avisa uma vez que a mesa fechou
  if (!temJogo && !tinhaJogo) return;
  for (const a of usarRede.getState().aparelhos) {
    if (!a.online) continue;
    const dados = temJogo ? vista(a.id) : { t: 'mesa', aberta: false };
    transporte().enviar(a.id, 'mesa', JSON.stringify(dados));
  }
  tinhaJogo = temJogo;
}

// ---------------------------------------------------------------- o canal `mesa`
const atendidos: Record<PedidoMesa['t'], (de: string, p: PedidoMesa) => void> = {
  entrar: (de, p) => {
    if (p.t === 'entrar') entrarComoJogador(de, p.tipo, p.vaga ?? -1);
  },
  sair: (de) => {
    const v = vagaDe(usarMesa.getState().mesa, de);
    if (v >= 0) tirarJogador(v);
  },
  tela: (de) => {
    trocarMesa({ ...usarMesa.getState().mesa, tela: de });
  },
  calibrado: (de, p) => {
    if (p.t !== 'calibrado') return;
    const c = { ...calibrados(), [de]: p.ok };
    usarMesa.setState({ calibrados: c });
    config().guardar('wiimote.calibrados', JSON.stringify(c));
    contarATodos();
  },
  ping: (de, p) => {
    if (p.t === 'ping') transporte().enviar(de, 'mesa', JSON.stringify({ t: 'pong', n: p.n }));
  },
  pong: (de, p) => {
    if (p.t !== 'pong') return;
    const ms = Math.max(0, Math.round(performance.now() - p.n));
    usarMesa.setState((s) => ({ atraso: { ...s.atraso, [de]: ms } }));
  },
  recentrar: () => {
    ouvintesRecentrar.forEach((f) => f());
  },
};

const ouvintesRecentrar = new Set<() => void>();
/** O celular-Wiimote ouve o "recentrar" que o núcleo manda (stores/sensores). */
export const aoRecentrar = (f: () => void) => ouvintesRecentrar.add(f);

transporte().ouvir('mesa', (de, dados) => {
  const o = lerMensagemMesa(dados);
  if (!o) return;
  if (o.t === 'mesa') {
    // este aparelho não é o núcleo: guarda a vista do núcleo (ou limpa, se a mesa fechou)
    if (!o.aberta) {
      if (usarMinhaVaga.getState().de === de) usarMinhaVaga.setState({ de: '', vista: null, quando: 0 });
      return;
    }
    usarMinhaVaga.setState({ de, vista: o, quando: performance.now() });
    return;
  }
  atendidos[o.t](de, o);
});

/** Pedir ao núcleo (o que mandou a mesa por último): entrar, sair, trazer a imagem, contar a calibração. */
export function pedirAoNucleo(p: PedidoMesa): boolean {
  const de = usarMinhaVaga.getState().de;
  if (!de || !minhaVista(de)) {
    avisar('🎲 nenhum aparelho com jogo aberto na rede agora');
    return false;
  }
  return transporte().enviar(de, 'mesa', JSON.stringify(p));
}

// a cada 3 s: a mesa de novo pra todos (quem acabou de chegar fica sabendo) e o atraso de cada jogador
setInterval(() => {
  if (!usarJogo.getState().jogo) return;
  contarATodos();
  const m = usarMesa.getState().mesa;
  const ids = new Set<string>();
  for (const j of m.jogadores) if (j) for (const id of [j.aparelho, j.nunchuk]) if (id && id !== EU) ids.add(id);
  if (m.tela !== EU) ids.add(m.tela);
  for (const id of ids)
    if (online(id)) transporte().enviar(id, 'mesa', JSON.stringify({ t: 'ping', n: performance.now() }));
}, 3000);

// alguém voltou pra rede: volta pra vaga reservada dele (recebe o papel de controle de novo)
ouvirRede((ev) => {
  if (ev.t !== 'lista') return;
  const m = usarMesa.getState().mesa;
  const a = usarArranjo.getState().arranjo;
  const voltou = arranjoDaMesa(m, online).controles.filter((c) => !a.controles.includes(c));
  if (voltou.length && usarJogo.getState().jogo) {
    if (!trocarArranjo(arranjoDaMesa(m, online)))
      for (const id of voltou) avisar('🎮 ' + textoDoJogador(m, vagaDe(m, id), nomeNaMesa) + ' (voltou)', 3000);
  }
  usarMesa.setState((s) => ({
    atraso: Object.fromEntries(Object.entries(s.atraso).filter(([id]) => online(id))),
  }));
  contarATodos();
});

/** O pior atraso entre os jogadores (pro F3), ou null. */
export function piorAtraso(): { ms: number; quem: string } | null {
  const { atraso } = usarMesa.getState();
  let r: { ms: number; quem: string } | null = null;
  for (const [id, ms] of Object.entries(atraso)) if (!r || ms > r.ms) r = { ms, quem: nomeNaMesa(id) };
  return r;
}

// ---------------------------------------------------------------- lembrar (M.5): por jogo, por console, a última
function chaves(): string[] {
  const j = usarJogo.getState();
  const id = j.registro?.id ?? '';
  const sis = sistema();
  return [id ? 'mesa.jogo.' + id : '', sis ? 'mesa.' + sis : '', 'mesa'].filter(Boolean);
}
function lembrar(m: Mesa) {
  const t = JSON.stringify(m.jogadores);
  for (const k of chaves()) config().guardar(k, t);
}

// abriu um jogo: as vagas de antes voltam (os aparelhos que estão na rede recebem o papel; os outros ficam esperando)
let ultimoJogo: unknown = null;
usarJogo.subscribe((j) => {
  if (j.jogo === ultimoJogo) return;
  ultimoJogo = j.jogo;
  if (!j.jogo) {
    contarATodos(); // a mesa fechou
    return;
  }
  let guardada: Mesa['jogadores'] | null = null;
  for (const k of chaves()) {
    guardada = lerMesaGuardada(config().ler(k));
    if (guardada) break;
  }
  // depois do arranjo lembrado (stores/arranjo espera 800 ms): as vagas por cima
  setTimeout(() => {
    const atual = usarMesa.getState().mesa;
    if (!guardada?.some(Boolean)) return contarATodos();
    const m: Mesa = { ...atual, jogadores: guardada };
    if (validarMesa(m, aparelhosComPapel(), EU, sistema()).ok) trocarMesa(m);
    else contarATodos();
  }, 1200);
});
