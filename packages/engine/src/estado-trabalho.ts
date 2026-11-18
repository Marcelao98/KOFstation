// Quem monta/desmonta o estado: o Worker (estado-worker.ts) quando o estado é grande e o ambiente tem Worker; senão,
// aqui mesmo (estado pequeno não compensa a cópia; nos testes do Node não há Worker). O aviso de quando cai pra fazer
// aqui vai pro log do app pelo `avisarEstados` (a engine não conhece o log).
import { desempacotarEstado, empacotarEstado, type EstadoDoNucleo } from '@kof/domain';
import type { PedidoDeEstado } from './estado-worker';

let avisar: (mensagem: string) => void = (m) => console.warn('[estados]', m);
/** Quem recebe o aviso de quando o Worker dos estados não está disponível (o app-core liga no log). */
export function avisarEstados(f: (mensagem: string) => void): void {
  avisar = f;
}

/** Acima disso vai pro Worker (o maior estado do wasm, o do PS1, tem ~4 MB e já travava um pouco no celular). */
const GRANDE = 1 << 20;

type Resposta = { id: number; ok: boolean; dados?: unknown; erro?: string };
let worker: Worker | null = null;
let semWorker = typeof Worker === 'undefined';
let proximo = 1;
const esperando = new Map<number, { ok: (v: unknown) => void; falhou: (e: Error) => void }>();

function oWorker(): Worker | null {
  if (worker || semWorker) return worker;
  try {
    worker = new Worker(new URL('./estado-worker.ts', import.meta.url), { type: 'module', name: 'kof-estados' });
    worker.onmessage = ({ data: r }: MessageEvent<Resposta>) => {
      const e = esperando.get(r.id);
      esperando.delete(r.id);
      if (r.ok) e?.ok(r.dados);
      else e?.falhou(new Error(r.erro ?? 'o estado não pôde ser lido'));
    };
    worker.onerror = (ev) => {
      avisar(`o trabalhador dos estados caiu (${ev.message}); seguindo na página`);
      for (const e of esperando.values()) e.falhou(new Error('o trabalhador dos estados caiu'));
      esperando.clear();
      worker?.terminate();
      worker = null;
      semWorker = true;
    };
  } catch (e) {
    avisar(`sem trabalhador pros estados (${e instanceof Error ? e.message : String(e)}); seguindo na página`);
    semWorker = true;
  }
  return worker;
}

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never;

function pedir<T>(p: SemId<PedidoDeEstado>, levar: Transferable[]): Promise<T> | null {
  const w = oWorker();
  if (!w) return null;
  const id = proximo++;
  return new Promise<T>((ok, falhou) => {
    esperando.set(id, { ok: ok as (v: unknown) => void, falhou });
    w.postMessage({ ...p, id }, levar);
  });
}

/** Estado → bytes da loja (Blob quando vem do Worker). O estado é copiado pro Worker (quem chamou continua com o dele). */
export function empacotar(nucleo: string, estado: Uint8Array, comprimir: boolean): Promise<Uint8Array | Blob> {
  if (estado.length >= GRANDE) {
    const copia = estado.slice();
    const r = pedir<Blob>({ tipo: 'empacotar', nucleo, estado: copia, comprimir }, [copia.buffer]);
    if (r) return r;
  }
  return empacotarEstado(nucleo, estado, comprimir);
}

/** Bytes da loja → estado (os bytes já decodificados). Os bytes da loja vão pro Worker e não servem mais aqui. */
export function desempacotar(dados: Uint8Array, comprimido: boolean): Promise<EstadoDoNucleo> {
  if (dados.length >= GRANDE) {
    const r = pedir<EstadoDoNucleo>({ tipo: 'desempacotar', dados, comprimido }, [dados.buffer as ArrayBuffer]);
    if (r) return r;
  }
  return desempacotarEstado(dados, comprimido);
}
