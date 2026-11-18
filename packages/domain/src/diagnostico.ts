// Modo diagnóstico (M16.3, docs/DIAGNOSTICO.md): o formato dos arquivos que o Marcelo grava jogando e manda. Puro: as
// linhas de CSV (cabeçalho, vírgula entre colunas, PONTO no decimal) e o resumo da sessão inteira, em memória fixa
// (histograma em vez de guardar cada quadro: 1 h a 60 fps seriam 216 mil números).
import {
  intervalos,
  LIMITE_ENGASGO,
  NOME_DA_ETAPA,
  type CpuLinha,
  type Engasgo,
  type Etapa,
  type RegistroQuadro,
  type Resumo,
} from './desempenho';

export const CABECALHO_QUADROS = 't_ms,intervalo_ms,nucleo_ms,leitura_ms,envio_ms,pagina_ms,som_fila_ms,faltas';
export const CABECALHO_ENGASGOS = 't_ms,duracao_ms,culpado,nucleo_ms,leitura_ms,envio_ms,pagina_ms,som_fila_ms,faltas';
export const CABECALHO_SEGUNDOS_BASE = 't_s,fps,p50_ms,p95_ms,p99_ms,max_ms,engasgos';
/** Colunas de CPU fixas no começo da sessão não dão (as linhas aparecem com o jogo): até 6, pelo nome. */
export const MAX_COLUNAS_CPU = 6;

/** Número com ponto e no máximo 3 casas (sem "1e-7" nem vírgula). */
export const num = (n: number, casas = 3): string => {
  if (!Number.isFinite(n)) return '0';
  const f = 10 ** casas;
  return String(Math.round(n * f) / f);
};

/** Nome de coluna/pasta seguro: só letras, números e _ (o jogo vira parte do nome da pasta da sessão). */
export function nomeSeguro(s: string, max = 40): string {
  const n = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, max);
  return n || 'jogo';
}

/** `AAAA-MM-DD_HHMM_<jogo>` (hora local): o nome da pasta da sessão. */
export function nomeDaSessao(quando: Date, jogo: string): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return (
    `${quando.getFullYear()}-${d(quando.getMonth() + 1)}-${d(quando.getDate())}_` +
    `${d(quando.getHours())}${d(quando.getMinutes())}_${nomeSeguro(jogo)}`
  );
}

/** Linhas do quadros.csv (sem cabeçalho). `t0` = o t do primeiro quadro da sessão (o CSV começa no zero). */
export function linhasQuadros(regs: readonly RegistroQuadro[], t0: number, anterior?: RegistroQuadro): string[] {
  const iv = intervalos(regs, anterior);
  return regs.map((q, i) =>
    [
      num(q.t - t0),
      num(iv[i] ?? 0),
      num(q.nucleo),
      num(q.leitura),
      num(q.envio),
      num(q.pagina),
      num(q.somFila),
      q.faltas,
    ].join(','),
  );
}

export function linhasEngasgos(eng: readonly Engasgo[], t0: number): string[] {
  return eng.map((e) =>
    [
      num(e.t - t0),
      num(e.duracao),
      e.culpado,
      num(e.nucleo),
      num(e.leitura),
      num(e.envio),
      num(e.pagina),
      num(e.somFila),
      e.faltas,
    ].join(','),
  );
}

/** Coluna de CPU de uma linha (thread): `cpu_EE_Core_pct`. */
export const colunaCpu = (linha: string) => `cpu_${nomeSeguro(linha, 24)}_pct`;

export function cabecalhoSegundos(linhasCpu: readonly string[]): string {
  return [CABECALHO_SEGUNDOS_BASE, ...linhasCpu.map(colunaCpu)].join(',');
}

/** Uma linha do segundos.csv; as colunas de CPU na ordem de `linhasCpu` (vazio se a linha não apareceu). */
export function linhaSegundo(t_s: number, r: Resumo, cpu: readonly CpuLinha[], linhasCpu: readonly string[]): string {
  const pct = new Map(cpu.map((c) => [c.linha, c.pct]));
  return [
    num(t_s, 1),
    num(r.fps, 1),
    num(r.p50),
    num(r.p95),
    num(r.p99),
    num(r.max),
    r.engasgos.length,
    ...linhasCpu.map((l) => (pct.has(l) ? num(pct.get(l) ?? 0, 1) : '')),
  ].join(',');
}

/** Faixas do histograma: 0,1 ms até 500 ms (acima disso, a última). */
const PASSO_MS = 0.1;
const FAIXAS = 5000;

export interface ResumoDaSessao {
  segundos: number;
  quadros: number;
  fpsMedio: number;
  mediaMs: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
  engasgos: number;
  engasgosPorMinuto: number;
  culpados: Partial<Record<Etapa, number>>;
  culpadoMaisComum: Etapa | null;
  /** os 5 piores engasgos (o momento ajuda a achar o lugar no jogo) */
  piores: { t_s: number; duracao: number; culpado: Etapa }[];
  /** média de CPU de cada linha (thread) */
  cpu: CpuLinha[];
}

/** Acumula a sessão inteira em memória fixa: histograma dos intervalos, contagem de culpados, CPU média. */
export class AcumuladorDaSessao {
  private hist = new Uint32Array(FAIXAS);
  private n = 0;
  private soma = 0;
  private max = 0;
  private t0: number | null = null;
  private tFim = 0;
  private engasgos = 0;
  private culpados = new Map<Etapa, number>();
  private piores: { t: number; duracao: number; culpado: Etapa }[] = [];
  private cpu = new Map<string, { soma: number; n: number }>();
  private leiturasCpu = 0;
  /** ordem em que as linhas de CPU apareceram (as colunas do segundos.csv) */
  readonly linhasCpu: string[] = [];

  get inicio() {
    return this.t0;
  }

  anotar(regs: readonly RegistroQuadro[], eng: readonly Engasgo[], anterior?: RegistroQuadro) {
    if (!regs.length) return;
    this.t0 ??= anterior?.t ?? regs[0]?.t ?? 0;
    this.tFim = regs[regs.length - 1]?.t ?? this.tFim;
    for (const v of intervalos(regs, anterior)) {
      const i = Math.min(FAIXAS - 1, Math.floor(v / PASSO_MS));
      this.hist[i] = (this.hist[i] ?? 0) + 1;
      this.n++;
      this.soma += v;
      if (v > this.max) this.max = v;
    }
    for (const e of eng) {
      this.engasgos++;
      this.culpados.set(e.culpado, (this.culpados.get(e.culpado) ?? 0) + 1);
      this.piores.push({ t: e.t, duracao: e.duracao, culpado: e.culpado });
    }
    if (this.piores.length > 50) this.piores = this.piores.sort((a, b) => b.duracao - a.duracao).slice(0, 5);
  }

  anotarCpu(cpu: readonly CpuLinha[]) {
    this.leiturasCpu++;
    for (const c of cpu) {
      if (!this.cpu.has(c.linha)) {
        this.cpu.set(c.linha, { soma: 0, n: 0 });
        if (this.linhasCpu.length < MAX_COLUNAS_CPU) this.linhasCpu.push(c.linha);
      }
      const a = this.cpu.get(c.linha);
      if (a) {
        a.soma += c.pct;
        a.n++;
      }
    }
  }

  private percentilHist(p: number): number {
    if (!this.n) return 0;
    const alvo = (p / 100) * (this.n - 1);
    let acc = 0;
    for (let i = 0; i < FAIXAS; i++) {
      acc += this.hist[i] ?? 0;
      if (acc > alvo) return (i + 0.5) * PASSO_MS;
    }
    return this.max;
  }

  resumo(): ResumoDaSessao {
    const segundos = this.t0 === null ? 0 : (this.tFim - this.t0) / 1000;
    let culpadoMaisComum: Etapa | null = null;
    for (const [e, n] of this.culpados)
      if (!culpadoMaisComum || n > (this.culpados.get(culpadoMaisComum) ?? 0)) culpadoMaisComum = e;
    const r2 = (x: number) => Math.round(x * 100) / 100;
    return {
      segundos: r2(segundos),
      quadros: this.n,
      fpsMedio: segundos > 0 ? Math.round((this.n / segundos) * 10) / 10 : 0,
      mediaMs: this.n ? r2(this.soma / this.n) : 0,
      p50: r2(this.percentilHist(50)),
      p95: r2(this.percentilHist(95)),
      p99: r2(this.percentilHist(99)),
      maxMs: r2(this.max),
      engasgos: this.engasgos,
      engasgosPorMinuto: segundos > 0 ? Math.round(((this.engasgos * 60) / segundos) * 10) / 10 : 0,
      culpados: Object.fromEntries(this.culpados),
      culpadoMaisComum,
      piores: [...this.piores]
        .sort((a, b) => b.duracao - a.duracao)
        .slice(0, 5)
        .map((p) => ({ t_s: r2((p.t - (this.t0 ?? 0)) / 1000), duracao: r2(p.duracao), culpado: p.culpado })),
      cpu: [...this.cpu]
        .map(([linha, a]) => ({ linha, pct: Math.round((a.soma / Math.max(1, this.leiturasCpu)) * 10) / 10 }))
        .sort((a, b) => b.pct - a.pct),
    };
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** O resumo.txt: pra ler direto, em português. */
export function textoDoResumo(
  r: ResumoDaSessao,
  sobre: { jogo: string; sistema: string; nucleo: string; periodoMs: number; opcoes?: Record<string, string> },
): string {
  const L = [
    `Diagnóstico do KOFstation · ${sobre.jogo} (${sobre.sistema}, núcleo ${sobre.nucleo})`,
    '',
    `Tempo jogado: ${mmss(r.segundos)} · ${r.quadros} quadros · ${num(r.fpsMedio, 1)} fps de média`,
    `Tempo de quadro: média ${num(r.mediaMs, 2)} ms · p50 ${num(r.p50, 2)} · p95 ${num(r.p95, 2)} · p99 ${num(r.p99, 2)} · pior ${num(r.maxMs, 2)} ms (o certo é ${num(sobre.periodoMs, 2)} ms)`,
    `Engasgos: ${r.engasgos} (${num(r.engasgosPorMinuto, 1)} por minuto; engasgo = quadro acima de ${num(LIMITE_ENGASGO * sobre.periodoMs, 1)} ms ou falta de som)`,
  ];
  if (r.culpadoMaisComum) {
    const c = Object.entries(r.culpados)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([e, n]) => `${NOME_DA_ETAPA[e as Etapa]} ${n}`)
      .join(' · ');
    L.push(`Culpados: ${c}`);
  }
  if (r.piores.length)
    L.push(
      'Piores momentos: ' +
        r.piores.map((p) => `${mmss(p.t_s)} (${num(p.duracao, 1)} ms, ${NOME_DA_ETAPA[p.culpado]})`).join(' · '),
    );
  if (r.cpu.length) L.push('Processador por linha (média): ' + r.cpu.map((c) => `${c.linha} ${c.pct}%`).join(' · '));
  if (sobre.opcoes && Object.keys(sobre.opcoes).length)
    L.push(
      'Opções de emulação: ' +
        Object.entries(sobre.opcoes)
          .map(([k, v]) => `${k}=${v}`)
          .join(' · '),
    );
  L.push('', 'Arquivos: quadros.csv (cada quadro), segundos.csv (cada segundo), engasgos.csv, sessao.json, log.txt');
  return L.join('\n') + '\n';
}
