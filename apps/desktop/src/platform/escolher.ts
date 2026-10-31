import type { Backend } from '@kof/app-core';
import { criarBackendTeste } from './teste';

/** Escolhe o adaptador da plataforma. Por enquanto só o de teste; Tauri/local entram no F4b, Android no M14. */
export function escolherBackend(url: URL): Backend {
  return criarBackendTeste({ falhar: url.searchParams.get('backend') === 'falha' });
}
