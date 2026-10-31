// Backend em memória: o app abre num navegador comum, sem Rust. É o que o `pnpm dev` e os testes usam.
// Também simula falhas: abra com ?backend=falha pra ver o erro de comunicação.
import type { Backend } from '@kof/app-core';
import type { AppInfo } from '@kof/contracts';

export function criarBackendTeste(opcoes: { falhar?: boolean } = {}): Backend {
  const info: AppInfo = { version: '0.1.0', contractVersion: 1, os: 'other', arch: 'navegador', dataDir: '(memória)' };
  return {
    async chamar<T>(cmd: string): Promise<T> {
      if (opcoes.falhar) throw new Error('backend de teste desligado (?backend=falha)');
      if (cmd === 'app.info') return info as T;
      throw { code: 'UNKNOWN_COMMAND', message: `comando desconhecido: ${cmd}` };
    },
  };
}
