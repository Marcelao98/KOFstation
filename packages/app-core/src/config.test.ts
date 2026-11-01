import { objetoEmCamadas, valorEmCamadas } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { Configuracao } from './config';

describe('configuração', () => {
  it('lê, grava juntando as mudanças e migra o que estava no navegador', async () => {
    const gravados: unknown[] = [];
    const b = {
      chamar: async (cmd: string, a: { data?: unknown }) => {
        if (cmd === 'config.read') return { versao: 1, valores: {} };
        gravados.push(a.data);
        return null;
      },
    } as unknown as Backend;
    const c = new Configuracao(b);
    await c.carregar(() => ({ tema: 'cafe' }));
    expect(c.ler('tema')).toBe('cafe');
    c.guardar('volume', 70);
    c.guardar('mudo', '1');
    await c.gravarJa();
    expect(gravados.at(-1)).toEqual({ versao: 1, valores: { tema: 'cafe', volume: '70', mudo: '1' } });
    expect(c.numero('volume', 100)).toBe(70);
    expect(c.numero('nada', 5)).toBe(5);
  });
  it('camadas: jogo > console > geral', () => {
    const v: Record<string, string> = {
      filtro: 'a',
      'filtro.snes': 'b',
      'filtro.jogo.X|1': 'c',
      teclas: '{"A":"KeyX","B":"KeyZ"}',
      'teclas.snes': '{"B":"KeyC"}',
      'teclas.jogo.X|1': 'estragado',
    };
    const ler = (k: string) => v[k] ?? null;
    expect(valorEmCamadas(ler, 'filtro', 'snes', 'X|1')).toBe('c');
    expect(valorEmCamadas(ler, 'filtro', 'nes')).toBe('a');
    expect(objetoEmCamadas(ler, 'teclas', 'snes', 'X|1')).toEqual({ A: 'KeyX', B: 'KeyC' });
  });
});
