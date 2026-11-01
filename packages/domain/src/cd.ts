// CD de PlayStation: .cue, faixas "(Track N)", .bin aberto sozinho (app.js 2204–2240 do antigo).

/** Setor cru de CD (00 FF×10 00) ou imagem de 2048 com "CD001" no setor 16 (o `cdPs1` do antigo). */
export function cdPs1(b: Uint8Array): boolean {
  if (b.length > 0x9000 && b[0] === 0 && b[11] === 0 && b.subarray(1, 11).every((x) => x === 0xff)) return true;
  return b.length > 0x8006 && String.fromCharCode(...b.subarray(0x8001, 0x8006)) === 'CD001';
}

export const FAIXA = /\s*\(Track (\d+)\)$/i;
const semExt = (n: string) => n.replace(/\.[^.]+$/, '');
/** Nome do CD sem a faixa: "Jogo (Track 2).bin" → "Jogo". */
export const baseCd = (n: string): string => semExt(n).replace(FAIXA, '');
/** Número da faixa (1 quando não diz). */
export const numFaixa = (n: string): number => Number(FAIXA.exec(semExt(n))?.[1] ?? 1);
/** Vários arquivos sem .cue: o principal é a faixa 1. */
export function principal<T extends { name: string }>(fs: readonly T[]): T | undefined {
  return [...fs].sort((a, b) => numFaixa(a.name) - numFaixa(b.name))[0];
}

/** Os arquivos que um .cue cita (só o nome, sem pasta). */
export function arquivosDoCue(texto: string): string[] {
  return [...texto.matchAll(/FILE\s+"([^"]+)"/gi)].map((m) => (m[1] ?? '').replace(/^.*[\\/]/, ''));
}

/** Monta o .cue que faltou: faixa 1 de dados, as outras de música (o `cueDasFaixas` do antigo). */
export function cueDasFaixas(faixas: { nome: string; bytes: Uint8Array }[]): Uint8Array {
  const f = [...faixas].sort((a, b) => numFaixa(a.nome) - numFaixa(b.nome));
  const txt = f
    .map((x, i) => {
      const modo = i
        ? 'AUDIO'
        : x.bytes[0] === 0 && x.bytes[1] === 0xff
          ? 'MODE' + (x.bytes[15] === 1 ? 1 : 2) + '/2352'
          : 'MODE1/2048';
      return (
        `FILE "${x.nome}" BINARY\n  TRACK ${String(i + 1).padStart(2, '0')} ${modo}\n` +
        (i ? '    INDEX 00 00:00:00\n    INDEX 01 00:02:00\n' : '    INDEX 01 00:00:00\n')
      );
    })
    .join('');
  return new TextEncoder().encode(txt);
}

/** Leitor aos pedaços (arquivo grande: não carrega inteiro). */
export type Leitor = (inicio: number, tamanho: number) => Promise<Uint8Array>;

/** ISO 9660 com SYSTEM.CNF que diz BOOT2 = DVD de PS2 ("BOOT" sozinho = PS1). O `ehPs2` do antigo (ps2.js). */
export async function isoDePs2(ler: Leitor): Promise<boolean> {
  try {
    const pvd = await ler(16 * 2048, 2048);
    if (String.fromCharCode(...pvd.subarray(1, 6)) !== 'CD001') return false;
    const v = new DataView(pvd.buffer, pvd.byteOffset, pvd.byteLength);
    const raiz = await ler(v.getUint32(158, true) * 2048, Math.min(v.getUint32(166, true), 65536));
    for (let i = 0; i < raiz.length;) {
      const len = raiz[i] ?? 0;
      if (!len) {
        i = (Math.floor(i / 2048) + 1) * 2048;
        continue;
      }
      const nome = String.fromCharCode(...raiz.subarray(i + 33, i + 33 + (raiz[i + 32] ?? 0)));
      if (/^SYSTEM\.CNF/i.test(nome)) {
        const d = new DataView(raiz.buffer, raiz.byteOffset + i);
        const cnf = await ler(d.getUint32(2, true) * 2048, Math.min(d.getUint32(10, true), 2048));
        return /BOOT2/.test(new TextDecoder().decode(cnf));
      }
      i += len;
    }
  } catch {
    return false; // imagem cortada ou estranha: não é PS2
  }
  return false;
}
