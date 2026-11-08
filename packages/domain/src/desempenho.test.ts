import { describe, expect, it } from 'vitest';
import {
  acharEngasgos,
  culpado,
  escreverPorQuadro,
  HistoricoQuadros,
  juntarPagina,
  lerPorQuadro,
  normais,
  percentil,
  percentis,
  resumir,
  suavizarFps,
  type RegistroQuadro,
} from './desempenho';

const P = 1000 / 60;

/** n quadros certinhos a 60 fps: núcleo 8 ms (1 de leitura), envio 0,5 ms, som 60 ms na fila */
function certinhos(n: number, t0 = 0): RegistroQuadro[] {
  return Array.from({ length: n }, (_, i) => ({
    t: t0 + (i + 1) * P,
    nucleo: 8,
    leitura: 1,
    envio: 0.5,
    pagina: 0,
    somFila: 60,
    faltas: 0,
  }));
}

describe('percentis', () => {
  it('interpolação igual à do numpy', () => {
    const o = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentil(o, 50)).toBeCloseTo(5.5);
    expect(percentil(o, 95)).toBeCloseTo(9.55);
    expect(percentil(o, 99)).toBeCloseTo(9.91);
    expect(percentil(o, 0)).toBe(1);
    expect(percentil(o, 100)).toBe(10);
    expect(percentil([], 50)).toBe(0);
  });

  it('um quadro de 80 ms em 59 de 10 ms: a média esconde, o p99 e o máximo mostram', () => {
    const v = [...Array<number>(59).fill(10), 80];
    const p = percentis(v);
    expect(p.media).toBeCloseTo(11.17, 1);
    expect(p.p50).toBe(10);
    expect(p.max).toBe(80);
    expect(p.p99).toBeGreaterThan(38);
  });
});

describe('formato que viaja (µs, plano)', () => {
  it('ida e volta', () => {
    const q = certinhos(3);
    const volta = lerPorQuadro(escreverPorQuadro(q));
    expect(volta).toHaveLength(3);
    expect(volta[1]?.nucleo).toBe(8);
    expect(volta[1]?.envio).toBe(0.5);
    expect(volta[2]?.t).toBeCloseTo(50, 2);
  });

  it('tamanho errado é erro; número estranho vira 0', () => {
    expect(() => lerPorQuadro([1, 2, 3])).toThrow(/múltiplo de 6/);
    expect(lerPorQuadro([1000, -5, Number.NaN, 2000, 0, 1])[0]).toEqual({
      t: 1,
      nucleo: 0,
      leitura: 0,
      envio: 2,
      pagina: 0,
      somFila: 0,
      faltas: 1,
    });
  });
});

describe('engasgos e culpado', () => {
  it('sem engasgo quando tudo anda no tempo', () => {
    const r = resumir(certinhos(60), P);
    expect(r.engasgos).toHaveLength(0);
    expect(r.fps).toBeCloseTo(60, 0);
    expect(r.p99).toBeCloseTo(P, 1);
    expect(r.culpadoMaisComum).toBeNull();
  });

  it('o núcleo travou 40 ms num quadro: engasgo do núcleo', () => {
    const q = certinhos(60);
    const lento = q[30];
    if (!lento) throw new Error('teste');
    lento.nucleo = 40;
    for (let i = 30; i < q.length; i++) (q[i] as RegistroQuadro).t += 32; // tudo depois atrasou
    const e = acharEngasgos(q, P);
    expect(e).toHaveLength(1);
    expect(e[0]?.culpado).toBe('nucleo');
    expect(e[0]?.duracao).toBeCloseTo(P + 32, 1);
  });

  it('a leitura da placa travou: culpa da leitura, não do núcleo', () => {
    const n = normais(certinhos(60));
    const q = { t: 0, nucleo: 38, leitura: 31, envio: 0.5, pagina: 0, somFila: 60, faltas: 0 };
    expect(culpado(q, n, P)).toBe('leitura');
  });

  it('envio e página', () => {
    const n = normais(certinhos(60));
    const [base] = certinhos(1);
    if (!base) throw new Error('teste');
    expect(culpado({ ...base, envio: 20 }, n, P)).toBe('envio');
    expect(culpado({ ...base, pagina: 25 }, n, P)).toBe('pagina');
  });

  it('o som acabou sem nenhuma etapa lenta: culpa do som; demora sem etapa nem som: ritmo', () => {
    const q = certinhos(60);
    (q[10] as RegistroQuadro).faltas = 1;
    for (let i = 40; i < q.length; i++) (q[i] as RegistroQuadro).t += 30;
    const e = acharEngasgos(q, P);
    expect(e.map((x) => x.culpado)).toEqual(['som', 'ritmo']);
  });

  it('resumo: engasgos por minuto, culpado mais comum, pior quadro, etapas', () => {
    const q = certinhos(120);
    for (const i of [20, 60, 100]) {
      (q[i] as RegistroQuadro).nucleo = 45;
      for (let k = i; k < q.length; k++) (q[k] as RegistroQuadro).t += 30;
    }
    const r = resumir(q, P);
    expect(r.engasgos).toHaveLength(3);
    expect(r.culpadoMaisComum).toBe('nucleo');
    expect(r.engasgosPorMinuto).toBeGreaterThan(80);
    expect(r.pior?.nucleo).toBe(45);
    expect(r.porEtapa.nucleo.media).toBeGreaterThan(8);
    expect(r.porEtapa.envio.media).toBe(0.5);
  });

  it('o intervalo do primeiro quadro do bloco usa o último do bloco anterior', () => {
    const a = certinhos(60);
    const b = certinhos(60, 1000 + 40); // o bloco novo começou 40 ms depois do fim do anterior
    const r = resumir(b, P, a[a.length - 1]);
    expect(r.engasgos).toHaveLength(1);
    expect(r.engasgos[0]?.culpado).toBe('ritmo');
  });
});

describe('fps suavizado (como o PCSX2)', () => {
  it('anda devagar perto, pula longe', () => {
    expect(suavizarFps(0, 59)).toBe(59);
    expect(suavizarFps(60, 58)).toBeCloseTo(59.9, 1);
    expect(suavizarFps(60, 30)).toBe(30);
  });
});

describe('histórico circular', () => {
  it('guarda só os últimos, em ordem', () => {
    const h = new HistoricoQuadros(5);
    h.anotar(certinhos(3));
    expect(h.tamanho).toBe(3);
    h.anotar(certinhos(4, 1000));
    expect(h.tamanho).toBe(5);
    const l = h.lista();
    expect(l.map((q) => Math.round(q.t))).toEqual([50, 1017, 1033, 1050, 1067]);
    expect(l[0]?.t).toBeLessThan(l[4]?.t ?? 0);
    expect(h.ultimo?.t).toBeCloseTo(1000 + 4 * P, 3);
    h.limpar();
    expect(h.tamanho).toBe(0);
  });
});

describe('desenho da página junto dos quadros mandados', () => {
  it('na ordem, só nos que têm envio; sobra o que chegou depois', () => {
    const q = certinhos(4);
    (q[1] as RegistroQuadro).envio = 0;
    const d = [2, 3, 4, 5];
    expect(juntarPagina(q, d)).toBe(1);
    expect(q.map((x) => x.pagina)).toEqual([2, 0, 3, 4]);
    expect(d).toEqual([5]);
  });
});
