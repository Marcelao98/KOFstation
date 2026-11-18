import { describe, expect, it } from 'vitest';
import { bitsDoVideo, cenaDaGravacao, formatoDeGravacao, nomeDaGravacao, tempoGravando } from './gravacao';

describe('gravação do jogo (G.1)', () => {
  it('prefere MP4 e cai pro WebM; sem nenhum, null', () => {
    expect(formatoDeGravacao(() => true)?.ext).toBe('mp4');
    expect(formatoDeGravacao((m) => m.startsWith('video/webm'))).toEqual({
      mime: 'video/webm;codecs=vp9,opus',
      ext: 'webm',
    });
    expect(formatoDeGravacao((m) => m === 'video/webm')?.mime).toBe('video/webm');
    expect(formatoDeGravacao(() => false)).toBeNull();
  });

  it('nome com a data, sem caractere proibido nem barra', () => {
    const q = new Date(2026, 10, 18, 20, 41, 7);
    expect(nomeDaGravacao('Jogo de Luta', q, 'mp4')).toBe('Jogo de Luta 2026-11-18 20-41-07.mp4');
    expect(nomeDaGravacao('a/b\\c: "d"?', q, 'webm')).toBe('a b c d 2026-11-18 20-41-07.webm');
    expect(nomeDaGravacao('..', q, 'mp4')).toBe('Gravação 2026-11-18 20-41-07.mp4');
    expect(nomeDaGravacao('   ', q, 'mp4')).toBe('Gravação 2026-11-18 20-41-07.mp4');
    expect(nomeDaGravacao('x'.repeat(300), q, 'mp4').length).toBeLessThan(110);
  });

  it('relógio', () => {
    expect(tempoGravando(0)).toBe('0:00');
    expect(tempoGravando(7_900)).toBe('0:07');
    expect(tempoGravando(65_000)).toBe('1:05');
    expect(tempoGravando(3_729_000)).toBe('1:02:09');
    expect(tempoGravando(-5)).toBe('0:00');
  });

  it('cena: amplia até 1080 de altura, tamanho par, a tela do jogo no mesmo lugar', () => {
    // janela pequena com moldura: caixa 400×300, jogo no meio 320×240
    const c = cenaDaGravacao({ w: 400, h: 300 }, { x: 40, y: 30, w: 320, h: 240 });
    expect(c.altura).toBe(1080);
    expect(c.largura).toBe(1440);
    expect(c.jogo).toEqual({ x: 144, y: 108, w: 1152, h: 864 });
    // sem moldura e tela larga: limitado a 1920 de largura, par
    const l = cenaDaGravacao({ w: 1001, h: 300 }, { x: 0, y: 0, w: 1001, h: 300 });
    expect(l.largura).toBe(1920);
    expect(l.altura % 2).toBe(0);
    expect(l.jogo.w).toBe(1920);
  });

  it('bits do vídeo', () => {
    expect(bitsDoVideo(1920, 1080)).toBeGreaterThan(7_000_000);
    expect(bitsDoVideo(1920, 1080)).toBeLessThan(10_000_000);
    expect(bitsDoVideo(320, 240)).toBe(2_000_000);
  });
});
