// A lista da biblioteca do antigo (app.js 3153–3612): jogos já abertos (registro no banco) + os arquivos da pasta Kof
// Games que ainda não foram jogados, filtrados pela busca. Puro: quem monta os dados é o app-core.
import { sistemaDoNome } from './deteccao';
import { normal } from './rom';
import { SISTEMAS, type SistemaId } from './sistemas';

/** Registro de um jogo já aberto (a loja `jogos` do antigo, mesmos campos). */
export interface RegistroJogo {
  /** "título|tamanho" (jogoIdDe) */
  id: string;
  nome: string;
  arquivo: string;
  sistema: SistemaId;
  titulo: string;
  tamanho: number;
  ultimo: number;
  crc?: string;
  /** print do jogo (data URL, 256 px) */
  capa?: string;
  temAuto?: boolean;
  autoQuando?: number;
  autoCapa?: string;
  /** zip de onde veio (CD de PS1) */
  zip?: string;
  traducao?: string;
  /** novo: onde a ROM está na Kof Games (relativo à raiz) */
  path?: string;
}

/** Um arquivo da pasta (o item do `lerPasta` do antigo). */
export interface ArquivoDaPasta {
  path: string;
  nome: string;
  arquivo: string;
  ext: string;
  sistema: SistemaId | null;
  chave: string;
  variante: boolean;
  faixa: boolean;
  tamanho: number;
}

export interface ItemBiblioteca {
  nome: string;
  chave: string;
  variante?: boolean;
  jogo?: RegistroJogo;
  pasta?: ArquivoDaPasta;
  /** o que a base de jogos sabe (undefined = ainda não procurou) */
  meta?: InfoDaBase | null;
  /** texto onde a busca procura */
  busca?: string;
}

/** O que a base de jogos (libretro-database) sabe de um jogo. */
export interface InfoDaBase {
  sistema: SistemaId | 'gbc';
  titulo: string;
  ano: number;
  generos: string[];
  publicou: string;
  desenvolveu: string;
  serie: string;
  jogadores: number;
}

/** Jogos abertos (mais recentes primeiro) + os da pasta que ainda não estão neles (sem as faixas de CD). */
export function juntarItens(jogos: readonly RegistroJogo[], pasta: readonly ArquivoDaPasta[]): ItemBiblioteca[] {
  const abertos = [...jogos]
    .sort((a, b) => b.ultimo - a.ultimo)
    .map((j): ItemBiblioteca => ({ nome: j.nome, jogo: j, chave: normal(j.nome || '') }));
  const ja = new Set(jogos.map((j) => (j.arquivo || '').toLowerCase()));
  return abertos.concat(
    pasta
      .filter((r) => !r.faixa && !ja.has(r.arquivo.toLowerCase()))
      .map((r) => ({ nome: r.nome, chave: r.chave, variante: r.variante, pasta: r })),
  );
}

/** O console do item (o `sistemaDoItem` do antigo; pela pasta usa o que a varredura descobriu). */
export function sistemaDoItem(r: ItemBiblioteca): SistemaId {
  return (
    (r.jogo && (r.jogo.sistema || sistemaDoNome(r.jogo.arquivo))) ||
    r.pasta?.sistema ||
    (r.pasta && sistemaDoNome(r.pasta.arquivo)) ||
    sistemaDoNome(r.nome) ||
    'snes'
  );
}

export const nomeDoSistema = (s: string): string => SISTEMAS.find((x) => x.id === s)?.nome ?? s;
export const curtoDoSistema = (s: string): string => SISTEMAS.find((x) => x.id === s)?.curto ?? s.toUpperCase();

/** "05/03, 14:20" (o `quando` do antigo). */
export const quando = (t: number): string =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** "1h 05min" (o `duracao` do antigo). */
export function duracao(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return ms > 0 ? 'menos de 1 min' : '0 min';
  return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'min';
}
