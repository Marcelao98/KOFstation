import { describe, expect, it } from 'vitest';
import { EXTENSOES, SISTEMAS, extensao, sistemaPorExtensao } from './sistemas';

describe('sistemas', () => {
  it('reconhece pela extensão, sem diferenciar maiúscula', () => {
    expect(sistemaPorExtensao('Chrono Trigger.SFC')).toBe('snes');
    expect(sistemaPorExtensao('pasta/jogo.gbc')).toBe('gb');
    expect(sistemaPorExtensao('C:\\Jogos\\sonic.md')).toBe('md');
    expect(sistemaPorExtensao('mario.z64')).toBe('n64');
    expect(sistemaPorExtensao('demo.elf')).toBe('ps2');
  });

  it('mantém a ordem do antigo: .bin é Mega Drive e .iso é PS1', () => {
    expect(sistemaPorExtensao('faixa.bin')).toBe('md');
    expect(sistemaPorExtensao('disco.iso')).toBe('ps1');
  });

  it('não reconhece o que não é jogo', () => {
    expect(sistemaPorExtensao('leia-me.txt')).toBeNull();
    expect(sistemaPorExtensao('semextensao')).toBeNull();
    expect(sistemaPorExtensao('.oculto')).toBeNull();
    expect(extensao('a.b.ZIP')).toBe('zip');
  });

  it('tem os 11 sistemas do antigo, ids únicos', () => {
    expect(SISTEMAS).toHaveLength(11);
    expect(new Set(SISTEMAS.map((s) => s.id)).size).toBe(11);
    expect(EXTENSOES).toContain('nes');
  });
});
