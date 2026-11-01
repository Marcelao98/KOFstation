// Monta e lê pacotes .kofsave no formato do antigo (web/guarda.js): "KOFSAVE1" + tamanho (u32) + JSON em gzip +
// blocos binários ({$b, n} no JSON). Feito aqui com o zlib do Node, independente do código do app.
import { gunzipSync, gzipSync } from 'node:zlib';

export function criarKofsave(conteudo: unknown): Buffer {
  const blocos: Buffer[] = [];
  let pos = 0;
  const json = JSON.stringify(conteudo, (_k, v: unknown) => {
    if (v instanceof Uint8Array) {
      blocos.push(Buffer.from(v));
      const r = { $b: pos, n: v.length };
      pos += v.length;
      return r;
    }
    return v;
  });
  const j = gzipSync(Buffer.from(json));
  const cab = Buffer.alloc(12);
  cab.write('KOFSAVE1', 0, 'latin1');
  cab.writeUInt32LE(j.length, 8);
  return Buffer.concat([cab, j, ...blocos]);
}

export function lerKofsave(b: Buffer): Record<string, unknown> {
  if (b.subarray(0, 8).toString('latin1') !== 'KOFSAVE1') throw new Error('não é .kofsave');
  const n = b.readUInt32LE(8);
  const base = 12 + n;
  return JSON.parse(gunzipSync(b.subarray(12, base)).toString(), (_k, v: unknown) =>
    v && typeof v === 'object' && '$b' in v
      ? b.subarray(base + (v as { $b: number }).$b, base + (v as { $b: number; n: number }).$b + (v as { n: number }).n)
      : v,
  ) as Record<string, unknown>;
}

/** Um save do jeito do KofGuarda: gzip sem o fim 0xFF, hash CRC32 da parte com conteúdo. */
export function saveDoAntigo(chave: string, bytes: Uint8Array, quando: number) {
  let n = bytes.length;
  while (n > 0 && bytes[n - 1] === 0xff) n--;
  const util = bytes.subarray(0, n);
  let c = 0xffffffff;
  for (const x of util) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return {
    chave,
    dados: new Uint8Array(gzipSync(Buffer.from(util))),
    cheio: bytes.length,
    hash: ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0'),
    quando,
    aparelho: 'antigo01',
  };
}
