import { describe, expect, it } from 'vitest';
import { acelDoCelular, giroDoCelular, Mira, movDaRede, movPraRede, PARADO } from './wiimote';

describe('celular como Wiimote (W.6)', () => {
  it('deitado com a tela pra cima = Wiimote parado (gravidade pra cima, em g)', () => {
    const a = acelDoCelular(0, 0, 9.80665);
    expect(a[2]).toBeCloseTo(1);
    expect(Math.abs(a[0]) + Math.abs(a[1])).toBe(0);
  });

  it('giro em °/s vira rad/s nos eixos do Wiimote', () => {
    const g = giroDoCelular(180, 90, 0); // alfa = Z, beta = X
    expect(g[2]).toBeCloseTo(Math.PI); // Z igual
    expect(g[0]).toBeCloseTo(-Math.PI / 2); // X invertido
  });

  it('sem giroscópio: levantar a ponta sobe a mira, deitar pra direita vai pra direita', () => {
    const m = new Mira();
    m.atualizar(acelDoCelular(0, 0, 9.8), null, 0.01); // começa deitado: é o centro
    const s = 20 * (Math.PI / 180);
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 40; i++) p = m.atualizar(acelDoCelular(0, 9.8 * Math.sin(s), 9.8 * Math.cos(s)), null, 0.01);
    expect(p.y).toBeLessThan(-0.5); // ponta pra cima (gravidade no +Y do celular) = mira em cima
    const m2 = new Mira();
    m2.atualizar(acelDoCelular(0, 0, 9.8), null, 0.01);
    for (let i = 0; i < 40; i++) p = m2.atualizar(acelDoCelular(-9.8 * Math.sin(s), 0, 9.8 * Math.cos(s)), null, 0.01);
    expect(p.x).toBeGreaterThan(0.45); // lado direito pra baixo = mira à direita (20° de 40° até a borda)
  });

  it('em pé (tela pra quem joga, no notebook): inclinar mexe a mira nos dois eixos', () => {
    const s = 20 * (Math.PI / 180);
    const emPe = (frente: number, lado: number) =>
      acelDoCelular(-9.8 * Math.sin(lado), 9.8 * Math.cos(frente) * Math.cos(lado), 9.8 * Math.sin(frente));
    const m = new Mira();
    m.atualizar(emPe(0, 0), null, 0.01);
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 40; i++) p = m.atualizar(emPe(s, 0), null, 0.01);
    expect(Math.abs(p.y)).toBeGreaterThan(0.5);
    expect(Math.abs(p.x)).toBeLessThan(0.05);
    const m2 = new Mira();
    m2.atualizar(emPe(0, 0), null, 0.01);
    for (let i = 0; i < 40; i++) p = m2.atualizar(emPe(0, s), null, 0.01);
    expect(p.x).toBeGreaterThan(0.45); // 20° de 40° até a borda
  });

  it('chacoalhando, a mira fica onde estava', () => {
    const m = new Mira();
    m.atualizar(acelDoCelular(0, 0, 9.8), null, 0.01);
    const p = m.atualizar(acelDoCelular(25, 0, 9.8), null, 0.01);
    expect(Math.abs(p.x) + Math.abs(p.y)).toBe(0);
  });

  it('com giroscópio: girar o nariz pra esquerda leva a mira pra esquerda e para na borda', () => {
    const m = new Mira();
    let p = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++) p = m.atualizar(PARADO.acel, giroDoCelular(60, 0, 0), 0.01);
    expect(p.x).toBe(-1);
  });

  it('calibração: a sensibilidade 2 anda o dobro pro mesmo giro; recentrar volta pro meio', () => {
    const giro = giroDoCelular(10, 0, 0); // 10°/s por 0,5 s = 5°
    const normal = new Mira();
    const dobro = new Mira();
    dobro.sensibilidade(2);
    let a = { x: 0, y: 0 };
    let b = { x: 0, y: 0 };
    for (let i = 0; i < 50; i++) {
      a = normal.atualizar(PARADO.acel, giro, 0.01);
      b = dobro.atualizar(PARADO.acel, giro, 0.01);
    }
    expect(b.x).toBeCloseTo(a.x * 2, 5);
    dobro.recentrar();
    expect(dobro.atualizar(PARADO.acel, [0, 0, 0], 0.01)).toEqual({ x: 0, y: 0 });
    dobro.sensibilidade(Number.NaN); // lixo volta pro padrão
    dobro.sensibilidade(99);
  });

  it('mira pelo dedo: arrastar soma à inclinação; recentrar zera os dois', () => {
    const m = new Mira();
    m.atualizar(PARADO.acel, null, 0.01); // o meio
    expect(m.arrastar(0.25, -0.1)).toEqual({ x: 0.5, y: -0.2 });
    // a inclinação continua contando a partir do que o dedo deixou
    const p = m.atualizar(PARADO.acel, null, 0.01);
    expect(p.x).toBeCloseTo(0.5, 5);
    expect(p.y).toBeCloseTo(-0.2, 5);
    expect(m.arrastar(5, 0).x).toBe(1); // para na borda
    m.recentrar();
    m.atualizar(PARADO.acel, null, 0.01);
    expect(m.atualizar(PARADO.acel, null, 0.01)).toEqual({ x: 0, y: 0 });
    expect(m.arrastar(Number.NaN, 0)).toEqual({ x: 0, y: 0 });
  });

  it('vai e volta pela rede; lixo é ignorado', () => {
    const m = {
      acel: [0.1, -0.2, 0.98] as [number, number, number],
      giro: [1, 2, 3] as [number, number, number],
      x: 0.5,
      y: -0.25,
    };
    expect(movDaRede(movPraRede(m))).toEqual(m);
    expect(movDaRede('1;2;3')).toBeNull();
    expect(movDaRede(undefined)).toBeNull();
    expect(movDaRede('a;b;c;d;e;f;g;h')).toBeNull();
  });
});
