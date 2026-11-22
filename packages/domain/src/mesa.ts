// 🎲 A Mesa de aparelhos (tarefa M, 22/11): tudo o que a rede está fazendo, num lugar só. Um aparelho é o 🧠 Núcleo
// (roda o jogo), um é a 📺 Tela (a imagem e o som) e até quatro jogadores (J1..J4), cada um com o seu aparelho e o seu
// tipo de controle (o celular pode ser um Wiimote). Um aparelho pode ter mais de um papel (o PC sozinho é núcleo, tela
// e J1). É a evolução do arranjo da tarefa N (que pensava em "um controle"): os arranjos prontos viram mesas prontas.
// Tudo aqui é puro: a tela e os stores só perguntam.
import { MAX_APARELHOS, MAX_JOGADORES, type AparelhoComPapel, type Arranjo, type Validacao } from './arranjo';

export type TipoControle = 'controle' | 'teclado' | 'toque' | 'wiimote' | 'wiimote+nunchuk' | 'gamecube';

export const TIPOS_CONTROLE: readonly { t: TipoControle; i: string; nome: string }[] = [
  { t: 'teclado', i: '⌨', nome: 'Teclado' },
  { t: 'controle', i: '🎮', nome: 'Controle' },
  { t: 'toque', i: '👆', nome: 'Toque' },
  { t: 'wiimote', i: '📳', nome: 'Wiimote' },
  { t: 'wiimote+nunchuk', i: '📳🥢', nome: 'Wiimote + Nunchuk' },
  { t: 'gamecube', i: '🟪', nome: 'GameCube' },
];

export const nomeDoTipo = (t: TipoControle): string => TIPOS_CONTROLE.find((x) => x.t === t)?.nome ?? t;
export const ehWiimote = (t: TipoControle | undefined): boolean => t === 'wiimote' || t === 'wiimote+nunchuk';

/** Uma vaga ocupada: o aparelho, o tipo de controle e (Wiimote + Nunchuk) o celular que é o Nunchuk. */
export interface Jogador {
  aparelho: string;
  tipo: TipoControle;
  /** outro celular como Nunchuk (o mesmo jogador; os botões e o analógico dele somam com os do Wiimote) */
  nunchuk?: string;
  /** Wiimote sem passar pelo assistente de calibração, de propósito ("usar sem calibrar") */
  semCalibrar?: boolean;
}

export interface Mesa {
  nucleo: string;
  tela: string;
  /** sempre 4 vagas (null = livre) */
  jogadores: (Jogador | null)[];
}

/** O tipo que um aparelho usa quando entra sem escolher. */
export function tipoPadrao(tipoAparelho: string, eu: boolean, sistema = ''): TipoControle {
  if (tipoAparelho === 'celular') return sistema === 'wii' ? 'wiimote' : 'toque';
  if (sistema === 'gc') return 'gamecube';
  return eu ? 'teclado' : 'controle';
}

/** Os tipos que valem pra um aparelho no console (o Wiimote só no Wii; o resto como na tela de teclas). */
export function tiposDoConsole(sistema: string, tipoAparelho: string): TipoControle[] {
  const wii = sistema === 'wii';
  const gc = sistema === 'gc' || wii; // o Wii tem as portas do GameCube
  if (tipoAparelho === 'celular') return ['toque', ...(wii ? (['wiimote', 'wiimote+nunchuk'] as const) : [])];
  const l: TipoControle[] = ['teclado', 'controle'];
  if (wii) l.push('wiimote', 'wiimote+nunchuk'); // no PC: o ponteiro no mouse (W.4)
  if (gc) l.push('gamecube');
  return l;
}

export function mesaSozinho(eu: string, sistema = ''): Mesa {
  return {
    nucleo: eu,
    tela: eu,
    jogadores: [{ aparelho: eu, tipo: tipoPadrao('pc', true, sistema) }, null, null, null],
  };
}

const quatro = (l: (Jogador | null)[]): (Jogador | null)[] =>
  Array.from({ length: MAX_JOGADORES }, (_, i) => l[i] ?? null);

/** Em que vaga (0..3) está o aparelho (como Wiimote/controle ou como Nunchuk), ou -1. */
export function vagaDe(m: Mesa, id: string): number {
  return m.jogadores.findIndex((j) => !!j && (j.aparelho === id || j.nunchuk === id));
}

/** A primeira vaga livre, ou -1. */
export const vagaLivre = (m: Mesa): number => m.jogadores.findIndex((j) => !j);

/**
 * O J1 é só o próprio núcleo no teclado (o padrão, ninguém escolheu)? Então ele é de quem chegar: o primeiro aparelho
 * que entra sem pedir vaga pega o J1 (o teclado do núcleo continua mandando no J1 junto, como antes da Mesa). Sem isso
 * o celular caía no J2 e o jogo de um jogador (o Wii Sports só ouve o Wiimote 1) não andava (22/11, jogando).
 */
const j1DoNucleo = (m: Mesa, eu: string | undefined): boolean =>
  !!eu && m.jogadores[0]?.aparelho === eu && m.jogadores[0]?.tipo === 'teclado' && !m.jogadores[0]?.nunchuk;

/** A vaga de quem chega sem pedir: o J1 se for só do núcleo no teclado, senão a primeira livre. */
export function vagaPraQuemChega(m: Mesa, id: string, eu?: string): number {
  if (id !== eu && j1DoNucleo(m, eu)) return 0;
  return vagaLivre(m);
}

/** Os aparelhos distintos que a mesa usa. */
export function aparelhosDaMesa(m: Mesa): string[] {
  const l = [m.nucleo, m.tela];
  for (const j of m.jogadores) if (j) l.push(j.aparelho, ...(j.nunchuk ? [j.nunchuk] : []));
  return [...new Set(l)];
}

/**
 * O arranjo da tarefa N que a mesa usa (quem recebe o papel de controle e pra onde vai a imagem). Com `online`, só os
 * que estão na rede (as vagas reservadas não recebem papel até o aparelho voltar).
 */
export function arranjoDaMesa(m: Mesa, online: (id: string) => boolean = () => true): Arranjo {
  const controles: string[] = [];
  for (const j of m.jogadores)
    if (j)
      for (const id of [j.aparelho, j.nunchuk])
        if (id && !controles.includes(id) && (id === m.nucleo || online(id))) controles.push(id);
  return { nucleo: m.nucleo, tela: m.tela, controles: controles.length ? controles : [m.nucleo] };
}

/**
 * O arranjo mudou por fora (um arranjo pronto, um chip): a mesa acompanha. Quem continua fica na mesma vaga; quem
 * saiu do arranjo e está na rede sai da vaga; quem caiu (fora da rede) fica com a vaga **reservada**; quem entrou
 * pega a próxima vaga livre, com o tipo padrão.
 */
export function mesaDoArranjo(
  a: Arranjo,
  antes: Mesa,
  aparelhos: readonly AparelhoComPapel[],
  eu: string,
  sistema = '',
): Mesa {
  const achar = (id: string) => aparelhos.find((x) => x.id === id);
  const online = (id: string) => id === eu || !!achar(id)?.online;
  const jogadores = antes.jogadores.map((j) => {
    if (!j) return null;
    if (!a.controles.includes(j.aparelho) && online(j.aparelho)) return null;
    if (j.nunchuk && !a.controles.includes(j.nunchuk) && online(j.nunchuk)) {
      const sem: Jogador = { ...j, tipo: 'wiimote' };
      delete sem.nunchuk;
      return sem;
    }
    return j;
  });
  const m: Mesa = { nucleo: a.nucleo, tela: a.tela, jogadores: quatro(jogadores) };
  for (const c of a.controles) {
    if (vagaDe(m, c) >= 0) continue;
    // o núcleo que cedeu o J1 não volta pra outra vaga sozinho: o teclado dele já manda no J1
    if (c === eu && m.jogadores.some((j) => !!j && j.aparelho !== eu)) continue;
    const v = vagaPraQuemChega(m, c, eu);
    if (v < 0) break;
    m.jogadores[v] = { aparelho: c, tipo: tipoPadrao(achar(c)?.tipo ?? 'pc', c === eu, sistema) };
  }
  if (!m.jogadores.some(Boolean)) m.jogadores[0] = { aparelho: eu, tipo: tipoPadrao('pc', true, sistema) };
  return m;
}

/**
 * A mesa serve? Aparelho fora da rede numa vaga não é erro: a vaga fica reservada pra quando ele voltar. A tela fora
 * da rede é (não tem onde mostrar a imagem). Wiimote sem calibrar pode ficar com a vaga (os botões valem; os
 * sensores só ligam depois da calibração, ver `querMovimento`), com o aviso "calibrar" na Mesa.
 */
export function validarMesa(m: Mesa, aparelhos: readonly AparelhoComPapel[], eu: string, sistema = ''): Validacao {
  const achar = (id: string): AparelhoComPapel | undefined =>
    aparelhos.find((x) => x.id === id) ??
    (id === eu ? { id, nome: 'este aparelho', tipo: 'pc', online: true } : undefined);
  const ids = aparelhosDaMesa(m);
  if (ids.length > MAX_APARELHOS) return { ok: false, motivo: `no máximo ${MAX_APARELHOS} aparelhos de cada vez` };
  if (m.nucleo !== eu) return { ok: false, motivo: 'o núcleo tem que ser este aparelho (o jogo está aberto aqui)' };
  for (const id of ids) if (!achar(id)) return { ok: false, motivo: 'um aparelho da mesa não está na lista' };
  const tela = achar(m.tela);
  if (tela && m.tela !== eu && !tela.online) return { ok: false, motivo: `${tela.nome} não está na rede agora` };
  if (!m.jogadores.some(Boolean)) return { ok: false, motivo: 'falta jogador (pelo menos o J1)' };
  const vistos = new Map<string, number>();
  for (let i = 0; i < m.jogadores.length; i++) {
    const j = m.jogadores[i];
    if (!j) continue;
    const x = achar(j.aparelho);
    if (!x) continue;
    const tipo = x.tipo;
    if (sistema && !tiposDoConsole(sistema, tipo).includes(j.tipo))
      return { ok: false, motivo: `J${i + 1}: ${nomeDoTipo(j.tipo)} não vale nesse console` };
    for (const id of [j.aparelho, j.nunchuk]) {
      if (!id || id === eu) continue; // o PC pode ter o teclado num jogador e um controle em outro
      if (vistos.has(id))
        return {
          ok: false,
          motivo: `J${i + 1}: ${achar(id)?.nome ?? 'o aparelho'} já é o J${(vistos.get(id) ?? 0) + 1}`,
        };
      vistos.set(id, i);
    }
    if (j.nunchuk) {
      if (j.tipo !== 'wiimote+nunchuk') return { ok: false, motivo: `J${i + 1}: Nunchuk só com Wiimote + Nunchuk` };
      if (j.nunchuk === j.aparelho) return { ok: false, motivo: `J${i + 1}: o Nunchuk tem que ser outro aparelho` };
      if (achar(j.nunchuk)?.tipo !== 'celular')
        return { ok: false, motivo: `J${i + 1}: o Nunchuk tem que ser um celular` };
    }
  }
  return { ok: true };
}

/** O que mostrar numa vaga. */
export type EstadoVaga = 'livre' | 'ok' | 'esperando' | 'calibrar';

export function estadoDaVaga(
  j: Jogador | null | undefined,
  online: (id: string) => boolean,
  calibrado: (id: string) => boolean,
  celular: (id: string) => boolean,
): EstadoVaga {
  if (!j) return 'livre';
  if (!online(j.aparelho) || (j.nunchuk && !online(j.nunchuk))) return 'esperando';
  if (ehWiimote(j.tipo) && celular(j.aparelho) && !j.semCalibrar && !calibrado(j.aparelho)) return 'calibrar';
  return 'ok';
}

/**
 * "🎮 Entrar como jogador": o aparelho pega a vaga pedida (ou a próxima livre). Já estava numa vaga: troca só o
 * tipo (ou muda de vaga, se pediu outra). Devolve a mesa nova e a vaga, ou o motivo.
 */
export function entrarNaMesa(
  m: Mesa,
  id: string,
  tipo: TipoControle,
  vaga = -1,
  eu?: string,
): { mesa: Mesa; vaga: number } | { falta: string } {
  const jogadores = [...m.jogadores];
  const era = vagaDe(m, id);
  if (era >= 0 && (vaga < 0 || vaga === era)) {
    const j = jogadores[era];
    if (j && j.nunchuk === id) return { mesa: m, vaga: era }; // é o Nunchuk de alguém: fica como está
    jogadores[era] = { ...(j as Jogador), tipo };
    return { mesa: { ...m, jogadores }, vaga: era };
  }
  const v = vaga >= 0 ? vaga : vagaPraQuemChega(m, id, eu);
  if (v < 0 || v >= MAX_JOGADORES) return { falta: `as ${MAX_JOGADORES} vagas estão ocupadas` };
  const doNucleo = v === 0 && id !== eu && j1DoNucleo(m, eu); // o J1 do núcleo no teclado cede (o teclado segue no J1)
  if (jogadores[v] && jogadores[v]?.aparelho !== id && !doNucleo) return { falta: `o J${v + 1} já tem jogador` };
  if (era >= 0) jogadores[era] = null;
  jogadores[v] = { aparelho: id, tipo };
  return { mesa: { ...m, jogadores }, vaga: v };
}

/** Tirar o jogador da vaga (o J1 do núcleo volta pra ele, pra não ficar sem ninguém). */
export function sairDaMesa(m: Mesa, vaga: number, eu: string): Mesa {
  const jogadores = [...m.jogadores];
  jogadores[vaga] = null;
  if (!jogadores.some(Boolean)) jogadores[0] = { aparelho: eu, tipo: 'teclado' };
  return { ...m, jogadores };
}

/** Pôr (ou tirar, com `undefined`) o celular Nunchuk de um jogador Wiimote + Nunchuk. */
export function porNunchuk(m: Mesa, vaga: number, nunchuk: string | undefined): Mesa {
  const j = m.jogadores[vaga];
  if (!j) return m;
  const jogadores = m.jogadores.map((x, i) => {
    if (!x || i === vaga || !nunchuk) return x;
    if (x.nunchuk === nunchuk) {
      const sem: Jogador = { ...x };
      delete sem.nunchuk;
      return sem;
    }
    return x.aparelho === nunchuk ? null : x; // o celular sai da vaga que tinha
  });
  const novo: Jogador = { ...j, tipo: nunchuk ? 'wiimote+nunchuk' : j.tipo };
  if (nunchuk) novo.nunchuk = nunchuk;
  else delete novo.nunchuk;
  jogadores[vaga] = novo;
  return { ...m, jogadores };
}

/**
 * Pra distribuir os botões (juntarJogadores): a chave de cada aparelho da rede → o jogador. O celular e o PC que
 * controlam pela rede chegam como `cel:<id>`; o Nunchuk soma com o Wiimote. Os controles deste aparelho (teclado,
 * USB) seguem a escolha da tela 🎮 Jogadores.
 */
export function chavesDaMesa(m: Mesa, eu: string): Record<string, number> {
  const r: Record<string, number> = {};
  m.jogadores.forEach((j, i) => {
    if (!j) return;
    if (j.aparelho !== eu) r['cel:' + j.aparelho] = i;
    if (j.nunchuk) r['cel:' + j.nunchuk] = i;
  });
  return r;
}

/** O movimento (os sensores) deste aparelho entra no jogo? Só do Wiimote, na vaga dele, calibrado ou de propósito. */
export function querMovimento(m: Mesa, id: string, calibrado: boolean): boolean {
  const v = vagaDe(m, id);
  const j = v >= 0 ? m.jogadores[v] : null;
  return !!j && j.aparelho === id && ehWiimote(j.tipo) && (calibrado || !!j.semCalibrar);
}

/** O aviso de quem entrou ("Jogador 2: Moto, Wiimote"). */
export function textoDoJogador(m: Mesa, vaga: number, nome: (id: string) => string): string {
  const j = m.jogadores[vaga];
  if (!j) return `Jogador ${vaga + 1}: livre`;
  const n = j.nunchuk ? `${nome(j.aparelho)} + ${nome(j.nunchuk)}` : nome(j.aparelho);
  return `Jogador ${vaga + 1}: ${n}, ${nomeDoTipo(j.tipo)}`;
}

/** A mesa já leva a esse arranjo? (a tela e os mesmos controles, na rede) */
export const mesmoArranjo = (m: Mesa, a: Arranjo, online: (id: string) => boolean = () => true): boolean => {
  const x = arranjoDaMesa(m, online);
  const l = (y: Arranjo) => [...y.controles].sort().join();
  return x.nucleo === a.nucleo && x.tela === a.tela && l(x) === l(a);
};

// ---------------------------------------------------------------- o canal `mesa`
/** O que o núcleo conta pra cada aparelho: a mesa vista de lá (com os nomes) e a vaga dele. */
export interface VistaDaMesa {
  t: 'mesa';
  /** false = o núcleo fechou o jogo (não tem mais mesa) */
  aberta: boolean;
  sistema: string;
  jogo: string;
  /** a vaga deste aparelho (-1 = não joga) e o tipo */
  voce: number;
  tipo: TipoControle | '';
  /** este aparelho é a tela? */
  tela: boolean;
  /** sou o Nunchuk de alguém? */
  nunchuk: boolean;
  semCalibrar: boolean;
  /** as quatro vagas, por nome ('' = livre) */
  vagas: { nome: string; tipo: TipoControle | ''; esperando: boolean }[];
}

/** O que um aparelho pede ao núcleo (e as respostas do vaivém do atraso). */
export type PedidoMesa =
  | { t: 'entrar'; tipo?: TipoControle; vaga?: number }
  | { t: 'sair' }
  | { t: 'tela' }
  | { t: 'calibrado'; ok: boolean }
  | { t: 'ping'; n: number }
  | { t: 'pong'; n: number }
  | { t: 'recentrar' };

const TIPOS_OK = new Set<string>(TIPOS_CONTROLE.map((x) => x.t));

export function lerMensagemMesa(dados: string): VistaDaMesa | PedidoMesa | null {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(dados) as Record<string, unknown>;
  } catch {
    return null; // mensagem torta: ignora, como os outros canais
  }
  if (!o || typeof o !== 'object') return null;
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const tipo = (v: unknown): TipoControle | undefined =>
    typeof v === 'string' && TIPOS_OK.has(v) ? (v as TipoControle) : undefined;
  switch (o.t) {
    case 'mesa': {
      const vagas = Array.isArray(o.vagas) ? o.vagas.slice(0, MAX_JOGADORES) : [];
      return {
        t: 'mesa',
        aberta: o.aberta !== false,
        sistema: typeof o.sistema === 'string' ? o.sistema.slice(0, 10) : '',
        jogo: typeof o.jogo === 'string' ? o.jogo.slice(0, 80) : '',
        voce: Math.max(-1, Math.min(MAX_JOGADORES - 1, Math.trunc(n(o.voce, -1)))),
        tipo: tipo(o.tipo) ?? '',
        tela: !!o.tela,
        nunchuk: !!o.nunchuk,
        semCalibrar: !!o.semCalibrar,
        vagas: quatroVagas(vagas),
      };
    }
    case 'entrar': {
      const p: PedidoMesa = { t: 'entrar' };
      const t = tipo(o.tipo);
      if (t) p.tipo = t;
      const v = Math.trunc(n(o.vaga, -1));
      if (v >= 0 && v < MAX_JOGADORES) p.vaga = v;
      return p;
    }
    case 'sair':
    case 'tela':
    case 'recentrar':
      return { t: o.t };
    case 'calibrado':
      return { t: 'calibrado', ok: !!o.ok };
    case 'ping':
    case 'pong':
      return { t: o.t, n: n(o.n, 0) };
    default:
      return null;
  }
}

function quatroVagas(l: unknown[]): VistaDaMesa['vagas'] {
  return Array.from({ length: MAX_JOGADORES }, (_, i) => {
    const v = (l[i] ?? {}) as Record<string, unknown>;
    const t = typeof v.tipo === 'string' && TIPOS_OK.has(v.tipo) ? (v.tipo as TipoControle) : '';
    return { nome: typeof v.nome === 'string' ? v.nome.slice(0, 40) : '', tipo: t, esperando: !!v.esperando };
  });
}

/** A vista da mesa pra um aparelho (o núcleo monta uma pra cada um). */
export function vistaPara(
  m: Mesa,
  id: string,
  nome: (id: string) => string,
  online: (id: string) => boolean,
  sistema: string,
  jogo: string,
): VistaDaMesa {
  const v = vagaDe(m, id);
  const j = v >= 0 ? m.jogadores[v] : null;
  return {
    t: 'mesa',
    aberta: true,
    sistema,
    jogo,
    voce: v,
    tipo: j?.tipo ?? '',
    tela: m.tela === id,
    nunchuk: !!j && j.nunchuk === id,
    semCalibrar: !!j?.semCalibrar,
    vagas: m.jogadores.map((x) =>
      x
        ? {
            nome: x.nunchuk ? `${nome(x.aparelho)} + ${nome(x.nunchuk)}` : nome(x.aparelho),
            tipo: x.tipo,
            esperando: !online(x.aparelho) || (!!x.nunchuk && !online(x.nunchuk)),
          }
        : { nome: '', tipo: '', esperando: false },
    ),
  };
}

/** Lembrar a mesa (por jogo, por console): só as vagas dos aparelhos (núcleo e tela ficam no arranjo lembrado). */
export function lerMesaGuardada(t: string | null | undefined): (Jogador | null)[] | null {
  if (!t) return null;
  try {
    const l = JSON.parse(t) as unknown;
    if (!Array.isArray(l)) return null;
    return quatro(
      l.map((x) => {
        const o = x as Partial<Jogador> | null;
        if (!o || typeof o.aparelho !== 'string' || typeof o.tipo !== 'string' || !TIPOS_OK.has(o.tipo)) return null;
        const j: Jogador = { aparelho: o.aparelho, tipo: o.tipo };
        if (typeof o.nunchuk === 'string') j.nunchuk = o.nunchuk;
        if (o.semCalibrar) j.semCalibrar = true;
        return j;
      }),
    );
  } catch {
    return null; // guardado torto (versão velha): começa do zero
  }
}
