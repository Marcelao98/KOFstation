// Base de jogos da busca (web/jogos.js `KofJogos` do antigo): gênero, empresa, ano, série e jogadores de ~25 mil jogos
// (libretro-database, CC BY-SA 4.0). Acha pelo CRC32 No-Intro, pelo título (nome do arquivo sem os parênteses, com o
// artigo na frente) ou, no Neo Geo, pelo set. Puro: recebe o JSON já aberto.
import type { InfoDaBase } from './biblioteca';
import { NEOGEO_JOGOS } from './neogeo';
import { normal } from './rom';
import type { SistemaId } from './sistemas';

/** O formato do jogos.json do antigo (web/jogos/montar.py). */
export interface DadosDaBase {
  /** por sistema: [título, ano, gêneros (índices), publicou, desenvolveu, série, jogadores] */
  j: Record<string, (string | number | number[] | null)[][]>;
  /** por sistema: "crc8hex" + índice em hex, separados por vírgula */
  c: Record<string, string>;
  /** tabelas: g = gêneros, e = empresas, s = séries */
  t: { g: string[]; e: string[]; s: string[] };
}

export interface BaseDeJogos {
  info(sis: SistemaId | 'gbc' | null, nome: string, crc?: string): InfoDaBase | null;
  generos(): string[];
}

const ARTIGO = /^(.*?), (The|A|An|Le|La|Les|Die|Der|Das|El|Los|Las)\b(.*)$/;
/** "Legend of Zelda, The - A Link" e "The Legend of Zelda: A Link" viram a mesma chave. */
export const chaveDoTitulo = (t: string): string => {
  const a = ARTIGO.exec(t);
  return normal(a ? (a[2] ?? '') + ' ' + (a[1] ?? '') + (a[3] ?? '') : t);
};
/** O nome do arquivo sem os parênteses/colchetes: "Super Mario World (USA)" → "Super Mario World". */
export const tituloDoNome = (n: string): string => n.replace(/\s*[([].*$/, '').trim() || n;

export function criarBaseDeJogos(db: DadosDaBase): BaseDeJogos {
  const por: Record<string, Map<string, number>> = {};
  for (const [sis, lista] of Object.entries(db.j)) {
    const m = (por[sis] = new Map());
    lista.forEach((j, i) => {
      const t = String(j[0] ?? '');
      m.set(normal(t), i);
      const k = chaveDoTitulo(t);
      if (!m.has(k)) m.set(k, i);
    });
  }
  const crcs: Record<string, Map<string, number>> = {};
  const porCrc = (sis: string, crc: string) => {
    let m = crcs[sis];
    if (!m) {
      m = crcs[sis] = new Map();
      for (const c of (db.c[sis] ?? '').split(',')) if (c) m.set(c.slice(0, 8), parseInt(c.slice(8), 16));
    }
    return m.get(crc);
  };
  const cache = new Map<string, InfoDaBase>();
  const montar = (sis: string, i: number): InfoDaBase => {
    const ch = sis + i;
    let r = cache.get(ch);
    if (!r) {
      const j = db.j[sis]?.[i] ?? [];
      const n = (k: number) => (typeof j[k] === 'number' ? (j[k] as number) : -1);
      r = {
        sistema: sis as SistemaId,
        titulo: String(j[0] ?? ''),
        ano: n(1) > 0 ? n(1) : 0,
        generos: ((j[2] as number[] | null) ?? []).map((g) => db.t.g[g] ?? ''),
        publicou: n(3) >= 0 ? (db.t.e[n(3)] ?? '') : '',
        desenvolveu: n(4) >= 0 ? (db.t.e[n(4)] ?? '') : '',
        serie: n(5) >= 0 ? (db.t.s[n(5)] ?? '') : '',
        jogadores: n(6) > 0 ? n(6) : 0,
      };
      cache.set(ch, r);
    }
    return r;
  };
  return {
    info(sisPedido, nome, crc) {
      let sis: string | null = sisPedido === 'gbc' ? 'gb' : sisPedido;
      if (crc && sis && db.c[sis]) {
        const i = porCrc(sis, crc.toLowerCase());
        if (i !== undefined) return montar(sis, i);
      }
      let k = chaveDoTitulo(tituloDoNome(nome || ''));
      const neo = NEOGEO_JOGOS[(nome || '').toLowerCase()];
      if (neo && (!sis || sis === 'neogeo')) {
        sis = 'neogeo';
        k = chaveDoTitulo(tituloDoNome((NEOGEO_JOGOS[neo[1] ?? ''] ?? neo)[0]));
      }
      for (const s of sis ? [sis] : Object.keys(por)) {
        const i = por[s]?.get(k);
        if (i !== undefined) return montar(s, i);
      }
      return null;
    },
    generos: () => db.t.g.slice(),
  };
}
