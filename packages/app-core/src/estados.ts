// Savestates (app.js `salvarEstado`/`limitarEstados`/`carregarEstado`/`estadosDe` do antigo), no mesmo formato: os
// dados são o JSON {lr: núcleo, d: base64 do estado} (o Snes9x também com s9x: 1) comprimido em gzip, e cada estado
// guarda o print do momento (capa). Na loja `estados`, a chave é "<jogoId>/<quando>".
import type { Armazem } from './armazem';
import { desempacotar, empacotar } from './estado-trabalho';
import type { EstadoDoNucleo } from './estado-texto';
import { mudarJogo } from './jogos';
import { chaveDoEstado, type MetaEstado } from './saves';

export * from './estado-texto';

export const LIMITES_ESTADOS = [10, 20, 50, 100, 0] as const;

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
  const dados = await empacotar(nucleo, estado, true);
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
  return desempacotar(dados, true);
}

// ---------- salvar automático (o "suspender" do console) ----------
// Um estado por jogo na loja `autos` (chave = jogoId; bytes = o JSON do estado, como o antigo guardava), e no
// registro do jogo: temAuto, autoQuando, autoCapa.

export const AUTO_SEG = [15, 30, 60] as const;

/**
 * De quanto em quanto tempo o salvar automático roda. Núcleo nativo (PS1, N64, PS2): o estado é grande (4 a 16 MB), então no
 * mínimo a cada 2 minutos, como o antigo (`snes.nativo ? Math.max(120, autoSeg()) : autoSeg()`, app.js 2774). Sem esse piso o
 * celular travava vários segundos a cada 30 s.
 */
export const autoSegundos = (escolhido: number, nativo: boolean): number =>
  nativo ? Math.max(120, escolhido) : escolhido;

export async function guardarAuto(
  arm: Armazem,
  jogo: string,
  nucleo: string,
  estado: Uint8Array,
  capa: string,
): Promise<number> {
  const quando = Date.now();
  await arm.por('autos', jogo, { quando }, await empacotar(nucleo, estado, false));
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
  return b ? desempacotar(b, false) : null;
}
