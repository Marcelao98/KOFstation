import { describe, expect, it } from 'vitest';
import { criarBackendLocal } from './local';

const resposta = (status: number, corpo: unknown) =>
  (async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;

describe('backend local', () => {
  it('manda o token e devolve os dados', async () => {
    let cabecalho = '';
    const buscar = (async (_u: string, i: RequestInit) => {
      cabecalho = new Headers(i.headers).get('X-Kof-Token') ?? '';
      return new Response(JSON.stringify({ ok: 1 }));
    }) as unknown as typeof fetch;
    await expect(criarBackendLocal('abc', buscar).chamar('app.info')).resolves.toEqual({ ok: 1 });
    expect(cabecalho).toBe('abc');
  });
  it('erro do serviço chega com o código do contrato', async () => {
    const b = criarBackendLocal('x', resposta(403, { code: 'FORBIDDEN', message: 'token' }));
    await expect(b.chamar('app.info')).rejects.toEqual({ code: 'FORBIDDEN', message: 'token' });
  });
});
