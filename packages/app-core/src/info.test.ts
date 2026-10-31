import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { mensagemDoErro } from './erros';
import { obterInfo } from './info';

const info = { version: '0.1.0', contractVersion: 1, os: 'linux', arch: 'x86_64', dataDir: '/tmp/kof' };
const backend = (r: () => Promise<unknown>): Backend => ({ chamar: <T>() => r() as Promise<T> });

describe('obterInfo', () => {
  it('devolve a info do backend', async () => {
    await expect(obterInfo(backend(async () => info))).resolves.toEqual(info);
  });
  it('erro do contrato vira BackendError com o mesmo código', async () => {
    await expect(
      obterInfo(
        backend(async () => {
          throw { code: 'ROOT_MISSING', message: 'x' };
        }),
      ),
    ).rejects.toMatchObject({ name: 'BackendError', code: 'ROOT_MISSING' });
  });
  it('falha de comunicação não é escondida', async () => {
    await expect(
      obterInfo(
        backend(async () => {
          throw new Error('conexão recusada');
        }),
      ),
    ).rejects.toMatchObject({ code: 'BACKEND_UNREACHABLE', message: 'conexão recusada' });
  });
  it('resposta fora do formato e versão diferente', async () => {
    await expect(obterInfo(backend(async () => ({ version: 1 })))).rejects.toMatchObject({
      code: 'BACKEND_BAD_RESPONSE',
    });
    await expect(obterInfo(backend(async () => ({ ...info, contractVersion: 2 })))).rejects.toMatchObject({
      code: 'CONTRACT_MISMATCH',
    });
  });
  it('mensagens em português, código desconhecido aparece', () => {
    expect(mensagemDoErro('ROOT_MISSING')).toContain('Kof Games');
    expect(mensagemDoErro('NOVO_CODIGO')).toContain('NOVO_CODIGO');
  });
});
