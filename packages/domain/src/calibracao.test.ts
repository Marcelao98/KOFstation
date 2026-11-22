import { describe, expect, it } from 'vitest';
import {
  acertou,
  arcosDosCantos,
  Chacoalho,
  ContadorDeChacoalhadas,
  eixosDaPosicao,
  ganhoDoChacoalhar,
  lerCalibracao,
  textoDaCalibracao,
  type CalibracaoWii,
} from './calibracao';
import { acelDoCelular, giroDoCelular, Mira, OrdemDoMovimento, movDaRede, movPraRede, PARADO } from './wiimote';

const GRAU = Math.PI / 180;

/** Um movimento gravado: girar o celular `graus` em torno do eixo vertical (o nariz pro lado), em `ms`. */
function girar(m: Mira, grausX: number, grausY: number, ms = 500) {
  const passos = ms / 10;
  let p = { x: 0, y: 0 };
  // °/s no rotationRate da página: alpha (Z) pro lado, beta (X) pra cima/baixo
  for (let i = 0; i < passos; i++)
    p = m.atualizar(PARADO.acel, giroDoCelular((-grausX * 1000) / ms, (-grausY * 1000) / ms, 0), 0.01);
  return p;
}

describe('calibração da mira', () => {
  it('os cantos apontados dão os arcos (e a mira chega na borda certinho no canto)', () => {
    const m = new Mira({ arcoX: Math.PI, arcoY: Math.PI }); // o assistente mede sem borda
    girar(m, -30, -20); // canto de cima à esquerda
    const c1 = m.angulos();
    m.recentrar();
    girar(m, 30, 20); // de baixo à direita
    const c2 = m.angulos();
    expect(c1.x).toBeCloseTo(-30 * GRAU, 2);
    expect(c2.y).toBeCloseTo(20 * GRAU, 2);
    const a = arcosDosCantos([c1, c2]);
    expect(a?.arcoX).toBeCloseTo(30 * GRAU, 2);
    expect(a?.arcoY).toBeCloseTo(20 * GRAU, 2);
    // com a calibração: apontar pro canto = a borda
    if (!a) throw new Error('sem arcos');
    const cal = new Mira(a);
    const p = girar(cal, 30, 20);
    expect(p.x).toBeCloseTo(1, 2);
    expect(p.y).toBeCloseTo(1, 2);
  });
  it('apontar duas vezes pro mesmo lado, ou não mexer, não serve', () => {
    expect(
      arcosDosCantos([
        { x: 0.3, y: 0.2 },
        { x: 0.35, y: -0.2 },
      ]),
    ).toBeNull();
    expect(
      arcosDosCantos([
        { x: 0.01, y: 0 },
        { x: -0.01, y: 0 },
      ]),
    ).toBeNull();
    expect(
      arcosDosCantos([
        { x: 3, y: 3 },
        { x: -3, y: -3 },
      ]),
    ).toEqual({ arcoX: 80 * GRAU, arcoY: 80 * GRAU });
  });
  it('a zona morta segura a mira parada no meio; a suavização tira o tremido', () => {
    const z = new Mira({ zonaMorta: 0.1 });
    expect(girar(z, 1, 0).x).toBe(0); // 1° de 25° = 4%: dentro da zona
    expect(girar(z, 12, 0).x).toBeGreaterThan(0.3);
    // tremido: vai e volta 2° a cada 10 ms
    const tremer = (m: Mira) => {
      let soma = 0;
      for (let i = 0; i < 60; i++) {
        const p = m.atualizar(PARADO.acel, giroDoCelular(i % 2 ? 200 : -200, 0, 0), 0.01);
        soma += Math.abs(p.x);
      }
      return soma;
    };
    expect(tremer(new Mira({ suavizar: 0.8 }))).toBeLessThan(tremer(new Mira()));
  });
});

describe('calibração do chacoalhar', () => {
  it('conta três chacoalhadas e calcula o ganho', () => {
    const c = new ContadorDeChacoalhadas();
    const parado = acelDoCelular(0, 0, 9.8);
    const forte = acelDoCelular(0, 9.8 * 1.2, 9.8); // ~1,56 g: pico de ~0,56 acima… pouco
    const muito = acelDoCelular(0, 9.8 * 2, 9.8); // ~2,2 g
    for (let k = 0; k < 3; k++) {
      c.medir(parado);
      c.medir(muito);
      c.medir(forte);
      c.medir(parado);
    }
    expect(c.picos).toHaveLength(3);
    const g = ganhoDoChacoalhar(c.picos);
    expect(g).toBeGreaterThan(1.5);
    expect(g).toBeLessThanOrEqual(4);
    expect(ganhoDoChacoalhar([])).toBe(1);
    expect(ganhoDoChacoalhar([5, 5])).toBe(1); // já chacoalha forte: não mexe
  });
  it('o ganho aumenta o chacoalhar e deixa a gravidade parada como está', () => {
    const ch = new Chacoalho(2);
    let a: number[] = [];
    for (let i = 0; i < 200; i++) a = ch.aplicar([0, 0, 1]);
    expect(a).toEqual([0, 0, 1]);
    const b = ch.aplicar([0, 1, 1]);
    expect(b[1]).toBeGreaterThan(1.8);
    expect(b[2]).toBeCloseTo(1, 1);
  });
});

describe('mão e posição', () => {
  it('de lado e canhoto, a ponta vai pro outro lado', () => {
    expect(eixosDaPosicao([1, 2, 3], { mao: 'canhoto', posicao: 'de-lado' })).toEqual([-1, -2, 3]);
    expect(eixosDaPosicao([1, 2, 3], { mao: 'destro', posicao: 'de-lado' })).toEqual([1, 2, 3]);
    expect(eixosDaPosicao([1, 2, 3], { mao: 'canhoto', posicao: 'apontar' })).toEqual([1, 2, 3]);
  });
});

describe('guardar e o teste do alvo', () => {
  const c: CalibracaoWii = {
    versao: 1,
    arcoX: 24 * GRAU,
    arcoY: 17 * GRAU,
    zonaMorta: 0.03,
    suavizar: 0.3,
    ganhoChacoalhar: 1.8,
    mao: 'destro',
    posicao: 'apontar',
    giroscopio: true,
  };
  it('vai e volta conferida; lixo vira null; fora dos limites é cortado', () => {
    expect(lerCalibracao(JSON.stringify(c))).toEqual(c);
    expect(lerCalibracao('{')).toBeNull();
    expect(lerCalibracao('{"versao":2}')).toBeNull();
    expect(lerCalibracao(JSON.stringify({ ...c, zonaMorta: 9, mao: 'pé' }))).toMatchObject({
      zonaMorta: 0.5,
      mao: 'destro',
    });
    expect(textoDaCalibracao(c)).toBe('mira 24°×17°, zona 3%, suave 30%, chacoalhar ×1,8, destro, apontando');
  });
  it('acertar o alvo', () => {
    expect(acertou({ x: 0.5, y: 0.5 }, { x: 0.55, y: 0.45 })).toBe(true);
    expect(acertou({ x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toBe(false);
  });
});

describe('M.3: o movimento em ordem', () => {
  it('descarta o fora de ordem e o atrasado; mede a variação', () => {
    const o = new OrdemDoMovimento(100);
    // o celular manda a cada 8 ms; o relógio dele está 5000 ms na frente
    expect(o.aceitar({ seq: 1, ms: 5000 }, 10)).toBe(true);
    expect(o.aceitar({ seq: 2, ms: 5008 }, 20)).toBe(true); // 2 ms mais lento que o melhor
    expect(o.aceitar({ seq: 2, ms: 5008 }, 21)).toBe(false); // repetido
    expect(o.aceitar({ seq: 1, ms: 5000 }, 22)).toBe(false); // fora de ordem
    expect(o.aceitar({ seq: 3, ms: 5016 }, 250)).toBe(false); // chegou 224 ms depois do esperado
    expect(o.aceitar({ seq: 4, ms: 5024 }, 36)).toBe(true);
    expect(o.descartados).toBe(3);
    expect(o.variacao()).toBeGreaterThan(0);
    expect(o.aceitar({}, 40)).toBe(true); // celular velho, sem número: vale
  });
  it('a sequência e a hora vão pela rede (e o PC velho ainda lê os 8 primeiros)', () => {
    const m = { acel: [0, 0, 1] as [number, number, number], giro: [0, 0, 0] as [number, number, number], x: 0, y: 0 };
    const t = movPraRede(m, 42, 123456.7);
    expect(t.split(';')).toHaveLength(10);
    expect(movDaRede(t)).toEqual({ ...m, seq: 42, ms: 123457 });
    expect(movDaRede(t.split(';').slice(0, 8).join(';'))).toEqual(m);
  });
});
