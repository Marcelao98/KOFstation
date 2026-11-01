// Identidade de uma ROM, igual ao antigo: CRC32 No-Intro (web/jogos.js `crcRom`), título interno do cartucho
// (web/nucleo.js `titulo`) e as chaves que o antigo usa no banco (`jogoId`, `chaveSram`, app.js `abrirBytes`). Os
// saves, estados e o .kofsave do antigo dependem dessas chaves: mudar uma letra aqui perde o save de alguém.
import type { SistemaId } from './sistemas';

const TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC32 (o do zip) a partir de `ini`, como número. */
export function crc32(u8: Uint8Array, ini = 0, crcAntes = 0): number {
  let c = ~crcAntes >>> 0;
  for (let i = ini; i < u8.length; i++) c = (TABELA[(c ^ (u8[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  return ~c >>> 0;
}

export const hex8 = (n: number): string => (n >>> 0).toString(16).padStart(8, '0');

/** Quantos bytes de cabeçalho de copiador o No-Intro ignora (512 no SNES/SMS/GG, iNES no NES). */
export function cabecalhoNoIntro(sis: SistemaId | 'gbc', u8: Uint8Array): number {
  if ((sis === 'snes' || sis === 'sms' || sis === 'gg') && u8.length % 1024 === 512) return 512;
  if (sis === 'nes' && u8[0] === 0x4e && u8[1] === 0x45 && u8[2] === 0x53) return 16;
  return 0;
}

/** CRC32 da ROM como o No-Intro calcula, em 8 letras minúsculas (o `crc` do registro do jogo no antigo). */
export function crcRom(sis: SistemaId | 'gbc', u8: Uint8Array): string {
  return hex8(crc32(u8, cabecalhoNoIntro(sis, u8)));
}

const texto = (u8: Uint8Array, ini: number, n: number) => {
  let t = '';
  for (let i = ini; i < ini + n && i < u8.length; i++) {
    const c = u8[i] ?? 0;
    t += c >= 32 && c < 127 ? String.fromCharCode(c) : ' ';
  }
  return t;
};
const crcMaiusculo = (u8: Uint8Array, ini: number) => hex8(crc32(u8, ini)).toUpperCase();
const CURTO: Partial<Record<SistemaId, string>> = { sms: 'SMS', gg: 'GG' };

/**
 * Título interno da ROM (o `cart.title` do antigo, sem o trim). NES não tem título: vira "NES " + CRC32; Neo Geo e PS1
 * vêm do nome do arquivo (devolve '').
 */
export function tituloInterno(rom: Uint8Array, sis: SistemaId): string {
  if (sis === 'neogeo' || sis === 'ps1' || sis === 'ps2' || sis === 'n64') return '';
  if (sis === 'gba') {
    const t = texto(rom, 0xa0, 12).trim();
    return /[A-Za-z0-9]{2}/.test(t) ? t : 'GBA ' + crcMaiusculo(rom, 0);
  }
  if (sis === 'nes') return 'NES ' + crcMaiusculo(rom, rom[0] === 0x4e && rom[1] === 0x45 && rom[2] === 0x53 ? 16 : 0);
  if (sis === 'sms' || sis === 'gg')
    return (CURTO[sis] ?? sis) + ' ' + crcMaiusculo(rom, rom.length % 1024 === 512 ? 512 : 0);
  if (sis === 'md') {
    const t = texto(rom, 0x150, 48).replace(/\s+/g, ' ').trim();
    return /[A-Za-z]{2}/.test(t) && texto(rom, 0x100, 4) === 'SEGA' ? t : 'MD ' + crcMaiusculo(rom, 0);
  }
  if (sis === 'gb') return texto(rom, 0x134, (rom[0x143] ?? 0) & 0x80 ? 15 : 16);
  const extra = rom.length % 1024 === 512 ? 512 : 0;
  const ok = (o: number) =>
    o + 0x20 <= rom.length &&
    (((rom[o + 0x1c] ?? 0) | ((rom[o + 0x1d] ?? 0) << 8)) ^ ((rom[o + 0x1e] ?? 0) | ((rom[o + 0x1f] ?? 0) << 8))) ===
      0xffff;
  const base = [0x7fc0, 0xffc0, 0x40ffc0].map((o) => o + extra).find(ok) ?? 0x7fc0 + extra;
  return texto(rom, base, 21);
}

/** Identidade do jogo no banco do antigo: "título|tamanho". */
export const jogoIdDe = (titulo: string, tamanho: number): string => titulo.trim() + '|' + tamanho;
/** Chave do save de bateria do antigo: "sram.título.tamanho". */
export const chaveSramDe = (titulo: string, tamanho: number): string => 'sram.' + titulo.trim() + '.' + tamanho;

/** Texto sem acento, minúsculo, só letras e números separados por espaço (busca e chaves da biblioteca). */
export const normal = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** GoodTools: [h] hack, [b] ruim, [o] overdump, [t] trainer, [p] pirata, [f] corrigido, [a] alternativo. [T+Por] fica. */
export const VARIANTE = /\[(?:b|o|h|t|p|f|a)\d*[^\]]*\]/;
