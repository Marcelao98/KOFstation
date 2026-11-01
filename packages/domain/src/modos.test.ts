import { describe, expect, it } from 'vitest';
import { modoValido, rebobNormalDe, regrasDoModo } from './modos';

describe('modos de jogo (regras do antigo)', () => {
  it('cada modo', () => {
    expect(regrasDoModo('alegria')).toEqual({
      estados: true,
      rebobinar: true,
      rebobLimite: 30,
      recargaX: 0,
      turbo: true,
    });
    expect(regrasDoModo('normal', 10)).toEqual({
      estados: true,
      rebobinar: true,
      rebobLimite: 10,
      recargaX: 6,
      turbo: true,
    });
    expect(regrasDoModo('raiz')).toMatchObject({ estados: true, rebobinar: false, turbo: true });
    expect(regrasDoModo('hardcore')).toMatchObject({ estados: false, rebobinar: false, turbo: false });
  });
  it('valores estranhos caem no padrão', () => {
    expect(modoValido('xyz')).toBe('normal');
    expect(rebobNormalDe('7')).toBe(5);
    expect(rebobNormalDe('15')).toBe(15);
  });
});
