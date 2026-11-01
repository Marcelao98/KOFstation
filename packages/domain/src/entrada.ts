// Controles e teclas (app.js 761–964 do antigo): o mapa de entrada em camadas — Geral (`teclas`/`botoes`) → console
// (`teclas.<sis>`) → só este jogo (`teclas.jogo.<jogoId>`) — com a regra do antigo: tecla (ou botão) que já era de outra
// ação sai de lá. Nos consoles com analógico (PS1, PS2, N64), por padrão as setas são o analógico esquerdo, I J K L o
// direito e o direcional vai pra T F G H. Puro: quem lê a configuração passa uma função.
import { BOTAO } from './controle';

/** Botões do SNES: nome, bit no registrador do controle e tecla padrão. */
export const BOTOES_SNES: readonly (readonly [string, number, string])[] = [
  ['Cima', BOTAO.Cima, 'ArrowUp'],
  ['Baixo', BOTAO.Baixo, 'ArrowDown'],
  ['Esquerda', BOTAO.Esquerda, 'ArrowLeft'],
  ['Direita', BOTAO.Direita, 'ArrowRight'],
  ['B', BOTAO.B, 'KeyZ'],
  ['A', BOTAO.A, 'KeyX'],
  ['Y', BOTAO.Y, 'KeyA'],
  ['X', BOTAO.X, 'KeyS'],
  ['L', BOTAO.L, 'KeyQ'],
  ['R', BOTAO.R, 'KeyW'],
  ['Start', BOTAO.Start, 'Enter'],
  ['Select', BOTAO.Select, 'ShiftLeft'],
  ['L2', BOTAO.L2, 'KeyE'],
  ['R2', BOTAO.R2, 'KeyR'],
];

/** Atalhos do emulador: não podem virar botão do jogo. */
export const RESERVADAS: readonly string[] = [
  'Escape',
  'Tab',
  'Backspace',
  'F7',
  'F9',
  'F1',
  'F2',
  'F3',
  'F5',
  'F6',
  'F8',
  'F11',
  'KeyP',
  'KeyM',
  'Minus',
  'Equal',
  'NumpadSubtract',
  'NumpadAdd',
];

/** Analógico no teclado: [ação, eixo, sinal, de onde vem a tecla padrão (ação do direcional ou tecla)]. */
export const EIXOS_TECLA: readonly (readonly [string, number, number, string])[] = [
  ['AE↑', 1, -1, 'Cima'],
  ['AE↓', 1, 1, 'Baixo'],
  ['AE←', 0, -1, 'Esquerda'],
  ['AE→', 0, 1, 'Direita'],
  ['AD↑', 3, -1, 'KeyI'],
  ['AD↓', 3, 1, 'KeyK'],
  ['AD←', 2, -1, 'KeyJ'],
  ['AD→', 2, 1, 'KeyL'],
];
export const DIRECIONAL_ANALOG: Readonly<Record<string, string>> = {
  Cima: 'KeyT',
  Baixo: 'KeyG',
  Esquerda: 'KeyF',
  Direita: 'KeyH',
};

/** O nome no console (o botão do SNES por baixo é o que o núcleo recebe). */
export const NOMES_BOTAO: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  md: { Y: 'A', B: 'B', A: 'C', L: 'X', X: 'Y', R: 'Z', Select: 'Mode' },
  sms: { B: '1', A: '2', Start: 'Pause' },
  gg: { B: '1', A: '2' },
  neogeo: { B: 'A', A: 'B', Y: 'C', X: 'D', Select: 'Ficha' },
  ps1: { B: '✕', A: '○', Y: '□', X: '△', L: 'L1', R: 'R1' },
  ps2: { B: '✕', A: '○', Y: '□', X: '△', L: 'L1', R: 'R1' },
  n64: { B: 'A', Y: 'B', X: 'C▲', A: 'C▼', L: 'Z', R: 'R', L2: 'C◀', R2: 'C▶', Select: 'L' },
};
export const NOMES_ACAO: Readonly<Record<string, string>> = {
  Cima: '↑ direcional',
  Baixo: '↓ direcional',
  Esquerda: '← direcional',
  Direita: '→ direcional',
  'AE↑': '🕹 esquerdo ↑',
  'AE↓': '🕹 esquerdo ↓',
  'AE←': '🕹 esquerdo ←',
  'AE→': '🕹 esquerdo →',
  'AD↑': '🕹 direito ↑',
  'AD↓': '🕹 direito ↓',
  'AD←': '🕹 direito ←',
  'AD→': '🕹 direito →',
};
export const NOMES_PAD: readonly string[] = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'Select',
  'Start',
  'L3',
  'R3',
  '↑',
  '↓',
  '←',
  '→',
  'Guia',
];
export const COM_ANALOG: readonly string[] = ['ps1', 'ps2', 'n64'];
/** 'misto' = o analógico aperta o direcional também (PS1); 'puro' = não aperta (PS2, N64). */
export const ANALOGICO: Readonly<Record<string, 'misto' | 'puro'>> = { ps1: 'misto', ps2: 'puro', n64: 'puro' };
export const ehEixo = (n: string): boolean => EIXOS_TECLA.some(([x]) => x === n);
/** As abas da tela Controles. */
export const ABAS_CONTROLES = [
  'geral',
  'snes',
  'nes',
  'gb',
  'gba',
  'md',
  'sms',
  'gg',
  'neogeo',
  'ps1',
  'n64',
  'ps2',
] as const;

/** As ações que cada console usa ('geral' = os botões do SNES, a base de todos). */
export function acoesDe(sis: string): string[] {
  const dir = ['Cima', 'Baixo', 'Esquerda', 'Direita'];
  const ab = ['B', 'A', 'Select', 'Start'];
  const so: Record<string, string[]> = {
    nes: ab,
    gb: ab,
    gbc: ab,
    sms: ['B', 'A', 'Start'],
    gg: ['B', 'A', 'Start'],
    gba: ['B', 'A', 'L', 'R', 'Select', 'Start'],
    md: ['Y', 'B', 'A', 'L', 'X', 'R', 'Select', 'Start'],
    neogeo: ['B', 'A', 'Y', 'X', 'Select', 'Start'],
  };
  const s = so[sis];
  if (s) return dir.concat(s);
  const l = BOTOES_SNES.map(([n]) => n).filter((n) => !/2$/.test(n) || COM_ANALOG.includes(sis));
  if (sis === 'ps1' || sis === 'ps2') l.push(...EIXOS_TECLA.map(([n]) => n));
  if (sis === 'n64') l.push(...EIXOS_TECLA.slice(0, 4).map(([n]) => n));
  return l;
}

export type Mapa = Record<string, string>;
export type TipoDeMapa = 'teclas' | 'botoes';
const vazio = (v: unknown) => v === '' || v === null || v === undefined;

/** Põe uma camada por cima: tecla (ou botão) que já era de outra ação sai de lá. */
export function juntarCamada(m: Mapa, c: Readonly<Record<string, string | number>>): void {
  for (const [n, v0] of Object.entries(c)) {
    const v = v0 === null || v0 === undefined ? '' : String(v0);
    if (!vazio(v)) for (const o in m) if (o !== n && m[o] === v) m[o] = '';
    m[n] = v;
  }
}

/** Lê uma camada (JSON guardado na configuração); estragada = vazia. */
export function lerCamada(ler: (k: string) => string | null, k: string): Record<string, string> {
  try {
    const v = JSON.parse(ler(k) || 'null') as unknown;
    return v && typeof v === 'object' ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** O mapa de um console (e de um jogo) com todas as camadas. Botões do controle = índice da Gamepad API em texto. */
export function mapaDe(ler: (k: string) => string | null, tipo: TipoDeMapa, sis: string, jogo?: string | null): Mapa {
  const m: Mapa = {};
  for (const [n, bit, tecla] of BOTOES_SNES) {
    if (tipo === 'teclas') m[n] = tecla;
    else {
      const p = BOTOES_PADRAO_INDICE.find(([, b]) => b === bit);
      m[n] = p ? String(p[0]) : '';
    }
  }
  juntarCamada(m, lerCamada(ler, tipo));
  if (sis === 'geral') return m;
  if (tipo === 'teclas' && COM_ANALOG.includes(sis)) {
    const ae: Mapa = {};
    const usa = acoesDe(sis);
    for (const [n, , , de] of EIXOS_TECLA) if (usa.includes(n)) ae[n] = /^Key/.test(de) ? de : (m[de] ?? '');
    juntarCamada(m, ae);
    juntarCamada(m, DIRECIONAL_ANALOG);
  }
  juntarCamada(m, lerCamada(ler, tipo + '.' + sis));
  if (jogo) juntarCamada(m, lerCamada(ler, tipo + '.jogo.' + jogo));
  return m;
}

const BOTOES_PADRAO_INDICE: readonly (readonly [number, number])[] = [
  [0, BOTAO.B],
  [1, BOTAO.A],
  [2, BOTAO.Y],
  [3, BOTAO.X],
  [4, BOTAO.L],
  [5, BOTAO.R],
  [6, BOTAO.L2],
  [7, BOTAO.R2],
  [8, BOTAO.Select],
  [9, BOTAO.Start],
  [12, BOTAO.Cima],
  [13, BOTAO.Baixo],
  [14, BOTAO.Esquerda],
  [15, BOTAO.Direita],
];

/** O que o jogo usa de verdade: tecla → bit, tecla → [eixo, sinal] e os botões do controle [índice, bit]. */
export interface Entrada {
  mapa: Mapa;
  teclas: Record<string, number>;
  teclasEixo: Record<string, [number, number]>;
  botoes: [number, number][];
}

export function montarEntrada(ler: (k: string) => string | null, sis: string, jogo?: string | null): Entrada {
  const usa = new Set(acoesDe(sis));
  const mapa = mapaDe(ler, 'teclas', sis, jogo);
  const teclas: Record<string, number> = {};
  const teclasEixo: Record<string, [number, number]> = {};
  for (const [nome, bit] of BOTOES_SNES) {
    const t = mapa[nome];
    if (t) teclas[t] = bit;
  }
  for (const [n, k, s] of EIXOS_TECLA) {
    const t = mapa[n];
    if (t && usa.has(n)) teclasEixo[t] = [k, s];
  }
  const p = mapaDe(ler, 'botoes', sis, jogo);
  const botoes: [number, number][] = [];
  for (const [nome, bit] of BOTOES_SNES) {
    const v = p[nome];
    if (!vazio(v)) botoes.push([Number(v), bit]);
  }
  return { mapa, teclas, teclasEixo, botoes };
}

/** Os 4 eixos (-32767..32767) das teclas de analógico apertadas; null se nenhuma. */
export function eixosDoTeclado(apertadas: Iterable<string>, teclasEixo: Readonly<Record<string, [number, number]>>) {
  const e = [0, 0, 0, 0];
  let alguma = false;
  for (const c of apertadas) {
    const x = teclasEixo[c];
    if (!x) continue;
    alguma = true;
    e[x[0]] = Math.max(-32767, Math.min(32767, (e[x[0]] ?? 0) + x[1] * 32767));
  }
  return alguma && e.some((v) => v) ? e : null;
}

/** Bits do teclado; no console 'misto' (PS1) o analógico do teclado aperta o direcional também. */
export function tecladoBits(bits: number, eixos: readonly number[] | null, analogico: 'misto' | 'puro' | undefined) {
  let b = bits;
  if (eixos && analogico === 'misto') {
    if ((eixos[0] ?? 0) < 0) b |= BOTAO.Esquerda;
    if ((eixos[0] ?? 0) > 0) b |= BOTAO.Direita;
    if ((eixos[1] ?? 0) < 0) b |= BOTAO.Cima;
    if ((eixos[1] ?? 0) > 0) b |= BOTAO.Baixo;
  }
  return b;
}

export function nomeTecla(c: string | undefined | null): string {
  if (!c) return '—';
  const setas: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (setas[c]) return setas[c];
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit\d$/.test(c)) return c.slice(5);
  if (/^Numpad/.test(c)) return 'Num ' + c.slice(6);
  const nomes: Record<string, string> = {
    Space: 'Espaço',
    ShiftLeft: 'Shift esq.',
    ShiftRight: 'Shift dir.',
    ControlLeft: 'Ctrl esq.',
    ControlRight: 'Ctrl dir.',
    AltLeft: 'Alt',
    AltRight: 'AltGr',
    Backspace: 'Backspace',
    Enter: 'Enter',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    BracketLeft: '[',
    BracketRight: ']',
    Minus: '-',
    Equal: '=',
    Backslash: '\\',
    IntlBackslash: '\\',
  };
  return nomes[c] ?? c;
}
export const nomePad = (i: string | undefined): string =>
  vazio(i) ? '—' : (NOMES_PAD[Number(i)] ?? 'botão ' + String(i));

/** Onde a tela grava agora: geral, o console ou só este jogo. */
export const chaveCamada = (tipo: TipoDeMapa, aba: string, jogo: string | null): string =>
  aba === 'geral' ? tipo : jogo ? tipo + '.jogo.' + jogo : tipo + '.' + aba;

/** Grava uma tecla/botão na camada; a que já era de outra ação troca com esta (o gravarControle do antigo). */
export function gravarNaCamada(
  ler: (k: string) => string | null,
  tipo: TipoDeMapa,
  aba: string,
  jogo: string | null,
  nome: string,
  v: string,
): [string, Record<string, string>] {
  const k = chaveCamada(tipo, aba, jogo);
  const cam = lerCamada(ler, k);
  const atual = mapaDe(ler, tipo, aba, jogo);
  const dono = Object.keys(atual).find((o) => o !== nome && atual[o] === v);
  if (dono) cam[dono] = vazio(atual[nome]) ? '' : (atual[nome] ?? '');
  cam[nome] = v;
  return [k, cam];
}
