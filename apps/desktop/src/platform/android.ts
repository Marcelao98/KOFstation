// Backend do Android (M14.1): a página roda dentro da WebView da casca Java (android/) e fala com ela pela ponte
// `window.KofAndroid` (`@JavascriptInterface`). Um único método síncrono, `chamar(cmd, argsJson, corpoBase64)`, devolve
// um texto JSON: `{"ok":true,"data":…,"bin":"<base64>"}` ou `{"ok":false,"error":{code,message,details?}}`: o mesmo
// contrato do Rust (docs/API_CONTRACTS.md), só que os bytes viajam em base64. Comando que a casca ainda não tem devolve
// `UNSUPPORTED` com a explicação em português, e o app trata como qualquer outro erro do backend.
import type { Backend } from '@kof/app-core';

/** O que a casca Java expõe (ver android/src/dev/kofstation/android/Ponte.java). */
export interface PonteAndroid {
  chamar(cmd: string, argsJson: string, corpoBase64: string): string;
}

export const ehAndroid = (g: typeof globalThis = globalThis): boolean =>
  typeof (g as { KofAndroid?: PonteAndroid }).KofAndroid?.chamar === 'function';

export function paraBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function deBase64(t: string): Uint8Array {
  const s = atob(t);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

interface Resposta {
  ok: boolean;
  data?: unknown;
  bin?: string;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export function criarBackendAndroid(ponte: PonteAndroid): Backend {
  const rodar = (cmd: string, args: Record<string, unknown>, corpo?: Uint8Array): Resposta => {
    let texto: string;
    try {
      texto = ponte.chamar(cmd, JSON.stringify(args), corpo?.length ? paraBase64(corpo) : '');
    } catch (e) {
      throw { code: 'BACKEND_UNREACHABLE', message: `a casca do Android não respondeu (${cmd}): ${String(e)}` };
    }
    let r: Resposta;
    try {
      r = JSON.parse(texto) as Resposta;
    } catch {
      throw { code: 'BACKEND_BAD_RESPONSE', message: `a casca do Android devolveu algo que não é JSON (${cmd})` };
    }
    if (!r.ok) throw r.error ?? { code: 'BACKEND_BAD_RESPONSE', message: `${cmd} falhou sem dizer por quê` };
    return r;
  };
  return {
    chamar: async <T>(cmd: string, args: Record<string, unknown> = {}) => rodar(cmd, args).data as T,
    lerBinario: async (cmd, args = {}) => {
      const r = rodar(cmd, args);
      if (typeof r.bin !== 'string') throw { code: 'BACKEND_BAD_RESPONSE', message: `${cmd} não devolveu bytes` };
      return deBase64(r.bin);
    },
    enviarBinario: async <T>(cmd: string, args: Record<string, unknown>, dados: Uint8Array) =>
      rodar(cmd, args, dados).data as T,
    // sem `enviarArquivo`: o Blob vira bytes na memória (o app já cai no enviarBinario). CD grande no celular é o
    // M14.4 (núcleo nativo lendo da pasta), não passa pela página.
  };
}
