// O transporte entre aparelhos (fase C.1 / tarefa N.1): os canais (`pad`, `pad-ok`, `jogo`, `ficha`, `papel`…) falam
// com um `Transporte`, sem saber por onde as mensagens passam. Hoje só existe o **local** (o serviço de rede do
// kofstation, `kof-net`: TCP cifrado na rede de casa). A internet (C.5) entra depois como outro transporte, sem mexer
// em quem usa os canais. Desenho em docs/CONECTIVIDADE.md.
import type { EventoRede, PedidoRede } from './rede';

export interface Transporte {
  /** por onde as mensagens passam ('local' = rede de casa pelo kof-net) */
  readonly tipo: string;
  /** manda `dados` no `canal` pro aparelho `para` (false = não deu pra mandar agora) */
  enviar(para: string, canal: string, dados: string): boolean;
  /** ouve um canal (devolve como parar) */
  ouvir(canal: string, f: (de: string, dados: string) => void): () => void;
}

/**
 * O transporte local: em cima dos pedidos e eventos do serviço de rede (`ligarRede`). `mandar` é o que `ligarRede`
 * devolve; `ouvirEventos` recebe cada evento da rede (devolve como parar).
 */
export function transporteLocal(
  mandar: (p: PedidoRede) => boolean,
  ouvirEventos: (f: (m: EventoRede) => void) => () => void,
): Transporte {
  return {
    tipo: 'local',
    enviar: (para, canal, dados) => mandar({ t: 'enviar', para, canal, dados }),
    ouvir: (canal, f) =>
      ouvirEventos((m) => {
        if (m.t === 'msg' && m.canal === canal) f(m.de, m.dados);
      }),
  };
}

export interface TransporteFalso extends Transporte {
  /** o que foi mandado, na ordem */
  enviados: { para: string; canal: string; dados: string }[];
  /** um aparelho manda uma mensagem pra cá */
  entregar(de: string, canal: string, dados: string): void;
}

/** Pros testes: um transporte em memória (o que se manda fica em `enviados`; `entregar` simula o outro lado). */
export function transporteFalso(): TransporteFalso {
  const ouvintes = new Map<string, Set<(de: string, dados: string) => void>>();
  const enviados: TransporteFalso['enviados'] = [];
  return {
    tipo: 'falso',
    enviados,
    enviar(para, canal, dados) {
      enviados.push({ para, canal, dados });
      return true;
    },
    ouvir(canal, f) {
      const s = ouvintes.get(canal) ?? new Set();
      ouvintes.set(canal, s);
      s.add(f);
      return () => s.delete(f);
    },
    entregar(de, canal, dados) {
      for (const f of [...(ouvintes.get(canal) ?? [])]) f(de, dados);
    },
  };
}
