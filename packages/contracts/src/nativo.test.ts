import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NATIVO, blocoNativo, botoesNativo, lerAviso, lerBinario } from './nativo';

interface Fixture {
  botoes: { jogador: number; botoes: number; eixos: number[]; hex: string };
  quadro: { largura: number; altura: number; numero: number; rgba: number[]; hex: string };
  bloco: { tipo: 4; pedido: number; dados: number[]; hex: string };
  comandos: unknown[];
  avisos: unknown[];
}
const f = JSON.parse(readFileSync(new URL('../fixtures/nativo.json', import.meta.url), 'utf8')) as Fixture;
const hex = (u: Uint8Array) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((x) => parseInt(x, 16)));

describe('protocolo do núcleo nativo (mesmas fixtures do Rust)', () => {
  it('botões', () => {
    expect(hex(botoesNativo(f.botoes.jogador, f.botoes.botoes, f.botoes.eixos))).toBe(f.botoes.hex);
  });
  it('quadro', () => {
    const msg = new Uint8Array([...deHex(f.quadro.hex), ...f.quadro.rgba]);
    const q = lerBinario(msg);
    expect(q).toMatchObject({
      tipo: 'quadro',
      largura: f.quadro.largura,
      altura: f.quadro.altura,
      numero: f.quadro.numero,
    });
    if (q.tipo === 'quadro') expect(Array.from(q.rgba)).toEqual(f.quadro.rgba);
    expect(() => lerBinario(msg.subarray(0, msg.length - 1))).toThrow();
  });
  it('bloco (estado/bateria)', () => {
    expect(hex(blocoNativo(f.bloco.tipo, f.bloco.pedido, new Uint8Array(f.bloco.dados)))).toBe(f.bloco.hex);
    const volta = deHex(f.bloco.hex);
    volta[0] = NATIVO.ESTADO;
    const b = lerBinario(volta);
    expect(b.tipo === 'estado' && b.pedido === 7 && Array.from(b.dados)).toEqual([1, 2, 3]);
    expect(() => lerBinario(new Uint8Array(12).fill(9))).toThrow();
  });
  it('avisos', () => {
    for (const a of f.avisos) expect(lerAviso(JSON.stringify(a))).toEqual(a);
    expect(lerAviso('{"tipo":"outro"}')).toBeNull();
    expect(lerAviso('não é json')).toBeNull();
  });
});
