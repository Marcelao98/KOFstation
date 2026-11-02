// Patches de tradução (e hacks): IPS, BPS e UPS aplicados na memória (web/patch.js do antigo, conferido contra o Flips).
// A ROM original nunca muda: o jogo traduzido vira outro jogo na biblioteca (outra ROM, outro save). BPS e UPS trazem o
// CRC32 da ROM certa: com a ROM errada, avisa. SNES com cabeçalho de 512 bytes: se o CRC não bate, tenta sem ele (e o
// IPS vai sempre pra ROM sem cabeçalho, como os patches de hoje esperam).
import { crc32 } from './rom';
import type { SistemaId } from './sistemas';

export const EXT_PATCH = /\.(ips|bps|ups)$/i;
export type TipoPatch = 'ips' | 'bps' | 'ups';

const crc = (u8: Uint8Array, fim = u8.length) => crc32(u8.subarray(0, fim));
const txt = (u8: Uint8Array, i: number, n: number) => String.fromCharCode(...u8.subarray(i, i + n));
const b = (u8: Uint8Array, i: number) => u8[i] ?? 0;

export function tipoDoPatch(p: Uint8Array): TipoPatch | null {
  if (txt(p, 0, 5) === 'PATCH') return 'ips';
  if (txt(p, 0, 4) === 'BPS1') return 'bps';
  if (txt(p, 0, 4) === 'UPS1') return 'ups';
  return null;
}

export class ErroDePatch extends Error {
  constructor(
    readonly code: 'PATCH_WRONG_ROM' | 'PATCH_BROKEN' | 'PATCH_FAILED' | 'PATCH_UNKNOWN',
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroDePatch';
  }
}
const erroRom = () =>
  new ErroDePatch('PATCH_WRONG_ROM', 'esse patch é pra outra versão do jogo (a ROM não bate com a que ele espera)');
const naoConfere = () => new ErroDePatch('PATCH_FAILED', 'o patch não deu certo nessa ROM (o resultado não confere)');

function ips(rom: Uint8Array, p: Uint8Array): Uint8Array {
  let i = 5;
  let fimMax = rom.length;
  const out = new Uint8Array(Math.max(rom.length, 16 << 20));
  out.set(rom);
  while (i + 3 <= p.length) {
    if (txt(p, i, 3) === 'EOF') {
      i += 3;
      const tam = i + 3 <= p.length ? (b(p, i) << 16) | (b(p, i + 1) << 8) | b(p, i + 2) : fimMax;
      return out.slice(0, tam);
    }
    const ofs = (b(p, i) << 16) | (b(p, i + 1) << 8) | b(p, i + 2);
    const n = (b(p, i + 3) << 8) | b(p, i + 4);
    i += 5;
    if (n) {
      out.set(p.subarray(i, i + n), ofs);
      i += n;
      fimMax = Math.max(fimMax, ofs + n);
    } else {
      const r = (b(p, i) << 8) | b(p, i + 1);
      out.fill(b(p, i + 2), ofs, ofs + r);
      i += 3;
      fimMax = Math.max(fimMax, ofs + r);
    }
  }
  throw new ErroDePatch('PATCH_BROKEN', 'patch IPS incompleto');
}

/** Número de tamanho variável do BPS/UPS. */
function leitor(p: Uint8Array, i: number) {
  return {
    i,
    num(): number {
      let d = 0;
      let s = 1;
      for (;;) {
        const x = b(p, this.i++);
        d += (x & 0x7f) * s;
        if (x & 0x80) break;
        s *= 128;
        d += s;
      }
      return d;
    },
  };
}

function bps(rom: Uint8Array, p: Uint8Array): Uint8Array {
  const fim = p.length - 12;
  const l = leitor(p, 4);
  const tamOrig = l.num();
  const tamNovo = l.num();
  const meta = l.num(); // metadados (pula; em duas linhas: `l.i += l.num()` leria o l.i antes de avançar)
  l.i += meta;
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  if (crc(p, p.length - 4) !== dv.getUint32(p.length - 4, true))
    throw new ErroDePatch('PATCH_BROKEN', 'patch BPS corrompido');
  const crcOrig = dv.getUint32(fim, true);
  const crcNovo = dv.getUint32(fim + 4, true);
  if (rom.length !== tamOrig || crc(rom) !== crcOrig) throw erroRom();
  const out = new Uint8Array(tamNovo);
  let o = 0;
  let fonte = 0;
  let alvo = 0;
  while (l.i < fim) {
    const d = l.num();
    const acao = d & 3;
    const n = Math.floor(d / 4) + 1;
    if (acao === 0) {
      out.set(rom.subarray(o, o + n), o);
      o += n;
    } else if (acao === 1) {
      out.set(p.subarray(l.i, l.i + n), o);
      l.i += n;
      o += n;
    } else {
      const x = l.num();
      const desl = (x & 1 ? -1 : 1) * Math.floor(x / 2);
      if (acao === 2) {
        fonte += desl;
        out.set(rom.subarray(fonte, fonte + n), o);
        fonte += n;
        o += n;
      } else {
        alvo += desl;
        for (let k = 0; k < n; k++) out[o++] = out[alvo++] ?? 0;
      }
    }
  }
  if (crc(out) !== crcNovo) throw naoConfere();
  return out;
}

function ups(rom: Uint8Array, p: Uint8Array): Uint8Array {
  const fim = p.length - 12;
  const l = leitor(p, 4);
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const tamA = l.num();
  const tamB = l.num();
  const crcA = dv.getUint32(fim, true);
  const crcB = dv.getUint32(fim + 4, true);
  const c = crc(rom);
  const ida = rom.length === tamA && c === crcA;
  const volta = rom.length === tamB && c === crcB;
  if (!ida && !volta) throw erroRom();
  const out = new Uint8Array(ida ? tamB : tamA);
  out.set(rom.subarray(0, Math.min(rom.length, out.length)));
  let o = 0;
  while (l.i < fim) {
    o += l.num();
    while (l.i < fim) {
      const x = b(p, l.i++);
      if (o < out.length) out[o] = (o < rom.length ? b(rom, o) : 0) ^ x;
      o++;
      if (!x) break;
    }
  }
  if (crc(out) !== (ida ? crcB : crcA)) throw naoConfere();
  return out;
}

/** A ROM nova. SNES com os 512 bytes de cópia na frente: tenta sem eles. */
export function aplicarPatch(
  rom: Uint8Array,
  patch: Uint8Array,
  sistema: SistemaId,
): { tipo: TipoPatch; rom: Uint8Array } {
  const t = tipoDoPatch(patch);
  if (!t) throw new ErroDePatch('PATCH_UNKNOWN', 'não reconheci esse patch (aceito .ips, .bps e .ups)');
  const temCab = sistema === 'snes' && rom.length % 1024 === 512;
  const semCab = temCab ? rom.subarray(512) : rom;
  if (t === 'ips') return { tipo: t, rom: ips(temCab ? semCab : rom, patch) };
  const f = t === 'bps' ? bps : ups;
  try {
    return { tipo: t, rom: f(rom, patch) };
  } catch (e) {
    if (temCab && e instanceof ErroDePatch && e.code === 'PATCH_WRONG_ROM') return { tipo: t, rom: f(semCab, patch) };
    throw e;
  }
}

/** Nome do jogo traduzido: "Jogo (tradução).sfc". */
export function nomeTraduzido(nome: string): { nome: string; original: string } {
  const original = nome.replace(/\.[^.]+$/, '').replace(/ \(tradução\)$/, '');
  const ext = /\.[^.]+$/.exec(nome)?.[0] ?? '.sfc';
  return { nome: original + ' (tradução)' + ext, original };
}
