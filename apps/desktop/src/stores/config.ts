// As configurações do app (arquivo do Rust, chaves do antigo). Carregadas uma vez antes da primeira tela (main.tsx).
import { Configuracao, type Backend } from '@kof/app-core';

let atual = new Configuracao(null);

/** O que as versões M1–M3 guardavam no navegador (kofstation.*) vira configuração do arquivo, uma vez. */
function doNavegador(): Record<string, string> {
  const r: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('kofstation.') || k === 'kofstation.token') continue;
      const v = localStorage.getItem(k);
      if (v !== null) r[k.slice('kofstation.'.length)] = v;
    }
  } catch {
    return r; // sem armazenamento: nada a trazer
  }
  if (r.proporcaoIdx !== undefined) {
    r.proporcao = ['43', '87', 'esticar'][Number(r.proporcaoIdx)] ?? '43';
    delete r.proporcaoIdx;
  }
  return r;
}

export async function carregarConfig(b: Backend): Promise<void> {
  const c = new Configuracao(b);
  await c.carregar(doNavegador);
  atual = c;
  addEventListener('pagehide', () => void c.gravarJa());
}

export const config = (): Configuracao => atual;
