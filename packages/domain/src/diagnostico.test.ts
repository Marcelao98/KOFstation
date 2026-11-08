import { describe, expect, it } from 'vitest';
import { acharEngasgos, resumir, type RegistroQuadro } from './desempenho';
import {
  AcumuladorDaSessao,
  CABECALHO_ENGASGOS,
  CABECALHO_QUADROS,
  cabecalhoSegundos,
  linhaSegundo,
  linhasEngasgos,
  linhasQuadros,
  nomeDaSessao,
  nomeSeguro,
  num,
  textoDoResumo,
} from './diagnostico';

const P = 1000 / 60;
function segundo(t0: number, lento = -1): RegistroQuadro[] {
  return Array.from({ length: 60 }, (_, i) => ({
    t: t0 + (i + 1) * P + (lento >= 0 && i >= lento ? 30 : 0),
    nucleo: i === lento ? 40.5 : 8,
    leitura: 1,
    envio: 0.25,
    pagina: 0.5,
    somFila: 60,
    faltas: 0,
  }));
}

describe('CSV do diagnóstico', () => {
  it('ponto no decimal, sem notação científica', () => {
    expect(num(1.23456)).toBe('1.235');
    expect(num(1e-7)).toBe('0');
    expect(num(Number.NaN)).toBe('0');
    expect(num(1234567.5, 1)).toBe('1234567.5');
  });

  it('quadros.csv começa no zero e tem as colunas do cabeçalho', () => {
    const q = segundo(5000);
    const l = linhasQuadros(q, 5000);
    expect(l).toHaveLength(60);
    expect(l[0]?.split(',')).toHaveLength(CABECALHO_QUADROS.split(',').length);
    expect(l[1]).toBe('33.333,16.667,8,1,0.25,0.5,60,0');
  });

  it('engasgos.csv e segundos.csv com CPU por linha', () => {
    const q = segundo(0, 30);
    const e = acharEngasgos(q, P);
    const l = linhasEngasgos(e, 0);
    expect(l).toHaveLength(1);
    expect(l[0]?.split(',')[2]).toBe('nucleo');
    expect(l[0]?.split(',')).toHaveLength(CABECALHO_ENGASGOS.split(',').length);
    expect(cabecalhoSegundos(['EE Core', 'MTGS'])).toBe(
      't_s,fps,p50_ms,p95_ms,p99_ms,max_ms,engasgos,cpu_EE_Core_pct,cpu_MTGS_pct',
    );
    const s = linhaSegundo(1, resumir(q, P), [{ linha: 'MTGS', pct: 40.04 }], ['EE Core', 'MTGS']);
    expect(s.split(',')).toHaveLength(9);
    expect(s.endsWith(',1,,40')).toBe(true);
  });

  it('nome da pasta da sessão', () => {
    expect(nomeDaSessao(new Date(2026, 10, 8, 9, 5), 'Shadow of the Colossus (USA).iso')).toBe(
      '2026-11-08_0905_Shadow_of_the_Colossus_USA_iso',
    );
    expect(nomeSeguro('../../etc')).toBe('etc');
    expect(nomeSeguro('ção ñ')).toBe('cao_n');
    expect(nomeSeguro('///')).toBe('jogo');
  });
});

describe('resumo da sessão (memória fixa)', () => {
  it('acumula segundos, acha os culpados e escreve o resumo.txt', () => {
    const a = new AcumuladorDaSessao();
    let anterior: RegistroQuadro | undefined;
    for (let s = 0; s < 120; s++) {
      const q = segundo(s * 1000 + (s > 10 ? 30 : 0), s === 10 ? 20 : -1);
      a.anotar(q, acharEngasgos(q, P, anterior), anterior);
      a.anotarCpu([
        { linha: 'EE Core', pct: 90 },
        { linha: 'MTGS', pct: s % 2 ? 40 : 20 },
      ]);
      anterior = q[q.length - 1];
    }
    const r = a.resumo();
    expect(r.quadros).toBe(7200);
    expect(r.segundos).toBeCloseTo(120, 0);
    expect(r.fpsMedio).toBeCloseTo(60, 0);
    expect(r.p50).toBeCloseTo(P, 0);
    expect(r.engasgos).toBe(1);
    expect(r.culpadoMaisComum).toBe('nucleo');
    expect(r.piores[0]?.t_s).toBeCloseTo(10.35, 1);
    expect(r.cpu).toEqual([
      { linha: 'EE Core', pct: 90 },
      { linha: 'MTGS', pct: 30 },
    ]);
    expect(a.linhasCpu).toEqual(['EE Core', 'MTGS']);
    const t = textoDoResumo(r, {
      jogo: 'Teste',
      sistema: 'ps2',
      nucleo: 'LRPS2',
      periodoMs: P,
      opcoes: { pcsx2_ee_cycle_skip: 'Mild Underclock' },
    });
    expect(t).toContain('Tempo jogado: 2:00');
    expect(t).toContain('Engasgos: 1');
    expect(t).toContain('Culpados: núcleo 1');
    expect(t).toContain('0:10');
    expect(t).toContain('EE Core 90%');
    expect(t).toContain('pcsx2_ee_cycle_skip=Mild Underclock');
  });

  it('sessão vazia não quebra', () => {
    const r = new AcumuladorDaSessao().resumo();
    expect(r.quadros).toBe(0);
    expect(r.culpadoMaisComum).toBeNull();
    expect(textoDoResumo(r, { jogo: 'x', sistema: 'snes', nucleo: 's9x', periodoMs: P })).toContain('0:00');
  });
});
