import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { ligarLog, registrar, textoDoErro } from './log';

describe('log da tela', () => {
  it('manda as linhas na ordem pro log.write', async () => {
    const vistos: unknown[] = [];
    const b = {
      chamar: async (cmd: string, args?: Record<string, unknown>) => void vistos.push([cmd, args]),
    } as unknown as Backend;
    registrar('warn', 'teste', 'antes de ligar');
    ligarLog(b);
    registrar('error', 'jogo', 'caiu', { sistema: 'snes' });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(vistos).toEqual([
      ['log.write', { level: 'warn', target: 'teste', message: 'antes de ligar' }],
      ['log.write', { level: 'error', target: 'jogo', message: 'caiu', fields: { sistema: 'snes' } }],
    ]);
  });
  it('texto do erro traz a pilha', () => {
    expect(textoDoErro(new Error('x'))).toContain('x');
    expect(textoDoErro('y')).toBe('y');
  });
});
