// Saves de bateria do jogo aberto: rascunho no armazenamento síncrono do navegador (seguro se a janela fechar no meio)
// e depois na loja `saves` do Rust, com a chave do antigo (sram.<título>.<tamanho>).
import {
  aparelhoDe,
  assentarRascunhos,
  assentarSave,
  lerSaveDoJogo,
  rascunharSave,
  registrar,
  textoDoErro,
  type Rascunhos,
} from '@kof/app-core';
import { config } from './config';
import { servicos } from './servicos';

const PREFIXO = 'kofstation-rascunho.';

export const rascunhos: Rascunhos = {
  ler: (k) => {
    try {
      return localStorage.getItem(PREFIXO + k);
    } catch {
      return null;
    }
  },
  gravar: (k, t) => {
    try {
      localStorage.setItem(PREFIXO + k, t);
    } catch {
      // sem armazenamento síncrono: o save vai direto pra loja (o assentar logo depois)
    }
  },
  apagar: (k) => {
    try {
      localStorage.removeItem(PREFIXO + k);
    } catch {
      // nada pra apagar
    }
  },
  chaves: () => {
    const r: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIXO)) r.push(k.slice(PREFIXO.length));
      }
    } catch {
      return r;
    }
    return r;
  },
};

export async function saveDoJogo(chave: string): Promise<Uint8Array | null> {
  try {
    return await lerSaveDoJogo(servicos().armazem, rascunhos, chave);
  } catch (e) {
    registrar('error', 'saves', `não li o save ${chave}: ${textoDoErro(e)}`);
    return null;
  }
}

/** A bateria mudou: rascunho na hora, loja logo depois. */
export function guardarBateria(chave: string, bytes: Uint8Array, nome: string, jogo: string): void {
  rascunharSave(rascunhos, chave, bytes);
  void assentarSave(servicos().armazem, rascunhos, chave, { nome, jogo, aparelho: aparelhoDe(config()).id }).catch(
    (e: unknown) => registrar('warn', 'saves', `save ficou no rascunho: ${textoDoErro(e)}`),
  );
}

/** Rascunhos que sobraram (janela fechada antes de assentar). */
export function assentarSobras(): void {
  void assentarRascunhos(servicos().armazem, rascunhos, aparelhoDe(config()).id).catch((e: unknown) =>
    registrar('warn', 'saves', `rascunhos não assentados: ${textoDoErro(e)}`),
  );
}
