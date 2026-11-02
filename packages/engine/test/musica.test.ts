// M9.1/M9.3: a música toca numa instância separada do núcleo, com a onda de cada canal (sonda), mudo por canal e .wav.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { ganhoDoFade, Musica, MusicaFm, TAM_ONDA, type ModuloSomFm } from '../src/musica';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { romGb } from './roms';

const tem = existsSync(`${PASTA_NUCLEOS}gambatte.js`);
const energia = (a: Int16Array) => a.reduce((s, x) => s + Math.abs(x), 0);

describe.skipIf(!tem)('música da jukebox', () => {
  it('Game Boy: 4 canais pela sonda, onda viva, mudo de todos = silêncio', async () => {
    // o estado guardado do jogo (como a F7 faz) toca na instância da jukebox
    const jogo = new SessaoLibretro('gb');
    await jogo.iniciar(fabricaNode('gambatte'));
    jogo.carregar(romGb());
    for (let i = 0; i < 20; i++) jogo.rodar();
    const estado = jogo.salvarEstado();

    const m = await Musica.abrir({ sistema: 'gb', rom: romGb(), estado }, fabricaNode('gambatte'));
    expect(m.canais).toBe(4);
    expect(m.temOndas).toBe(true);
    let som = 0;
    for (let i = 0; i < 20; i++) som += energia(m.quadro());
    expect(som).toBeGreaterThan(0);
    const ondas = m.ondas();
    expect(ondas.length).toBe(4 * TAM_ONDA);
    expect(energia(ondas)).toBeGreaterThan(0);
    m.mudar(0b1111);
    for (let i = 0; i < 5; i++) m.quadro();
    let depois = 0;
    for (let i = 0; i < 10; i++) depois += energia(m.quadro());
    expect(depois).toBeLessThan(som / 20);
  });

  it('.wav com o tempo e o fade pedidos', async () => {
    const m = await Musica.abrir({ sistema: 'gb', rom: romGb() }, fabricaNode('gambatte'));
    const { pcm, taxa } = await m.gerarWav(1, 500);
    expect(pcm.length).toBe(Math.round(taxa * 1.5) * 2);
    expect(pcm[pcm.length - 1]).toBe(0); // o fade terminou em silêncio
  });

  it('fade', () => {
    expect(ganhoDoFade(10, 0, 8000)).toBe(1);
    expect(ganhoDoFade(184, 180, 8000)).toBeCloseTo(0.5);
    expect(ganhoDoFade(200, 180, 8000)).toBe(0);
  });
});

describe.skipIf(!existsSync(`${PASTA_NUCLEOS}somfm.js`))('trilha do KOFstation (núcleo só de som)', () => {
  it('toca "Se Essa Rua" com 10 canais e onda viva', async () => {
    const { readFileSync } = await import('node:fs');
    const vm = await import('node:vm');
    const ctx = vm.createContext({ console, atob: (s: string) => Buffer.from(s, 'base64').toString('binary') });
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}somfm.js`, 'utf8'), ctx);
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}trilha.js`, 'utf8') + ';globalThis.T=KofTrilha', ctx);
    const rua = (ctx.T as { musicas: { id: string; cmd?: string }[] }).musicas.find((m) => m.id === 'rua');
    const cmd = Uint8Array.from(Buffer.from(rua?.cmd ?? '', 'base64'));
    const m = await MusicaFm.abrir(cmd, ctx.Nucleo_somfm as () => Promise<ModuloSomFm>);
    let som = 0;
    for (let i = 0; i < 60; i++) som += energia(m.quadro());
    expect(som).toBeGreaterThan(0);
    expect(energia(m.ondas())).toBeGreaterThan(0);
  });
});
