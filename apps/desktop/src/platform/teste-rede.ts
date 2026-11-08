// O serviço de rede de mentira (backend de teste): responde os mesmos pedidos com os mesmos eventos do kof-net, e os
// testes de tela fazem o papel do celular por `window.__kofTeste.rede` (parear com o código, mandar mensagem, cair).
import type { AparelhoRede, CanalRede, EventoRede, PedidoRede } from '@kof/app-core';

export interface RedeTeste {
  /** o que a página mandou pros aparelhos */
  enviados: { para: string; canal: string; dados: string }[];
  /** um celular digita o código (devolve false se a janela não está aberta ou o código está errado) */
  parearCelular(codigo: string, nome?: string): boolean;
  /** um aparelho manda uma mensagem pela rede */
  mensagem(de: string, canal: string, dados: string): void;
  ligar(id: string, online: boolean): void;
}

export function criarRedeTeste(): () => Promise<CanalRede> {
  const eu = { id: '0123456789abcdef', nome: 'PC de teste', visivel: true };
  const aparelhos: AparelhoRede[] = [];
  let janela: { codigo: string } | null = null;
  let ouvinte: ((m: EventoRede) => void) | null = null;
  const emitir = (m: EventoRede) => setTimeout(() => ouvinte?.(m), 0);
  const lista = () => emitir({ t: 'lista', eu: { ...eu }, aparelhos: aparelhos.map((a) => ({ ...a })) });
  let n = 0;
  const t: RedeTeste = {
    enviados: [],
    parearCelular(codigo, nome = 'Celular de teste') {
      if (!janela || janela.codigo !== codigo) return false;
      const id = `cel${String(++n).padStart(13, '0')}`;
      aparelhos.push({
        id,
        nome,
        tipo: 'celular',
        online: true,
        visto: Math.floor(Date.now() / 1000),
        ip: '192.168.0.20',
      });
      janela = null;
      emitir({ t: 'pareado', aparelho: { id, nome, tipo: 'celular' } });
      lista();
      return true;
    },
    mensagem: (de, canal, dados) => emitir({ t: 'msg', de, canal, dados }),
    ligar(id, online) {
      const a = aparelhos.find((x) => x.id === id);
      if (a) a.online = online;
      lista();
    },
  };
  ((globalThis as { __kofTeste?: { rede?: RedeTeste } }).__kofTeste ??= {}).rede = t;
  const pedido = (p: PedidoRede) => {
    switch (p.t) {
      case 'eu':
      case 'lista':
        return lista();
      case 'nome':
        eu.nome = p.nome.slice(0, 63);
        return lista();
      case 'visivel':
        eu.visivel = p.sim;
        return lista();
      case 'parear':
        janela = { codigo: '123456' };
        return emitir({
          t: 'parear',
          codigo: '123456',
          seg: 120,
          ip: '192.168.0.10',
          porta: 8650,
          qr: `kofstation://parear?ip=192.168.0.10&p=8650&id=${eu.id}&s=00112233445566778899aabbccddeeff&n=PC%20de%20teste`,
        });
      case 'parear-fim':
        janela = null;
        return;
      case 'remover': {
        const i = aparelhos.findIndex((a) => a.id === p.id);
        if (i >= 0) aparelhos.splice(i, 1);
        return lista();
      }
      case 'achar':
        return emitir({ t: 'achados', lista: [] });
      case 'enviar':
        if (!aparelhos.some((a) => a.id === p.para && a.online)) return emitir({ t: 'nao-enviou', para: p.para });
        t.enviados.push({ para: p.para, canal: p.canal, dados: p.dados });
        return;
      case 'parear-com':
        return emitir({ t: 'par-erro', texto: 'não consegui falar com o aparelho' });
      case 'conectar':
        return;
    }
  };
  return () =>
    Promise.resolve({
      mandar: (p) => (pedido(p), true),
      ouvir: (e) => {
        ouvinte = e;
      },
    });
}
