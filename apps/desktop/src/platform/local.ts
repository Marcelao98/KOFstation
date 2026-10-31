// Backend local (D2, opção B): o kofstation serve o app em 127.0.0.1 e atende /api/<cmd> com o token desta abertura.
// O token vem na URL (?t=...) e fica guardado na sessão, pra sobreviver a um recarregar; depois some da barra.
import type { Backend } from '@kof/app-core';

const CHAVE = 'kofstation.token';

export function tokenDaPagina(url: URL): string | null {
  const t = url.searchParams.get('t');
  try {
    if (t) {
      sessionStorage.setItem(CHAVE, t);
      url.searchParams.delete('t');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      return t;
    }
    return sessionStorage.getItem(CHAVE);
  } catch {
    return t; // sem sessionStorage: vale só enquanto não recarregar
  }
}

export function criarBackendLocal(token: string, buscar: typeof fetch = fetch): Backend {
  return {
    async chamar<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
      const r = await buscar(`/api/${cmd}`, {
        method: 'POST',
        headers: { 'X-Kof-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const corpo: unknown = await r.json().catch(() => null);
      if (!r.ok) throw corpo ?? new Error(`o serviço respondeu ${r.status}`);
      return corpo as T;
    },
  };
}
