// Backend local (D2, opção B): o kofstation serve o app em 127.0.0.1 e atende /api/<cmd> com o token desta abertura.
// O token vem na URL (?t=...) e fica guardado na sessão, pra sobreviver a um recarregar; depois some da barra.
// Binário (saves, estados, arquivos): corpo application/octet-stream, argumentos no cabeçalho X-Kof-Args.
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
  const pedir = async (cmd: string, args: Record<string, unknown>, dados?: Uint8Array | Blob) => {
    const headers: Record<string, string> = { 'X-Kof-Token': token };
    if (dados) {
      headers['Content-Type'] = 'application/octet-stream';
      headers['X-Kof-Args'] = encodeURIComponent(JSON.stringify(args));
    } else headers['Content-Type'] = 'application/json';
    const r = await buscar(`/api/${cmd}`, {
      method: 'POST',
      headers,
      body: dados ? (dados as Uint8Array<ArrayBuffer> | Blob) : JSON.stringify(args),
    });
    if (!r.ok) {
      const corpo: unknown = await r.json().catch(() => null);
      throw corpo ?? new Error(`o serviço respondeu ${r.status}`);
    }
    return r;
  };
  return {
    async chamar<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
      const r = await pedir(cmd, args);
      return (await r.json()) as T;
    },
    async lerBinario(cmd: string, args: Record<string, unknown> = {}): Promise<Uint8Array> {
      const r = await pedir(cmd, args);
      return new Uint8Array(await r.arrayBuffer());
    },
    async enviarBinario<T>(cmd: string, args: Record<string, unknown>, dados: Uint8Array): Promise<T> {
      const r = await pedir(cmd, args, dados);
      return (await r.json()) as T;
    },
    // o Blob vai como corpo do fetch: o navegador lê do disco e manda, sem ArrayBuffer no JavaScript
    async enviarArquivo<T>(cmd: string, args: Record<string, unknown>, dados: Blob): Promise<T> {
      const r = await pedir(cmd, args, dados);
      return (await r.json()) as T;
    },
  };
}
