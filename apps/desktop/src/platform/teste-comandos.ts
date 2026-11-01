// Os comandos do Rust, imitados em memória pro backend de teste. Cada etapa acrescenta os seus aqui (o mesmo nome,
// os mesmos argumentos e os mesmos códigos de erro de crates/kof-app/src/api.rs).
export type ComandoTeste = (args: Record<string, unknown>, dados: Uint8Array) => unknown;

const NIVEIS = ['error', 'warn', 'info', 'debug'];

export function criarComandosTeste(): Record<string, ComandoTeste> {
  const log: unknown[] = [];
  (globalThis as { __kofLogTeste?: unknown[] }).__kofLogTeste = log;
  return {
    'log.write': (a) => {
      if (!NIVEIS.includes(a.level as string))
        throw { code: 'INVALID_LEVEL', message: `nível de log inválido: ${String(a.level)}` };
      log.push(a);
      return null;
    },
  };
}
