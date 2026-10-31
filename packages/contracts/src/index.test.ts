import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION, ehAppInfo, ehContractError } from './index';

const fixture = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../fixtures/${nome}.json`, import.meta.url), 'utf8'));

describe('contratos (mesmas fixtures do Rust)', () => {
  it('app.info', () => {
    const v = fixture('app.info');
    expect(ehAppInfo(v)).toBe(true);
    expect((v as { contractVersion: number }).contractVersion).toBe(CONTRACT_VERSION);
  });
  it('erro', () => expect(ehContractError(fixture('erro'))).toBe(true));
  it('recusa formas erradas', () => {
    expect(ehContractError({ code: 'minusculo', message: 'x' })).toBe(false);
    expect(ehContractError({ code: 'X' })).toBe(false);
    expect(ehAppInfo({ version: '1', contractVersion: 1, os: 'dos', arch: 'x', dataDir: '/' })).toBe(false);
  });
});
