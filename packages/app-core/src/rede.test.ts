import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import {
  ligarRede,
  pedidoDoQr,
  quandoFoi,
  textoDoInicio,
  type CanalRede,
  type EventoRede,
  type PedidoRede,
} from './rede';

describe('rede', () => {
  it('liga, pede quem é, repassa os eventos e religa quando cai', async () => {
    const pedidos: PedidoRede[] = [];
    let derrubar = () => {};
    let ev: (m: EventoRede) => void = () => {};
    let aberturas = 0;
    const backend = {
      rede: () => {
        aberturas++;
        const c: CanalRede = {
          mandar: (p) => (pedidos.push(p), true),
          ouvir: (e, f) => ((ev = e), (derrubar = f)),
        };
        return Promise.resolve(c);
      },
    } as unknown as Backend;
    const chegou: EventoRede[] = [];
    const estados: boolean[] = [];
    let religar: (() => void) | null = null;
    const mandar = ligarRede(
      backend,
      (m) => chegou.push(m),
      (ok) => estados.push(ok),
      (f) => (religar = f),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(pedidos).toEqual([{ t: 'eu' }]);
    ev({ t: 'par-erro', texto: 'código errado' });
    expect(chegou).toHaveLength(1);
    expect(mandar({ t: 'parear' })).toBe(true);
    derrubar();
    expect(mandar({ t: 'parear' })).toBe(false);
    expect(estados).toEqual([true, false]);
    (religar as unknown as () => void)();
    await Promise.resolve();
    await Promise.resolve();
    expect(aberturas).toBe(2);
  });

  it('textos e o QR do PC', () => {
    expect(quandoFoi(0)).toBe('nunca');
    expect(quandoFoi(1000, 1000 + 60)).toBe('agora há pouco');
    expect(quandoFoi(1000, 1000 + 600)).toBe('há 10 min');
    expect(quandoFoi(1000, 1000 + 3 * 3600)).toBe('há 3 h');
    const a = { id: 'a', nome: 'Celular', tipo: 'celular', online: true, visto: 0, ip: '' };
    expect(textoDoInicio([])).toBe('parear o celular com o PC');
    expect(textoDoInicio([a])).toBe('🟢 conectado: Celular');
    expect(textoDoInicio([{ ...a, online: false }])).toBe('1 pareado(s), nenhum na rede agora');
    expect(pedidoDoQr('kofstation://parear?ip=192.168.0.5&p=8650&id=x&s=abc&n=PC%20A')).toEqual({
      ip: '192.168.0.5',
      porta: 8650,
      senha: 'abc',
      nome: 'PC A',
    });
    expect(pedidoDoQr('https://x')).toBeNull();
  });
});
