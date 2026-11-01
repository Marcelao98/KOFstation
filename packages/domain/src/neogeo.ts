// Neo Geo: o zip é reconhecido pelo nome do set (lista do FBNeo) ou pelos CRCs que o diretório do zip guarda
// (web/nucleo.js `setNeoGeo`/`setNeoGeoDoZip` do antigo).
import { NEOGEO_CRC, NEOGEO_JOGOS } from './dados/neogeo';

export { NEOGEO_JOGOS };

/** 'mslug.zip' → 'mslug', se estiver na lista do FBNeo. */
export function setNeoGeo(nome: string): string | null {
  const m = /([^/\\]+)\.zip$/i.exec(nome);
  const s = m?.[1]?.toLowerCase();
  return s && NEOGEO_JOGOS[s] ? s : null;
}

let progDoSet: Record<string, string[]> | null = null;

/**
 * Zip com outro nome ("King of Fighters 98.zip"): ganha o set com TODOS os chips de programa no zip (o que tiver mais
 * chips); empate: o original antes dos clones. `crcs` = CRC32 das entradas, em hex de 8 letras.
 */
export function setNeoGeoPorCrcs(crcs: ReadonlySet<string>): string | null {
  if (!progDoSet) {
    const p: Record<string, string[]> = {};
    for (const [c, sets] of Object.entries(NEOGEO_CRC)) for (const n of sets) (p[n] ??= []).push(c);
    progDoSet = p;
  }
  const candidatos = new Set([...crcs].flatMap((c) => NEOGEO_CRC[c] ?? []));
  let melhor: [string, number] | null = null;
  for (const n of candidatos) {
    const prog = progDoSet[n] ?? [];
    if (!prog.every((c) => crcs.has(c))) continue;
    const pontos = prog.length * 2 + (NEOGEO_JOGOS[n] && !NEOGEO_JOGOS[n][1] ? 1 : 0);
    if (!melhor || pontos > melhor[1]) melhor = [n, pontos];
  }
  return melhor ? melhor[0] : null;
}

/** Nome do jogo do set (o do pai, nos clones). */
export const nomeNeoGeo = (set: string): string | null => NEOGEO_JOGOS[set]?.[0] ?? null;
export const paiNeoGeo = (set: string): string | null => NEOGEO_JOGOS[set]?.[1] ?? null;
