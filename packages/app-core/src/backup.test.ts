// Importar e exportar .kofsave com as lojas (em memória, as mesmas regras do Rust).
import { criarPacote, empacotarSave, lerPacote, type PacoteKofsave } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import type { Armazem, Loja } from './armazem';
import { exportarBackup, importarBackup } from './backup';
import { Configuracao } from './config';
import { lerSaveGuardado } from './saves';

export function armazemDeMemoria(): Armazem {
  const m = new Map<string, [unknown, Uint8Array]>();
  const k = (l: Loja, c: string) => `${l}\u0000${c}`;
  return {
    listar: async <M>(l: Loja, p?: string) =>
      [...m]
        .filter(([x]) => x.startsWith(l + '\u0000') && x.slice(l.length + 1).startsWith(p ?? ''))
        .map(([x, [meta, b]]) => ({ key: x.slice(l.length + 1), meta: structuredClone(meta) as M, size: b.length })),
    pegar: async (l, c) => m.get(k(l, c))?.[1].slice() ?? null,
    meta: async <M>(l: Loja, c: string) => (m.has(k(l, c)) ? (structuredClone(m.get(k(l, c))?.[0]) as M) : null),
    por: async (l, c, meta, d) => void m.set(k(l, c), [structuredClone(meta), d?.slice() ?? new Uint8Array(0)]),
    apagar: async (l, c) => void m.delete(k(l, c)),
  };
}

describe('backup .kofsave', () => {
  it('traz o backup do antigo (save mais novo vence, configs só com a caixinha, nunca mudo/volume)', async () => {
    const arm = armazemDeMemoria();
    const cfg = new Configuracao(null);
    const velho = await empacotarSave(new Uint8Array([1, 1, 1]), {
      chave: 'sram.MARIO.512',
      quando: 10,
      aparelho: 'x',
    });
    const { anterior: _, ...semAnterior } = { ...velho, anterior: null };
    void _;
    await (await import('./saves')).gravarSaveGuardado(arm, semAnterior);
    const novo = await empacotarSave(new Uint8Array([2, 2, 2]), { chave: 'sram.MARIO.512', quando: 20, aparelho: 'y' });
    const pacote = await criarPacote({
      versao: 1,
      aparelho: 'y',
      nome: 'PC velho',
      quando: 30,
      saves: [novo],
      stats: [{ id: 'MARIO|512', nome: 'Mario', tempo: 60000, sessoes: 1, dias: {} }],
      config: { tema: 'mocha', volume: '10', mudo: '1', 'teclas.snes': '{}' },
      estados: [{ jogo: 'MARIO|512', nome: 'Mario', quando: 5, capa: 'data:x', dados: new Uint8Array([7]) }],
    });
    const r = await importarBackup(arm, cfg, pacote, true);
    expect(r).toMatchObject({ trazidos: 1, stats: 1, estados: 1, config: 2 });
    expect(cfg.ler('tema')).toBe('mocha');
    expect(cfg.ler('volume')).toBe(null);
    const s = await lerSaveGuardado(arm, 'sram.MARIO.512');
    expect(s?.hash).toBe(novo.hash);
    expect(s?.anterior?.hash).toBe(velho.hash);
    expect(s?.anterior?.dados).toEqual(velho.dados);
    // de novo: nada muda (iguais), e o savestate não duplica
    const r2 = await importarBackup(arm, cfg, pacote, false);
    expect(r2).toMatchObject({ trazidos: 0, iguais: 1, estados: 0, config: 0 });
  });
  it('exporta o que tem, com estados só se pedir', async () => {
    const arm = armazemDeMemoria();
    const cfg = new Configuracao(null);
    cfg.guardar('tema', 'latte');
    cfg.guardar('mudo', '1');
    await arm.por('estados', 'J|1/5', { jogo: 'J|1', nome: 'J', quando: 5 }, new Uint8Array([4]));
    const sem = await lerPacote<PacoteKofsave>((await exportarBackup(arm, cfg, false)).bytes);
    expect(sem.estados).toEqual([]);
    expect(sem.config.tema).toBe('latte');
    expect(sem.config.mudo).toBeUndefined();
    const com = await exportarBackup(arm, cfg, true);
    expect(com.nome).toMatch(/^KOFstation PC \d{4}-\d\d-\d\d\.kofsave$/);
    const p = await lerPacote<PacoteKofsave>(com.bytes);
    expect(p.estados[0]?.dados).toEqual(new Uint8Array([4]));
  });
});
