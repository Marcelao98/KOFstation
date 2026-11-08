import { escreverPorQuadro, type RegistroQuadro } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { MedidorDaSessao } from './desempenho';
import { GravadorDiagnostico, type SobreASessao } from './diagnostico';

const P = 1000 / 60;
const bloco = (t0: number, lento = -1): number[] =>
  escreverPorQuadro(
    Array.from({ length: 60 }, (_, i): RegistroQuadro => ({
      t: t0 + (i + 1) * P + (lento >= 0 && i >= lento ? 30 : 0),
      nucleo: i === lento ? 40 : 8,
      leitura: 0,
      envio: 0.3,
      pagina: 0,
      somFila: 60,
      faltas: 0,
    })),
  );

const sobre: SobreASessao = {
  jogo: 'Jogo de Teste',
  sistema: 'ps2',
  nucleo: 'LRPS2',
  versaoDoNucleo: '38d3a83f',
  nativo: true,
  tamanho: 123,
  fps: 60,
  opcoes: { pcsx2_ee_cycle_skip: 'Mild Underclock' },
  pagina: { navegador: 'teste', placa: 'Placa X' },
  kofstation: '0.1.0',
};

function backendFalso(limite = Infinity) {
  const arquivos = new Map<string, string>();
  const pedidos: { cmd: string; a: Record<string, unknown> }[] = [];
  let total = 0;
  const b = {
    chamar: (cmd: string, a: Record<string, unknown> = {}) => {
      pedidos.push({ cmd, a });
      if (cmd === 'diag.maquina') return Promise.resolve({ sistema: 'linux', nucleos: 8 });
      if (cmd === 'diag.abrir') return Promise.resolve({ sessao: a.nome });
      return Promise.reject(new Error(cmd));
    },
    enviarBinario: (cmd: string, a: Record<string, unknown>, d: Uint8Array) => {
      pedidos.push({ cmd, a });
      const arq = String(a.arquivo);
      const t = new TextDecoder().decode(d);
      if (arq !== 'resumo.txt' && total + d.length > limite) return Promise.resolve({ cheio: true });
      total += d.length;
      arquivos.set(arq, a.trocar ? t : (arquivos.get(arq) ?? '') + t);
      return Promise.resolve({ cheio: false });
    },
  } as unknown as Backend;
  return { b, arquivos, pedidos };
}

describe('gravador do modo diagnóstico', () => {
  it('abre com a máquina e o jogo, grava em lotes e fecha com o resumo', async () => {
    const { b, arquivos, pedidos } = backendFalso();
    let relogio = 0;
    const g = await GravadorDiagnostico.abrir(b, sobre, new Date(2026, 10, 8, 21, 7), () => relogio);
    expect(g.sessao).toBe('2026-11-08_2107_Jogo_de_Teste');
    const abrir = pedidos.find((p) => p.cmd === 'diag.abrir')?.a.sessao as Record<string, Record<string, unknown>>;
    expect(abrir.maquina).toMatchObject({ sistema: 'linux', placaDeVideoDaPagina: 'Placa X' });
    expect(abrir.opcoes).toEqual(sobre.opcoes);
    expect(JSON.stringify(abrir)).not.toContain('/home');

    const m = new MedidorDaSessao(60);
    const med = (pq: number[], cpu = [{ linha: 'EE Core', pct: 95 }]) => ({
      fps: 60,
      nucleoMs: 8,
      atrasos: 0,
      faltasDeSom: 0,
      somNaFilaMs: 60,
      porQuadro: pq,
      cpu,
    });
    for (let s = 0; s < 12; s++) {
      relogio = s * 1000;
      const l = m.medicao(med(bloco(s * 1000 + (s > 3 ? 30 : 0), s === 3 ? 10 : -1)));
      if (l) g.anotar(l);
    }
    const texto = await g.fechar(['[nativo] linha 1', '[nativo] linha 2']);
    const q = (arquivos.get('quadros.csv') ?? '').trim().split('\n');
    expect(q[0]).toBe('t_ms,intervalo_ms,nucleo_ms,leitura_ms,envio_ms,pagina_ms,som_fila_ms,faltas');
    expect(q).toHaveLength(1 + 12 * 60);
    const s = (arquivos.get('segundos.csv') ?? '').trim().split('\n');
    expect(s[0]).toBe('t_s,fps,p50_ms,p95_ms,p99_ms,max_ms,engasgos,cpu_EE_Core_pct');
    expect(s).toHaveLength(13);
    expect((arquivos.get('engasgos.csv') ?? '').trim().split('\n')).toHaveLength(2);
    expect(arquivos.get('log.txt')).toBe('[nativo] linha 1\n[nativo] linha 2\n');
    expect(arquivos.get('resumo.txt')).toBe(texto);
    expect(texto).toContain('Engasgos: 1');
    expect(texto).toContain('EE Core 95%');
    // em lotes: bem menos pedidos que segundos
    const lotes = pedidos.filter((p) => p.cmd === 'diag.anotar' && p.a.arquivo === 'quadros.csv');
    expect(lotes.length).toBeLessThanOrEqual(4);
    expect(await g.fechar()).toBe(''); // fechar de novo não faz nada
  });

  it('no limite de tamanho para de gravar, mas o resumo ainda entra', async () => {
    const { b, arquivos } = backendFalso(20_000);
    let relogio = 0;
    const g = await GravadorDiagnostico.abrir(b, sobre, new Date(), () => relogio);
    const m = new MedidorDaSessao(60);
    for (let s = 0; s < 30; s++) {
      relogio = s * 1000;
      const l = m.medicao({
        fps: 60,
        nucleoMs: 8,
        atrasos: 0,
        faltasDeSom: 0,
        somNaFilaMs: 60,
        porQuadro: bloco(s * 1000),
      });
      if (l) g.anotar(l);
      await g.descarregar();
    }
    expect(g.lotado).toBe(true);
    const texto = await g.fechar();
    expect(texto).toContain('limite de 20 MB');
    expect(arquivos.get('resumo.txt')).toBe(texto);
  });
});
