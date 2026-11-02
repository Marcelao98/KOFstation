// O "8 bits" do antigo (web/musica.js, KofMusica) portado pra engine: com KOF_ANTIGO=<pasta do kofstation-old> o som e
// as ondas saem byte a byte iguais aos do antigo; sem ele, confere o básico (4 canais, toca, loop, mudo).
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { dadosDaRua, MusicaOitoBits } from '../src/oitobits';

const antigo = process.env.KOF_ANTIGO;

describe('8 bits (a música própria em chip simples)', () => {
  it('toca a Rua: 4 canais a 32 kHz, som saindo, mudo cala o pulso 1', () => {
    const m = new MusicaOitoBits(dadosDaRua());
    expect(m.canais).toBe(4);
    expect(m.taxa).toBe(32000);
    let pico = 0;
    for (let i = 0; i < 40; i++) for (const x of m.quadro()) pico = Math.max(pico, Math.abs(x));
    expect(pico).toBeGreaterThan(3000);
    expect(m.segundos).toBeGreaterThan(20);
  });

  it.skipIf(!antigo)('byte a byte igual ao KofMusica do antigo (Rua e Air)', async () => {
    const KofMusica = createRequire(import.meta.url)(`${antigo}/web/musica.js`) as {
      tocador(q: string): { encher(): { b: Int16Array; n: number }; mudas(m: number): void };
    };
    const { readFileSync } = await import('node:fs');
    const air = JSON.parse(readFileSync(`${antigo}/web/musicas/air.json`, 'utf8'));
    // o musica.js do antigo traz o Air nulo (o juntar.py embute): a Rua compara direto
    const velho = KofMusica.tocador('rua');
    const novo = new MusicaOitoBits(dadosDaRua());
    for (let q = 0; q < 200; q++) {
      if (q === 100) {
        velho.mudas(1);
        novo.mudar(1);
      }
      const a = velho.encher();
      expect([...novo.quadro()]).toEqual([...a.b.subarray(0, a.n)]);
    }
    // Air: o juntar.py do antigo troca o /*{{AIR}}*/ null pelo air.json; aqui igual
    const vm = await import('node:vm');
    const ctx = vm.createContext({ module: { exports: {} } });
    const fonte = readFileSync(`${antigo}/web/musica.js`, 'utf8').replace('/*{{AIR}}*/ null', JSON.stringify(air));
    vm.runInContext(fonte, ctx);
    const comAir = (ctx.module as { exports: typeof KofMusica }).exports;
    const velhoAir = comAir.tocador('air');
    const novoAir = new MusicaOitoBits(air);
    for (let q = 0; q < 300; q++) {
      const a = velhoAir.encher();
      expect([...novoAir.quadro()]).toEqual([...a.b.subarray(0, a.n)]);
    }
  });
});
