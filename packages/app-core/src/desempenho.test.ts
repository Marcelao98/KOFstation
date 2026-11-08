import { escreverPorQuadro, type RegistroQuadro } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import { MedidorDaSessao } from './desempenho';

const P = 1000 / 60;
const bloco = (n: number, t0: number, lento = -1): number[] =>
  escreverPorQuadro(
    Array.from({ length: n }, (_, i): RegistroQuadro => ({
      t: t0 + (i + 1) * P + (i >= lento && lento >= 0 ? 40 : 0),
      nucleo: i === lento ? 48 : 8,
      leitura: 0,
      envio: 0.3,
      pagina: 0,
      somFila: 60,
      faltas: 0,
    })),
  );
const medicao = (porQuadro?: number[]) => ({
  fps: 60,
  nucleoMs: 8,
  atrasos: 0,
  faltasDeSom: 0,
  somNaFilaMs: 60,
  ...(porQuadro ? { porQuadro } : {}),
});

describe('medidor da sessão (página + processo)', () => {
  it('junta o desenho da página, acha o engasgo e guarda o histórico', () => {
    const m = new MedidorDaSessao(60);
    for (let i = 0; i < 60; i++) {
      m.chegou();
      m.desenhou(i === 10 ? 30 : 1);
    }
    const l = m.medicao(medicao(bloco(60, 0, 40)));
    expect(l).not.toBeNull();
    expect(l?.quadros[10]?.pagina).toBe(30);
    expect(l?.resumo.engasgos.map((e) => e.culpado)).toEqual(['pagina', 'nucleo']);
    expect(m.historico.tamanho).toBe(60);
    // o segundo seguinte compara com o fim do anterior
    const l2 = m.medicao(medicao(bloco(60, 1040)));
    expect(l2?.resumo.engasgos).toHaveLength(0);
    expect(m.historico.tamanho).toBe(120);
  });

  it('quadro que chegou e foi substituído antes do desenho conta como pulado', () => {
    const m = new MedidorDaSessao();
    m.chegou();
    m.chegou();
    m.desenhou(2);
    m.desenhou(5); // redesenho sem quadro novo: ignora
    const l = m.medicao(medicao(bloco(2, 0)));
    expect(l?.quadros.map((q) => q.pagina)).toEqual([0, 2]);
  });

  it('sem porQuadro (processo antigo) ou bloco quebrado: null; processo reaberto zera o histórico', () => {
    const m = new MedidorDaSessao();
    expect(m.medicao(medicao())).toBeNull();
    expect(m.medicao(medicao([1, 2, 3]))).toBeNull();
    m.medicao(medicao(bloco(30, 5000)));
    m.medicao(medicao(bloco(10, 0)));
    expect(m.historico.tamanho).toBe(10);
  });
});
