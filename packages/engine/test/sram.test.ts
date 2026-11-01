// M5.1: a bateria do jogo (SRAM) sai e entra no núcleo como no antigo (partes juntas, o que falta vira 0xFF).
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { romGb } from './roms';

const tem = existsSync(`${PASTA_NUCLEOS}gambatte.js`);

describe.skipIf(!tem)('bateria (SRAM) e estado', () => {
  it('Game Boy com MBC1+RAM+BATERIA: lê, escreve e o estado volta bit a bit', async () => {
    const rom = romGb();
    rom[0x147] = 0x03; // MBC1 + RAM + bateria
    rom[0x149] = 0x02; // 8 KB de RAM
    let x = 0;
    for (let i = 0x134; i <= 0x14c; i++) x = (x - (rom[i] ?? 0) - 1) & 0xff;
    rom[0x14d] = x;
    const s = new SessaoLibretro('gb');
    await s.iniciar(fabricaNode('gambatte'));
    s.carregar(rom);
    expect(s.tamanhoSram).toBeGreaterThanOrEqual(8192);
    s.escreverSram(new Uint8Array([1, 2, 3]));
    const lido = s.lerSram();
    expect([...lido.subarray(0, 4)]).toEqual([1, 2, 3, 0xff]);
    for (let i = 0; i < 10; i++) s.rodar();
    const est = s.salvarEstado();
    const quadro = s.quadro.slice();
    for (let i = 0; i < 30; i++) s.rodar();
    s.carregarEstado(est);
    s.rodar();
    const depois = s.salvarEstado();
    s.carregarEstado(est);
    s.rodar();
    expect(s.salvarEstado()).toEqual(depois);
    expect(s.quadro.length).toBe(quadro.length);
  });
});
