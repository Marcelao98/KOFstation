// Savestates (app.js `salvarEstado`/`limitarEstados`/`carregarEstado`/`estadosDe` do antigo), no mesmo formato: os
// dados são o JSON {lr: núcleo, d: base64 do estado} (o Snes9x também com s9x: 1) comprimido em gzip, e cada estado
// guarda o print do momento (capa). Na loja `estados`, a chave é "<jogoId>/<quando>".
import { gz, ungz } from '@kof/domain';
import type { Armazem } from './armazem';
import { mudarJogo } from './jogos';
import { chaveDoEstado, type MetaEstado } from './saves';

export const LIMITES_ESTADOS = [10, 20, 50, 100, 0] as const;

const b64 = (u8: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const deB64 = (t: string) => {
  const s = atob(t);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
};

export interface EstadoDoNucleo {
  lr?: string;
  d?: string;
  s9x?: number;
}

/** O objeto que o antigo guardava (KofEstado.capturar de um núcleo libretro). */
export function capturado(nucleo: string, estado: Uint8Array): EstadoDoNucleo {
  return Object.assign(nucleo === 'snes9x' ? { s9x: 1 } : {}, { lr: nucleo, d: b64(estado) });
}

/** Os bytes do estado, se for do mesmo núcleo (o KofEstado.restaurar do antigo). */
export function bytesDoCapturado(o: EstadoDoNucleo, nucleo: string): Uint8Array {
  const de = o.lr ?? (o.s9x ? 'snes9x' : 'kof');
  if (de !== nucleo)
    throw new Error(
      de === 'kof'
        ? 'esse estado é do núcleo Kof do SNES (ele chega no app novo no M11)'
        : 'esse estado é de outro núcleo',
    );
  if (!o.d) throw new Error('estado vazio');
  return deB64(o.d);
}

export async function comprimirTexto(t: string): Promise<Uint8Array> {
  return gz(new TextEncoder().encode(t));
}
export async function descomprimirTexto(u8: Uint8Array): Promise<string> {
  return new TextDecoder().decode(await ungz(u8));
}

export interface EstadoSalvo extends MetaEstado {
  key: string;
}

export async function estadosDe(arm: Armazem, jogo?: string): Promise<EstadoSalvo[]> {
  const l = await arm.listar<MetaEstado>('estados', jogo ? jogo + '/' : undefined);
  return l
    .filter((e) => !jogo || e.meta.jogo === jogo)
    .map((e) => ({ ...e.meta, key: e.key }))
    .sort((a, b) => b.quando - a.quando);
}

export async function guardarEstado(
  arm: Armazem,
  meta: MetaEstado,
  nucleo: string,
  estado: Uint8Array,
): Promise<string> {
  const dados = await comprimirTexto(JSON.stringify(capturado(nucleo, estado)));
  const k = chaveDoEstado(meta.jogo, meta.quando);
  await arm.por('estados', k, meta, dados);
  return k;
}

/** No máximo `max` estados por jogo (0 = sem limite): os mais antigos saem. Devolve quantos saíram. */
export async function limitarEstados(arm: Armazem, jogo: string, max: number): Promise<number> {
  if (!max) return 0;
  const l = await estadosDe(arm, jogo);
  const sobra = l.slice(max);
  for (const e of sobra) await arm.apagar('estados', e.key);
  return sobra.length;
}

export async function lerEstado(arm: Armazem, key: string): Promise<EstadoDoNucleo> {
  const dados = await arm.pegar('estados', key);
  if (!dados) throw new Error('esse estado não existe mais');
  return JSON.parse(await descomprimirTexto(dados)) as EstadoDoNucleo;
}

// ---------- salvar automático (o "suspender" do console) ----------
// Um estado por jogo na loja `autos` (chave = jogoId; bytes = o JSON do estado, como o antigo guardava), e no
// registro do jogo: temAuto, autoQuando, autoCapa.

export const AUTO_SEG = [15, 30, 60] as const;

export async function guardarAuto(
  arm: Armazem,
  jogo: string,
  nucleo: string,
  estado: Uint8Array,
  capa: string,
): Promise<number> {
  const quando = Date.now();
  await arm.por('autos', jogo, { quando }, new TextEncoder().encode(JSON.stringify(capturado(nucleo, estado))));
  await mudarJogo(arm, jogo, (j) => ({
    ...j,
    temAuto: true,
    autoQuando: quando,
    autoCapa: capa,
    capa,
    ultimo: quando,
  }));
  return quando;
}

export async function lerAuto(arm: Armazem, jogo: string): Promise<EstadoDoNucleo | null> {
  const b = await arm.pegar('autos', jogo);
  return b ? (JSON.parse(new TextDecoder().decode(b)) as EstadoDoNucleo) : null;
}
