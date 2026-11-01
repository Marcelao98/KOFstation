// De qual console é um arquivo e em que pasta da Kof Games ele mora (app.js `sistemaDoNome`/`pastaDoArquivo` do
// antigo). Puro: quem tem o arquivo (o Rust na varredura, a tela ao abrir) junta os FATOS (nome, tamanho, o que tem
// dentro do zip, se o começo parece CD) e aqui só se decide.
import { cdPs1, isoDePs2, type Leitor } from './cd';
import { setNeoGeo, setNeoGeoPorCrcs } from './neogeo';
import { hex8 } from './rom';
import { extensao, sistemaPorExtensao, type SistemaId } from './sistemas';
import { listarZip } from './zip';

/** Pastas de Kof Games/Games (os nomes curtos do ES-DE/RetroArch; servem em outros front-ends). */
export const PASTA_SIS: Readonly<Record<SistemaId | 'gbc', string>> = {
  snes: 'snes',
  nes: 'nes',
  gb: 'gb',
  gbc: 'gbc',
  gba: 'gba',
  md: 'megadrive',
  sms: 'mastersystem',
  gg: 'gamegear',
  neogeo: 'neogeo',
  ps1: 'psx',
  n64: 'n64',
  ps2: 'ps2',
};
export const PASTAS_KOF = ['Games', 'Novos', 'Config', 'Saves'] as const;
export const PASTAS_CONSOLE: readonly string[] = [...new Set(Object.values(PASTA_SIS))];

/** O sistema pelo nome (zip de Neo Geo pelo set, o resto pela extensão). */
export function sistemaDoNome(nome: string): SistemaId | null {
  return setNeoGeo(nome) ? 'neogeo' : sistemaPorExtensao(nome);
}

export interface ItemDoZip {
  nome: string;
  tamanho: number;
  /** CRC32 em hex de 8 letras */
  crc: string;
}

/** O que se sabe de um arquivo sem abrir o jogo. */
export interface FatoDeArquivo {
  nome: string;
  tamanho: number;
  /** diretório do zip (só nos .zip) */
  zip?: readonly ItemDoZip[];
  /** o conteúdo diz CD: 'ps1' (setor de CD / ISO), 'ps2' (ISO com BOOT2); null = olhou e não é; ausente = não olhou */
  cd?: 'ps1' | 'ps2' | null;
}

const MB = 1 << 20;
const ehRom = (n: string) => sistemaPorExtensao(n) !== null;

/** Zip com CD de PlayStation dentro (o `cdDoZip` do antigo): .cue/.chd/.pbp/.iso ou .bin grande. */
export function zipTemCd(itens: readonly ItemDoZip[]): boolean {
  return (
    itens.some((f) => /\.(cue|chd|pbp|iso)$/i.test(f.nome)) ||
    itens.some((f) => /\.(bin|img)$/i.test(f.nome) && f.tamanho > 16 * MB)
  );
}

/** O sistema do arquivo pelos fatos; null = não é jogo. */
export function sistemaDoArquivo(f: FatoDeArquivo): SistemaId | null {
  const ext = extensao(f.nome);
  if (ext === 'zip') {
    if (setNeoGeo(f.nome)) return 'neogeo';
    const itens = f.zip ?? [];
    if (zipTemCd(itens)) return 'ps1';
    const r = itens.find((i) => ehRom(i.nome));
    if (r) return sistemaDoArquivo({ nome: r.nome, tamanho: r.tamanho }); // ROM zipada: vai pela ROM de dentro
    if (f.tamanho < 128 * MB && setNeoGeoPorCrcs(new Set(itens.map((i) => i.crc)))) return 'neogeo';
    return null;
  }
  if (['elf', 'cso', 'isz'].includes(ext)) return 'ps2';
  if (ext === 'chd') return f.tamanho > 900e6 ? 'ps2' : 'ps1'; // CD de PS1 cabe em 700 MB
  if ((ext === 'iso' || ext === 'img') && f.cd === 'ps2') return 'ps2';
  if (ext === 'bin' || ext === 'img') return f.cd === 'ps1' || f.tamanho > 16 * MB ? 'ps1' : 'md';
  if (['iso', 'cue', 'pbp'].includes(ext)) return 'ps1';
  return sistemaDoNome(f.nome);
}

/** A pasta de Games do arquivo ('gbc' pros .gbc); null = não é jogo. */
export function pastaDoArquivo(f: FatoDeArquivo): string | null {
  const sis = sistemaDoArquivo(f);
  if (!sis) return null;
  return sis === 'gb' && extensao(f.nome) === 'gbc' ? PASTA_SIS.gbc : PASTA_SIS[sis];
}

/** Junta os fatos de um arquivo que está na mão (aberto/arrastado), lendo só o que precisa. */
export async function fatosDe(nome: string, tamanho: number, ler: Leitor): Promise<FatoDeArquivo> {
  const ext = extensao(nome);
  const f: FatoDeArquivo = { nome, tamanho };
  if (ext === 'zip') {
    const ini = Math.max(0, tamanho - 65557);
    try {
      const fim = await ler(ini, tamanho - ini);
      f.zip = listarZipPeloFim(fim, ini);
      if (!f.zip.length) f.zip = await itensDoZip(ler, tamanho);
    } catch {
      f.zip = []; // zip estragado: não é jogo que dê pra reconhecer
    }
  } else if (['iso', 'img', 'bin'].includes(ext) && tamanho > 0x9000) {
    if (ext !== 'bin' && (await isoDePs2(ler))) f.cd = 'ps2';
    else f.cd = cdPs1(await ler(0, 0x9001)) ? 'ps1' : null;
  }
  return f;
}

// o diretório central do zip quase sempre cabe nos últimos 64 KB; quando não cabe, lê pelo deslocamento que o fim diz
function listarZipPeloFim(fim: Uint8Array, base: number): ItemDoZip[] {
  const v = new DataView(fim.buffer, fim.byteOffset, fim.byteLength);
  let e = -1;
  for (let i = fim.length - 22; i >= 0; i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      e = i;
      break;
    }
  if (e < 0) throw new Error('zip inválido');
  const ofs = v.getUint32(e + 16, true) - base;
  if (ofs < 0) return [];
  return itensDoDiretorio(fim.subarray(ofs), v.getUint16(e + 10, true));
}

async function itensDoZip(ler: Leitor, tamanho: number): Promise<ItemDoZip[]> {
  const ini = Math.max(0, tamanho - 65557);
  const fim = await ler(ini, tamanho - ini);
  const v = new DataView(fim.buffer, fim.byteOffset, fim.byteLength);
  for (let i = fim.length - 22; i >= 0; i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      const dir = await ler(v.getUint32(i + 16, true), v.getUint32(i + 12, true));
      return itensDoDiretorio(dir, v.getUint16(i + 10, true));
    }
  return [];
}

function itensDoDiretorio(u8: Uint8Array, total: number): ItemDoZip[] {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const r: ItemDoZip[] = [];
  let p = 0;
  for (let k = 0; k < total && p + 46 <= u8.length && v.getUint32(p, true) === 0x02014b50; k++) {
    const nl = v.getUint16(p + 28, true);
    const nome = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)).replace(/^.*[\\/]/, '');
    if (nome) r.push({ nome, tamanho: v.getUint32(p + 24, true), crc: hex8(v.getUint32(p + 16, true)) });
    p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return r;
}

/** Itens de um zip inteiro na memória. */
export function itensDoZipInteiro(u8: Uint8Array): ItemDoZip[] {
  return listarZip(u8)
    .map((e) => ({ nome: e.nome.replace(/^.*[\\/]/, ''), tamanho: e.tamanho, crc: hex8(e.crc) }))
    .filter((e) => e.nome);
}
