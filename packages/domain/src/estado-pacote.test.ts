// 3.2: o pacote do estado que o processo nativo monta (crates/kof-nativo/src/pacote.rs) abre aqui igual ao da página.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { desempacotarEstado, empacotarEstado } from './estado-texto';

const f = JSON.parse(readFileSync(new URL('../../contracts/fixtures/nativo.json', import.meta.url), 'utf8')) as {
  pacote: { nucleo: string; estado: number[]; texto: string; gzipHex: string };
};
const deHex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((x) => parseInt(x, 16)));

describe('pacote do estado feito pelo Rust (3.2)', () => {
  it('o texto é o mesmo que a página monta', async () => {
    const t = await empacotarEstado(f.pacote.nucleo, new Uint8Array(f.pacote.estado), false);
    expect(new TextDecoder().decode(t)).toBe(f.pacote.texto);
  });
  it('o gzip do Rust abre aqui e dá o mesmo estado', async () => {
    const o = await desempacotarEstado(deHex(f.pacote.gzipHex), true);
    expect(o.lr).toBe(f.pacote.nucleo);
    expect(Array.from(o.bytes ?? [])).toEqual(f.pacote.estado);
  });
});
