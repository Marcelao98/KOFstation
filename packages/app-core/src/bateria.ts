// Save de bateria (app.js `salvarSram`/`assentarSave`/`lerSave` do antigo): o save cai primeiro num RASCUNHO síncrono
// (não se perde se a janela fechar no meio) e logo depois vai pra loja, comprimido e com o hash; aí o rascunho sai.
// Rascunho que sobrou (janela fechada antes) é assentado na abertura seguinte.
import { abrirSave, deTexto, empacotarSave, type RegistroSave } from '@kof/domain';
import type { Armazem } from './armazem';
import { gravarSaveGuardado, lerSaveGuardado } from './saves';

/** Onde o rascunho fica (no app: o armazenamento síncrono do navegador). */
export interface Rascunhos {
  ler(chave: string): string | null;
  gravar(chave: string, texto: string): void;
  apagar(chave: string): void;
  chaves(): string[];
}

const paraTexto = (u8: Uint8Array) => {
  let t = '';
  for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return t;
};

/** Grava o save que acabou de mudar: rascunho na hora (sem o fim 0xFF, em base64, como o antigo). */
export function rascunharSave(r: Rascunhos, chave: string, bytes: Uint8Array): void {
  let n = bytes.length;
  while (n > 0 && bytes[n - 1] === 0xff) n--;
  r.gravar(chave, btoa(paraTexto(bytes.subarray(0, n))) + '|' + bytes.length);
}

function bytesDoRascunho(t: string): Uint8Array {
  const [b64 = '', cheio] = t.split('|');
  const d = deTexto(atob(b64));
  if (!cheio) return d;
  const u = new Uint8Array(Number(cheio)).fill(0xff);
  u.set(d.subarray(0, u.length));
  return u;
}

/** Leva o rascunho pra loja (comprimido, com hash; o anterior vira cópia) e apaga o rascunho. */
export async function assentarSave(
  arm: Armazem,
  r: Rascunhos,
  chave: string,
  extra: { nome?: string; jogo?: string; aparelho: string },
): Promise<boolean> {
  const t = r.ler(chave);
  if (t == null) return false;
  const reg: RegistroSave = await empacotarSave(bytesDoRascunho(t), {
    chave,
    quando: Date.now(),
    aparelho: extra.aparelho,
  });
  if (extra.nome) reg.nome = extra.nome;
  if (extra.jogo) reg.jogo = extra.jogo;
  const velho = await lerSaveGuardado(arm, chave);
  if (!velho || velho.hash !== reg.hash) {
    if (velho) {
      if (!reg.nome && velho.nome) reg.nome = velho.nome;
      if (!reg.jogo && velho.jogo) reg.jogo = velho.jogo;
      reg.anterior = { dados: velho.dados, cheio: velho.cheio, hash: velho.hash };
      if (velho.quando !== undefined) reg.anterior.quando = velho.quando;
      if (velho.aparelho !== undefined) reg.anterior.aparelho = velho.aparelho;
    }
    await gravarSaveGuardado(arm, reg);
  }
  if (r.ler(chave) === t) r.apagar(chave);
  return true;
}

/** O save do jogo: o rascunho (mais novo) ou o da loja. */
export async function lerSaveDoJogo(arm: Armazem, r: Rascunhos, chave: string): Promise<Uint8Array | null> {
  const t = r.ler(chave);
  if (t != null) return bytesDoRascunho(t);
  const s = await lerSaveGuardado(arm, chave);
  return s ? abrirSave(s) : null;
}

/** Assenta os rascunhos que sobraram da última vez. */
export async function assentarRascunhos(arm: Armazem, r: Rascunhos, aparelho: string): Promise<number> {
  let n = 0;
  for (const k of r.chaves()) if (await assentarSave(arm, r, k, { aparelho })) n++;
  return n;
}
