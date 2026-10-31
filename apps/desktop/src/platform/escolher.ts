import type { Backend } from '@kof/app-core';
import { criarBackendLocal, tokenDaPagina } from './local';
import { criarBackendTeste } from './teste';

/**
 * Escolhe o adaptador: servido pelo kofstation (http://127.0.0.1 com token) = backend local; senão (pnpm dev, testes)
 * = backend de teste em memória. ?backend=falha simula o serviço fora do ar.
 */
export function escolherBackend(url: URL): Backend {
  if (url.searchParams.get('backend') === 'falha') return criarBackendTeste({ falhar: true });
  const token = url.hostname === '127.0.0.1' ? tokenDaPagina(url) : null;
  return token ? criarBackendLocal(token) : criarBackendTeste();
}
