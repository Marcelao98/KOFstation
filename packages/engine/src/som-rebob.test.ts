import { quadrosEm, SOM_REBOBINAR } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import { SomDoRebobinar } from './som-rebob';

const TAXA = 48000;
const POR_QUADRO = 800; // 48000 / 60
/** um quadro de som: uma rampa com o número do quadro (dá pra saber de onde veio cada amostra) */
const quadro = (k: number) => {
  const f = new Float32Array(POR_QUADRO * 2);
  for (let i = 0; i < POR_QUADRO; i++) f[i * 2] = f[i * 2 + 1] = Math.sin((k * POR_QUADRO + i) * 0.05) * 0.5;
  return f;
};
/** joga `n` quadros com foto a cada 2 (como o worker) */
function jogar(s: SomDoRebobinar, n: number, desde = 0, fotos = { n: 0 }) {
  for (let k = desde; k < desde + n; k++) {
    s.saiu(quadro(k), true);
    if ((k + 1) % 2 === 0) s.fotoGravada(++fotos.n);
  }
  return fotos;
}

describe('som ao rebobinar na engine', () => {
  it('guarda um trecho por foto e respeita quantas fotos o rebobinador tem', () => {
    const s = new SomDoRebobinar(TAXA);
    jogar(s, 20);
    expect(s.trechos).toBe(10);
    s.fotoGravada(3); // o rebobinador jogou fotos velhas fora
    expect(s.trechos).toBe(3);
  });

  it('voltando sai som (não zero), a 2× (meio quadro por quadro de jogo) e começa do silêncio', () => {
    const s = new SomDoRebobinar(TAXA);
    jogar(s, 60);
    const t1 = s.passo();
    expect(t1).not.toBeNull();
    expect(Math.abs(t1?.[100] ?? 1)).toBeLessThan(0.01); // fade de entrada (a fita emenda as primeiras amostras com o som de antes)
    for (let i = 0; i < 10; i++) {
      const t = s.passo() as Float32Array;
      expect(t.length / 2).toBe(POR_QUADRO); // 2 quadros de jogo viram 1 de som
    }
    const t = s.passo() as Float32Array;
    expect(Math.max(...Array.from(t, Math.abs))).toBeGreaterThan(0.05);
  });

  it('mudo: não sai nada voltando, mas continua acompanhando as fotos', () => {
    const s = new SomDoRebobinar(TAXA);
    s.modo = 'mudo';
    jogar(s, 20);
    expect(s.passo()).toBeNull();
    expect(s.trechos).toBe(9);
  });

  it('ao soltar: crossfade e, depois dele, o som é idêntico ao normal', () => {
    const s = new SomDoRebobinar(TAXA);
    jogar(s, 60);
    for (let i = 0; i < 10; i++) s.passo();
    s.soltar();
    const total = quadrosEm(SOM_REBOBINAR.saidaMs, TAXA);
    const quadrosDeCrossfade = Math.ceil(total / POR_QUADRO);
    let mudou = false;
    for (let k = 0; k < quadrosDeCrossfade + 3; k++) {
      const normal = quadro(1000 + k);
      const som = normal.slice();
      s.saiu(som, true);
      if (k < quadrosDeCrossfade) {
        if (som.some((x, i) => x !== normal[i])) mudou = true;
      } else expect(som).toEqual(normal);
    }
    expect(mudou).toBe(true);
  });

  it('limpar esquece o som guardado', () => {
    const s = new SomDoRebobinar(TAXA);
    jogar(s, 10);
    s.limpar();
    expect(s.trechos).toBe(0);
  });
});
