// Capas do libretro-thumbnails (app.js 3170–3200 do antigo): um acervo por sistema e os nomes possíveis no padrão
// No-Intro (converte o GoodTools "Jogo (U) (V1.2) [!]" → "Jogo (USA) (Rev 2)" e tenta revisões e idiomas).
import { sistemaDoItem, type ItemBiblioteca } from './biblioteca';
import { NEOGEO_JOGOS } from './neogeo';

export const ACERVO: Readonly<Record<string, string>> = {
  snes: 'Nintendo_-_Super_Nintendo_Entertainment_System',
  nes: 'Nintendo_-_Nintendo_Entertainment_System',
  gb: 'Nintendo_-_Game_Boy',
  gbc: 'Nintendo_-_Game_Boy_Color',
  md: 'Sega_-_Mega_Drive_-_Genesis',
  sms: 'Sega_-_Master_System_-_Mark_III',
  gg: 'Sega_-_Game_Gear',
  gba: 'Nintendo_-_Game_Boy_Advance',
  neogeo: 'FBNeo_-_Arcade_Games',
  ps1: 'Sony_-_PlayStation',
  n64: 'Nintendo_-_Nintendo_64',
  ps2: 'Sony_-_PlayStation_2',
  gc: 'Nintendo_-_GameCube',
  wii: 'Nintendo_-_Wii',
};

const REGIOES: Record<string, string> = {
  U: 'USA',
  E: 'Europe',
  J: 'Japan',
  B: 'Brazil',
  F: 'France',
  G: 'Germany',
  S: 'Spain',
  I: 'Italy',
  K: 'Korea',
  A: 'Australia',
  UE: 'USA, Europe',
  EU: 'USA, Europe',
  JU: 'Japan, USA',
  UJ: 'Japan, USA',
  JUE: 'World',
  W: 'World',
};

export function nomesCapa(nome: string): string[] {
  let n = nome
    .replace(/[&*/:`<>?\\|"]/g, '_')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
  n = n.replace(/\((JUE|UE|EU|JU|UJ|U|E|J|B|F|G|S|I|K|A|W)\)/g, (_, r: string) => `(${REGIOES[r] ?? r})`);
  n = n
    .replace(/\s*\(V1\.0\)/gi, '')
    .replace(/\(V1\.(\d)\)/gi, (_, v: string) => `(Rev ${v})`)
    .replace(/\s+/g, ' ')
    .trim();
  const semRev = n.replace(/\s*\((Rev [^)]*|Beta[^)]*|Proto[^)]*|v\d[^)]*)\)/gi, '').trim();
  const base = semRev.replace(/^(.*?\([^)]*\)).*$/, '$1');
  const titulo = base.replace(/\s*\(.*$/, '').trim();
  const idiomas = ['(En,Fr)', '(En,Fr,De)', '(En,De)', '(En,Fr,De,Es,It)'].map((l) => base + ' ' + l);
  return [...new Set([n, semRev, base, ...idiomas, titulo + ' (USA)', titulo + ' (World)', titulo + ' (Europe)'])];
}

/** Neo Geo: a capa tem o título completo do FBNeo; clone tenta o do pai. */
export function nomesCapaNeoGeo(nome: string): string[] {
  const j = NEOGEO_JOGOS[nome.toLowerCase()];
  if (!j) return nomesCapa(nome);
  const limpa = (t: string) => t.replace(/[&*/:`<>?\\|"]/g, '_');
  const pai = j[1] ? NEOGEO_JOGOS[j[1]] : undefined;
  return [limpa(j[0]), ...(pai ? [limpa(pai[0])] : [])];
}

/** O acervo do item (Game Boy Color tem o próprio, pelo .gbc). */
export function acervoDoItem(r: ItemBiblioteca): { acervo: string; sis: string } {
  let sis: string = sistemaDoItem(r);
  if (sis === 'gb' && /\.gbc$/i.test(r.jogo?.arquivo ?? r.pasta?.arquivo ?? r.nome)) sis = 'gbc';
  return { acervo: ACERVO[sis] ?? (ACERVO.snes as string), sis };
}

export function nomesDaCapa(r: ItemBiblioteca): string[] {
  if (acervoDoItem(r).sis === 'neogeo') return nomesCapaNeoGeo(r.nome);
  const n = nomesCapa(r.nome);
  // B.4: o jogo do catálogo vem da base sem a região ("Chrono Trigger"); o acervo tem "Chrono Trigger (USA)"
  if (r.catalogo && !/\(/.test(r.nome)) {
    const t = n[0] ?? r.nome;
    return [...new Set([...REGIOES_DO_CATALOGO.map((g) => `${t} (${g})`), ...n])];
  }
  return n;
}

/** As regiões a tentar pra capa de um jogo do catálogo, na ordem (o Rust tenta uma por uma e lembra a falha). */
const REGIOES_DO_CATALOGO = ['USA', 'World', 'USA, Europe', 'Europe', 'Japan'];
