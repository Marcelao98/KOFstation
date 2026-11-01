// Erros e avisos da tela vão pro log em arquivo do Rust (comando log.write), pra dar pra investigar depois sem o
// console do navegador aberto. Nunca derruba nada: se o log falhar, fica só no console.
import type { Backend } from './backend';

export type NivelLog = 'error' | 'warn' | 'info' | 'debug';

let alvo: Backend | null = null;
const fila: [NivelLog, string, string, Record<string, unknown> | undefined][] = [];
let enviando = false;

/** Liga o log ao backend (uma vez, ao abrir o app). */
export function ligarLog(b: Backend): void {
  alvo = b;
  void esvaziar();
}

async function esvaziar() {
  if (!alvo || enviando) return;
  enviando = true;
  try {
    for (let l = fila.shift(); l; l = fila.shift()) {
      const [level, target, message, fields] = l;
      try {
        await alvo.chamar('log.write', fields ? { level, target, message, fields } : { level, target, message });
      } catch (e) {
        console.warn('log.write falhou (a linha fica só aqui):', message, e); // sem serviço: o console é o que sobra
      }
    }
  } finally {
    enviando = false;
  }
}

/** Anota uma linha no log do Rust (assíncrono, na ordem). */
export function registrar(level: NivelLog, target: string, message: string, fields?: Record<string, unknown>): void {
  if (level === 'error') console.error(`[${target}]`, message, fields ?? '');
  fila.push([level, target, message.slice(0, 8000), fields]);
  if (fila.length > 200) fila.splice(0, fila.length - 200);
  void esvaziar();
}

/** Texto de um erro qualquer (com a pilha, quando tem). */
export function textoDoErro(e: unknown): string {
  if (e instanceof Error) return e.stack ? `${e.message}\n${e.stack}` : e.message;
  return typeof e === 'string' ? e : JSON.stringify(e);
}
