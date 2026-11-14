import { describe, expect, it } from 'vitest';
import { criarBackendAndroid, deBase64, ehAndroid, paraBase64, type PonteAndroid } from './android';

describe('backend do Android (ponte KofAndroid)', () => {
  it('base64 de ida e volta, inclusive com mais de 32 KB', () => {
    const b = new Uint8Array(100_000).map((_, i) => (i * 7) & 255);
    expect([...deBase64(paraBase64(b))]).toEqual([...b]);
  });

  it('só é Android se a ponte existe com o método chamar', () => {
    expect(ehAndroid({} as typeof globalThis)).toBe(false);
    expect(ehAndroid({ KofAndroid: {} } as unknown as typeof globalThis)).toBe(false);
    expect(ehAndroid({ KofAndroid: { chamar: () => '' } } as unknown as typeof globalThis)).toBe(true);
  });

  const falsa = (f: PonteAndroid['chamar']) => criarBackendAndroid({ chamar: f });

  it('chamar: manda o comando e os argumentos em JSON e devolve o data', async () => {
    const visto: string[] = [];
    const b = falsa((cmd, args, corpo) => {
      visto.push(cmd, args, corpo);
      return JSON.stringify({ ok: true, data: { version: '1' } });
    });
    expect(await b.chamar('app.info', { a: 1 })).toEqual({ version: '1' });
    expect(visto).toEqual(['app.info', '{"a":1}', '']);
  });

  it('bytes viajam em base64 nos dois sentidos', async () => {
    let corpoVisto = '';
    const b = falsa((cmd, _a, corpo) => {
      corpoVisto = corpo;
      return JSON.stringify(
        cmd === 'store.get' ? { ok: true, bin: paraBase64(new Uint8Array([1, 2, 3])) } : { ok: true, data: null },
      );
    });
    await b.enviarBinario('store.put', { store: 'saves', key: 'k' }, new Uint8Array([9, 8]));
    expect([...deBase64(corpoVisto)]).toEqual([9, 8]);
    expect([...(await b.lerBinario('store.get', { store: 'saves', key: 'k' }))]).toEqual([1, 2, 3]);
  });

  it('erro da casca vira o erro do contrato (código e mensagem em português)', async () => {
    const b = falsa(() =>
      JSON.stringify({ ok: false, error: { code: 'UNSUPPORTED', message: 'ainda não existe no celular' } }),
    );
    await expect(b.chamar('library.scan')).rejects.toEqual({
      code: 'UNSUPPORTED',
      message: 'ainda não existe no celular',
    });
  });

  it('ponte que explode ou devolve lixo vira erro de comunicação, nunca silêncio', async () => {
    await expect(
      falsa(() => {
        throw new Error('boom');
      }).chamar('x'),
    ).rejects.toMatchObject({ code: 'BACKEND_UNREACHABLE' });
    await expect(falsa(() => 'não é json').chamar('x')).rejects.toMatchObject({ code: 'BACKEND_BAD_RESPONSE' });
    await expect(falsa(() => JSON.stringify({ ok: true })).lerBinario('x')).rejects.toMatchObject({
      code: 'BACKEND_BAD_RESPONSE',
    });
  });
});
