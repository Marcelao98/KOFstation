import { describe, expect, it } from 'vitest';
import type { EventoRede, PedidoRede } from './rede';
import { transporteFalso, transporteLocal } from './transporte';

describe('transporte local', () => {
  it('vira o pedido enviar do serviço de rede e só entrega o canal pedido', () => {
    const pedidos: PedidoRede[] = [];
    let emitir: (m: EventoRede) => void = () => {};
    const t = transporteLocal(
      (p) => (pedidos.push(p), true),
      (f) => ((emitir = f), () => (emitir = () => {})),
    );
    expect(t.tipo).toBe('local');
    expect(t.enviar('abc', 'pad', '1,2')).toBe(true);
    expect(pedidos).toEqual([{ t: 'enviar', para: 'abc', canal: 'pad', dados: '1,2' }]);
    const chegou: string[] = [];
    const parar = t.ouvir('jogo', (de, d) => chegou.push(de + ':' + d));
    emitir({ t: 'msg', de: 'x', canal: 'pad', dados: 'não' });
    emitir({ t: 'msg', de: 'x', canal: 'jogo', dados: 'sim' });
    emitir({ t: 'lista', eu: { id: '1', nome: 'PC', visivel: true }, aparelhos: [] });
    expect(chegou).toEqual(['x:sim']);
    parar();
    emitir({ t: 'msg', de: 'x', canal: 'jogo', dados: 'depois' });
    expect(chegou).toEqual(['x:sim']);
  });
});

describe('transporte falso', () => {
  it('guarda o que foi mandado e entrega pros ouvintes do canal', () => {
    const t = transporteFalso();
    const l: string[] = [];
    const parar = t.ouvir('ficha', (de, d) => l.push(de + d));
    t.entregar('a', 'ficha', '{}');
    t.entregar('a', 'outro', 'x');
    t.enviar('b', 'papel', 'y');
    parar();
    t.entregar('a', 'ficha', 'z');
    expect(l).toEqual(['a{}']);
    expect(t.enviados).toEqual([{ para: 'b', canal: 'papel', dados: 'y' }]);
  });
});
