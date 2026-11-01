// O formato dos saves, das estatísticas e do pacote .kofsave (web/guarda.js `KofGuarda` do antigo, linha por linha).
// Tudo pensado pra ocupar pouco e juntar dados de aparelhos diferentes sem perder nada. Sem página nem banco: usa só
// CompressionStream (navegador e Node).
import { crc32, hex8 } from './rom';

const fluxo = async (u8: Uint8Array, t: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([u8 as Uint8Array<ArrayBuffer>]).stream().pipeThrough(t)).arrayBuffer());
export const gz = (u8: Uint8Array): Promise<Uint8Array> => fluxo(u8, new CompressionStream('gzip'));
export const ungz = (u8: Uint8Array): Promise<Uint8Array> => fluxo(u8, new DecompressionStream('gzip'));
export const deTexto = (t: string): Uint8Array => {
  const u = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i) & 255;
  return u;
};
export const crc32Hex = (u8: Uint8Array): string => hex8(crc32(u8));

// ---------- saves ----------

export interface CopiaSave {
  dados: Uint8Array;
  cheio: number;
  hash: string;
  quando?: number;
  aparelho?: string;
}
export interface RegistroSave extends CopiaSave {
  chave: string;
  nome?: string;
  jogo?: string;
  anterior?: CopiaSave | null;
}

/** Comprime sem o fim vazio (0xFF), com o hash só da parte com conteúdo. */
export async function empacotarSave<E extends object>(
  bytes: Uint8Array,
  extra: E,
): Promise<{ dados: Uint8Array; cheio: number; hash: string } & E> {
  let n = bytes.length;
  while (n > 0 && bytes[n - 1] === 0xff) n--;
  const util = bytes.subarray(0, n);
  return Object.assign({ dados: await gz(util), cheio: bytes.length, hash: crc32Hex(util) }, extra);
}

export async function abrirSave(reg: Pick<CopiaSave, 'dados' | 'cheio'>): Promise<Uint8Array> {
  const d = await ungz(reg.dados);
  const u = new Uint8Array(reg.cheio || d.length).fill(0xff);
  u.set(d.subarray(0, u.length));
  return u;
}

/** 'igual', 'trazer' (o de fora é mais novo) ou 'manter' (o daqui é mais novo). */
export function decidir(
  aqui: { hash: string; quando?: number } | null | undefined,
  fora: { hash: string; quando?: number } | null | undefined,
): 'igual' | 'trazer' | 'manter' {
  if (!aqui) return 'trazer';
  if (!fora || aqui.hash === fora.hash) return 'igual';
  return (fora.quando ?? 0) > (aqui.quando ?? 0) ? 'trazer' : 'manter';
}

// ---------- estatísticas ----------

export interface ParteStats {
  tempo: number;
  sessoes: number;
  primeiro: number;
  ultimo: number;
  dias: [number, number][];
  meses: Record<string, number>;
  horas: number[];
}
export interface RegistroStats {
  id: string;
  nome: string;
  partes: Record<string, ParteStats>;
}
/** O formato antigo (antes da v8). */
export interface StatsVelho {
  id?: string;
  nome?: string;
  tempo?: number;
  sessoes?: number;
  primeiro?: number;
  ultimo?: number;
  dias?: Record<string, number>;
}

const DIAS = 400;
export const numDia = (t: number): number => {
  const d = new Date(t);
  return Math.floor((t - d.getTimezoneOffset() * 60000) / 864e5);
};
export const textoDia = (n: number): string => new Date(n * 864e5).toISOString().slice(0, 10);
const mesDe = (n: number) => textoDia(n).slice(0, 7).replace('-', '');
const novaParte = (t: number): ParteStats => ({
  tempo: 0,
  sessoes: 0,
  primeiro: t,
  ultimo: t,
  dias: [],
  meses: {},
  horas: new Array<number>(24).fill(0),
});

function somarTempo(p: ParteStats, ms: number, t: number): ParteStats {
  const d = numDia(t);
  const s = Math.round(ms / 1000);
  const ult = p.dias[p.dias.length - 1];
  p.tempo += ms;
  p.ultimo = t;
  if (ult && ult[0] === d) ult[1] += s;
  else p.dias.push([d, s]);
  const h = new Date(t).getHours();
  p.horas[h] = (p.horas[h] ?? 0) + s;
  while (p.dias.length > DIAS) {
    const [v, seg] = p.dias.shift() as [number, number];
    const m = mesDe(v);
    p.meses[m] = (p.meses[m] ?? 0) + seg;
  }
  return p;
}
const parteDe = (reg: RegistroStats, aparelho: string, t: number) => (reg.partes[aparelho] ??= novaParte(t));

export function migrarStats(
  velho: StatsVelho | null | undefined,
  aparelho: string,
  id: string,
  nome: string,
): RegistroStats {
  const reg: RegistroStats = { id: velho?.id || id, nome: velho?.nome || nome, partes: {} };
  if (!velho) return reg;
  const p = novaParte(velho.primeiro || Date.now());
  p.tempo = velho.tempo || 0;
  p.sessoes = velho.sessoes || 0;
  p.ultimo = velho.ultimo || p.primeiro;
  p.dias = Object.keys(velho.dias ?? {})
    .sort()
    .map((k) => [Math.round(Date.parse(k) / 864e5), Math.round((velho.dias?.[k] ?? 0) / 1000)]);
  reg.partes[aparelho] = p;
  return reg;
}

const ehNovo = (r: unknown): r is RegistroStats => !!r && typeof r === 'object' && 'partes' in r;

export function registrarTempo(
  reg: RegistroStats | StatsVelho | null | undefined,
  id: string,
  nome: string,
  aparelho: string,
  ms: number,
  t: number,
): RegistroStats {
  const r = ehNovo(reg) ? reg : migrarStats(reg, aparelho, id, nome);
  r.nome = nome;
  somarTempo(parteDe(r, aparelho, t), ms, t);
  return r;
}

export function contarSessao(
  reg: RegistroStats | StatsVelho | null | undefined,
  id: string,
  nome: string,
  aparelho: string,
  t: number,
): RegistroStats {
  const r = ehNovo(reg) ? reg : migrarStats(reg, aparelho, id, nome);
  const p = parteDe(r, aparelho, t);
  p.sessoes++;
  p.ultimo = t;
  r.nome = nome;
  return r;
}

export interface VisaoStats {
  id: string;
  nome: string;
  tempo: number;
  sessoes: number;
  primeiro: number;
  ultimo: number;
  dias: Record<string, number>;
  horas: number[];
  aparelhos: number;
}

/** A soma das partes, no formato que a tela de estatísticas usa. */
export function visao(reg: RegistroStats): VisaoStats {
  const v: VisaoStats = {
    id: reg.id,
    nome: reg.nome,
    tempo: 0,
    sessoes: 0,
    primeiro: 0,
    ultimo: 0,
    dias: {},
    horas: new Array<number>(24).fill(0),
    aparelhos: Object.keys(reg.partes).length,
  };
  for (const p of Object.values(reg.partes)) {
    v.tempo += p.tempo;
    v.sessoes += p.sessoes;
    if (p.primeiro && (!v.primeiro || p.primeiro < v.primeiro)) v.primeiro = p.primeiro;
    if (p.ultimo > v.ultimo) v.ultimo = p.ultimo;
    for (const [d, s] of p.dias) {
      const k = textoDia(d);
      v.dias[k] = (v.dias[k] ?? 0) + s * 1000;
    }
    (p.horas ?? []).forEach((s, h) => {
      v.horas[h] = (v.horas[h] ?? 0) + s;
    });
  }
  return v;
}

/** Junta com o de outro aparelho: cada parte fica com a versão mais adiantada. */
export function juntarStats(aqui: RegistroStats | null | undefined, fora: RegistroStats | null | undefined) {
  if (!fora?.partes) return aqui ?? null;
  if (!aqui?.partes) return structuredClone(fora);
  const r: RegistroStats = { id: aqui.id, nome: aqui.nome || fora.nome, partes: { ...aqui.partes } };
  for (const [ap, p] of Object.entries(fora.partes)) {
    const a = r.partes[ap];
    if (!a || p.tempo > a.tempo || (p.tempo === a.tempo && p.ultimo > a.ultimo)) r.partes[ap] = structuredClone(p);
  }
  return r;
}

// ---------- pacote .kofsave ----------
// "KOFSAVE1" + tamanho do JSON (4 bytes) + JSON comprimido + os blocos binários. No JSON, cada binário vira
// {$b: início, n: tamanho}.
const MAGICO = 'KOFSAVE1';

export async function criarPacote(conteudo: unknown): Promise<Uint8Array> {
  const blocos: Uint8Array[] = [];
  let pos = 0;
  const json = JSON.stringify(conteudo, (_k, v: unknown) => {
    if (v instanceof Uint8Array) {
      blocos.push(v);
      const r = { $b: pos, n: v.length };
      pos += v.length;
      return r;
    }
    return v;
  });
  const j = await gz(new TextEncoder().encode(json));
  const cab = new Uint8Array(12);
  cab.set(deTexto(MAGICO));
  new DataView(cab.buffer).setUint32(8, j.length, true);
  const u = new Uint8Array(12 + j.length + pos);
  u.set(cab);
  u.set(j, 12);
  let p = 12 + j.length;
  for (const b of blocos) {
    u.set(b, p);
    p += b.length;
  }
  return u;
}

export const ehPacote = (u8: Uint8Array | null | undefined): boolean =>
  !!u8 && u8.length > 12 && String.fromCharCode(...u8.subarray(0, 8)) === MAGICO;

export async function lerPacote<T = unknown>(u8: Uint8Array): Promise<T> {
  if (!ehPacote(u8)) throw new Error('isso não é um pacote .kofsave');
  const n = new DataView(u8.buffer, u8.byteOffset).getUint32(8, true);
  const base = 12 + n;
  const json = new TextDecoder().decode(await ungz(u8.subarray(12, base)));
  return JSON.parse(json, (_k, v: unknown) => {
    if (v && typeof v === 'object' && '$b' in v && 'n' in v) {
      const b = v as { $b: number; n: number };
      return u8.slice(base + b.$b, base + b.$b + b.n);
    }
    return v;
  }) as T;
}

/** O conteúdo de um .kofsave (versão 1). */
export interface PacoteKofsave {
  versao: number;
  aparelho: string;
  nome: string;
  quando: number;
  saves: RegistroSave[];
  stats: (RegistroStats | StatsVelho)[];
  config: Record<string, string>;
  estados: { jogo: string; nome: string; quando: number; capa?: string; dados: Uint8Array }[];
}
