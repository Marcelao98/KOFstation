// Monta e desmonta os estados salvos fora da linha da página: com o PS2 (~48 MB de estado) o base64 + gzip na página
// paravam a tela ~2 s a cada F5, F8 e salvar automático. Pedido: {id, tipo, ...}; resposta: {id, ok, dados|erro}.
import { desempacotarEstado, empacotarEstado } from './estado-texto';

export type PedidoDeEstado =
  | { id: number; tipo: 'empacotar'; nucleo: string; estado: Uint8Array; comprimir: boolean }
  | { id: number; tipo: 'desempacotar'; dados: Uint8Array; comprimido: boolean };

const eu = self as unknown as {
  onmessage: (e: MessageEvent<PedidoDeEstado>) => void;
  postMessage: (m: unknown, t?: Transferable[]) => void;
};

eu.onmessage = async ({ data: p }) => {
  try {
    if (p.tipo === 'empacotar') {
      // volta como Blob: a página passa direto pro fetch, que manda sem copiar os MB na linha dela
      const r = await empacotarEstado(p.nucleo, p.estado, p.comprimir);
      eu.postMessage({ id: p.id, ok: true, dados: new Blob([r as Uint8Array<ArrayBuffer>]) });
    } else {
      const r = await desempacotarEstado(p.dados, p.comprimido);
      eu.postMessage({ id: p.id, ok: true, dados: r }, r.bytes ? [r.bytes.buffer as ArrayBuffer] : []);
    }
  } catch (e) {
    eu.postMessage({ id: p.id, ok: false, erro: e instanceof Error ? e.message : String(e) });
  }
};
