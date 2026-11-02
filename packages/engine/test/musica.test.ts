// M9.1/M9.3: a música toca numa instância separada do núcleo, com a onda de cada canal (sonda), mudo por canal e .wav.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SessaoLibretro } from '../src/libretro';
import { ganhoDoFade, Musica, MusicaFm, TAM_ONDA, type ModuloSomFm } from '../src/musica';
import { fabricaNode, PASTA_NUCLEOS } from './nucleo-node';
import { romGb } from './roms';
import { montarWav } from '../src/spc';

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

// N.5: o .wav da trilha sai byte a byte igual ao do antigo (o exportarWav do app.js, copiado aqui, com o tocador do
// web/somfm.js do antigo × o MusicaFm + wavDeFonte + montarWav do novo). Só com KOF_ANTIGO=<pasta do kofstation-old>.
describe.skipIf(!process.env.KOF_ANTIGO || !existsSync(`${PASTA_NUCLEOS}somfm.js`))('.wav da trilha × antigo', () => {
  it('"Se Essa Rua" em .wav: mesmos bytes', async () => {
    const antigo = process.env.KOF_ANTIGO ?? '';
    const { readFileSync } = await import('node:fs');
    const vm = await import('node:vm');
    const ctx = vm.createContext({
      console,
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
      module: { exports: {} },
    });
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}somfm.js`, 'utf8'), ctx);
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}trilha.js`, 'utf8') + ';globalThis.T=KofTrilha', ctx);
    vm.runInContext(readFileSync(`${antigo}/web/somfm.js`, 'utf8'), ctx);
    const rua = (ctx.T as { musicas: { id: string; cmd?: string; segundos: number }[] }).musicas.find(
      (m) => m.id === 'rua',
    );
    const cmd = Uint8Array.from(Buffer.from(rua?.cmd ?? '', 'base64'));
    const seg = (rua?.segundos ?? 0) < 45 ? (rua?.segundos ?? 0) * 2 : (rua?.segundos ?? 0);
    // antigo (app.js, exportarWav)
    type Tk = { taxa: number; encher(): { b: Int16Array; n: number }; limpar(): void };
    const KofSomFm = (ctx.module as { exports: { tocador(c: Uint8Array): Promise<Tk> } }).exports;
    const tk = await KofSomFm.tocador(cmd);
    const taxa = Math.round(tk.taxa);
    const fade = 4000 / 1000;
    const total = Math.round(taxa * (seg + fade));
    const pcm = new Int16Array(total * 2);
    let n = 0;
    while (n < total) {
      const { b, n: q } = tk.encher();
      for (let i = 0; i + 1 < q && n < total; i += 2, n++) {
        const t = n / taxa;
        const k = t > seg ? Math.max(0, 1 - (t - seg) / fade) : 1;
        pcm[n * 2] = (b[i] ?? 0) * k;
        pcm[n * 2 + 1] = (b[i + 1] ?? 0) * k;
      }
      tk.limpar();
    }
    const cab = new DataView(new ArrayBuffer(44));
    const txt = (o: number, t: string) => {
      for (let i = 0; i < 4; i++) cab.setUint8(o + i, t.charCodeAt(i));
    };
    txt(0, 'RIFF');
    cab.setUint32(4, 36 + pcm.byteLength, true);
    txt(8, 'WAVE');
    txt(12, 'fmt ');
    cab.setUint32(16, 16, true);
    cab.setUint16(20, 1, true);
    cab.setUint16(22, 2, true);
    cab.setUint32(24, taxa, true);
    cab.setUint32(28, taxa * 4, true);
    cab.setUint16(32, 4, true);
    cab.setUint16(34, 16, true);
    txt(36, 'data');
    cab.setUint32(40, pcm.byteLength, true);
    const velho = Buffer.concat([Buffer.from(cab.buffer), Buffer.from(pcm.buffer)]);
    // novo (outra instância do núcleo: o antigo reaproveita uma só)
    const ctx2 = vm.createContext({ console, atob: (s: string) => Buffer.from(s, 'base64').toString('binary') });
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}somfm.js`, 'utf8'), ctx2);
    const m = await MusicaFm.abrir(cmd, ctx2.Nucleo_somfm as () => Promise<ModuloSomFm>);
    const w = await m.gerarWav(seg, 4000);
    const novo = Buffer.from(montarWav(w.pcm, w.taxa));
    expect(novo.length).toBe(velho.length);
    expect(novo.equals(velho)).toBe(true);
  }, 60_000);
});
