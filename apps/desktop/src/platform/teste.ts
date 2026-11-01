// Backend em memória: o app abre num navegador comum, sem Rust. É o que o `pnpm dev` e os testes usam. Imita os
// comandos do Rust (mesmos nomes, argumentos e códigos de erro), guardando tudo na memória desta aba.
// Também simula falhas: abra com ?backend=falha pra ver o erro de comunicação.
import type { Backend } from '@kof/app-core';
import type { AppInfo } from '@kof/contracts';
import { criarComandosTeste } from './teste-comandos';

export function criarBackendTeste(opcoes: { falhar?: boolean } = {}): Backend {
  const info: AppInfo = { version: '0.1.0', contractVersion: 1, os: 'other', arch: 'navegador', dataDir: '(memória)' };
  const cmds = criarComandosTeste();
  const rodar = async (cmd: string, args: Record<string, unknown>, dados?: Uint8Array): Promise<unknown> => {
    if (opcoes.falhar) throw new Error('backend de teste desligado (?backend=falha)');
    if (cmd === 'app.info') return info;
    const f = cmds[cmd];
    if (!f) throw { code: 'UNKNOWN_COMMAND', message: `comando desconhecido: ${cmd}` };
    return f(args, dados ?? new Uint8Array(0));
  };
  return {
    chamar: async <T>(cmd: string, args: Record<string, unknown> = {}) => (await rodar(cmd, args)) as T,
    lerBinario: async (cmd: string, args: Record<string, unknown> = {}) => {
      const r = await rodar(cmd, args);
      if (!(r instanceof Uint8Array)) throw { code: 'BACKEND_BAD_RESPONSE', message: `${cmd} não devolveu bytes` };
      return r;
    },
    enviarBinario: async <T>(cmd: string, args: Record<string, unknown>, dados: Uint8Array) =>
      (await rodar(cmd, args, dados)) as T,
  };
}
