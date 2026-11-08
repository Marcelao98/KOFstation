// Estatística de desempenho quadro a quadro (M16, docs/DIAGNOSTICO.md): percentis, fps suavizado, engasgos e o
// culpado de cada um. Puro: recebe os tempos (de qualquer emulador, nativo ou WebAssembly) e calcula.
//
// Formato que viaja (aviso `desempenho` do nativo e `medicao` do Worker): `porQuadro`, uma lista plana de números
// inteiros, CAMPOS_POR_QUADRO por quadro, em microssegundos: [t, núcleo, leitura, envio, som na fila, faltas].
// `t` = quando o quadro terminou, contado do começo do processo/Worker (só a diferença entre quadros importa).
// `leitura` já está dentro de `núcleo` (é a parte dele lendo a imagem da placa de vídeo); `envio` só aparece no
// quadro cuja imagem foi mandada pra página; `faltas` = vezes que o som acabou desde o quadro anterior.

export const CAMPOS_POR_QUADRO = 6;
/** Quadros guardados no histórico (10 s a 60 fps), como o DIAGNOSTICO pede. */
export const HISTORICO_QUADROS = 600;
/** Engasgo: o quadro levou mais que isto × o tempo de um quadro. */
export const LIMITE_ENGASGO = 1.5;

/** A etapa culpada de um engasgo. `ritmo` = nenhuma etapa explica a demora (o sistema não acordou o laço a tempo). */
export type Etapa = 'nucleo' | 'leitura' | 'envio' | 'pagina' | 'som' | 'ritmo';
export const ETAPAS_MEDIDAS = ['nucleo', 'leitura', 'envio', 'pagina'] as const;
type EtapaMedida = (typeof ETAPAS_MEDIDAS)[number];

export const NOME_DA_ETAPA: Record<Etapa, string> = {
  nucleo: 'núcleo',
  leitura: 'leitura da placa',
  envio: 'envio pra página',
  pagina: 'desenho na página',
  som: 'som',
  ritmo: 'ritmo (o sistema atrasou o laço)',
};

/** Um quadro, em milissegundos. */
export interface RegistroQuadro {
  t: number;
  /** o núcleo rodando o quadro (com a leitura da placa) */
  nucleo: number;
  leitura: number;
  envio: number;
  /** a página desenhando a imagem deste quadro (0 = não foi desenhado ou não medido) */
  pagina: number;
  somFila: number;
  faltas: number;
}

export interface Engasgo extends RegistroQuadro {
  /** quanto o quadro levou (o intervalo desde o anterior, ou o desenho na página, o que for maior) */
  duracao: number;
  culpado: Etapa;
}

export interface Percentis {
  min: number;
  media: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface Resumo extends Percentis {
  quadros: number;
  /** quadros por segundo no período (pelo relógio dos próprios quadros) */
  fps: number;
  /** segundos cobertos */
  segundos: number;
  engasgos: Engasgo[];
  engasgosPorMinuto: number;
  /** a etapa que mais causou engasgo (null = nenhum engasgo) */
  culpadoMaisComum: Etapa | null;
  /** o pior quadro (o maior intervalo) */
  pior: RegistroQuadro | null;
  /** média e p99 de cada etapa medida */
  porEtapa: Record<EtapaMedida, { media: number; p99: number }>;
}

/** Uso de processador de uma linha (thread) do processo do jogo, em % de um núcleo do processador. */
export interface CpuLinha {
  linha: string;
  pct: number;
}

const arred = (n: number, casas = 2) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

/** Lê o formato que viaja (µs, plano) e devolve os quadros em ms. Erro = tamanho que não fecha. */
export function lerPorQuadro(nums: readonly number[]): RegistroQuadro[] {
  if (nums.length % CAMPOS_POR_QUADRO !== 0)
    throw new Error(`porQuadro com ${nums.length} números: não é múltiplo de ${CAMPOS_POR_QUADRO}`);
  const r: RegistroQuadro[] = [];
  for (let i = 0; i < nums.length; i += CAMPOS_POR_QUADRO) {
    const n = (k: number) => {
      const v = nums[i + k];
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
    };
    r.push({
      t: n(0) / 1000,
      nucleo: n(1) / 1000,
      leitura: n(2) / 1000,
      envio: n(3) / 1000,
      pagina: 0,
      somFila: n(4) / 1000,
      faltas: Math.round(n(5)),
    });
  }
  return r;
}

/** O inverso de lerPorQuadro (o Worker do WebAssembly e os testes usam). */
export function escreverPorQuadro(regs: readonly RegistroQuadro[]): number[] {
  const r: number[] = [];
  for (const q of regs)
    r.push(
      Math.round(q.t * 1000),
      Math.round(q.nucleo * 1000),
      Math.round(q.leitura * 1000),
      Math.round(q.envio * 1000),
      Math.round(q.somFila * 1000),
      q.faltas,
    );
  return r;
}

/** Percentil p (0–100) de uma lista JÁ ORDENADA, por interpolação linear (o mesmo do numpy). */
export function percentil(ordenados: readonly number[], p: number): number {
  const n = ordenados.length;
  if (!n) return 0;
  const pos = (Math.min(100, Math.max(0, p)) / 100) * (n - 1);
  const i = Math.floor(pos);
  const a = ordenados[i] ?? 0;
  const b = ordenados[Math.min(n - 1, i + 1)] ?? a;
  return a + (b - a) * (pos - i);
}

export function percentis(valores: readonly number[]): Percentis {
  if (!valores.length) return { min: 0, media: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  const o = [...valores].sort((a, b) => a - b);
  const soma = o.reduce((s, v) => s + v, 0);
  return {
    min: arred(o[0] ?? 0),
    media: arred(soma / o.length),
    max: arred(o[o.length - 1] ?? 0),
    p50: arred(percentil(o, 50)),
    p95: arred(percentil(o, 95)),
    p99: arred(percentil(o, 99)),
  };
}

/** Intervalo de cada quadro (desde o anterior). O primeiro não tem anterior: usa o tempo de trabalho dele. */
export function intervalos(regs: readonly RegistroQuadro[], anterior?: RegistroQuadro): number[] {
  return regs.map((q, i) => {
    const a = i > 0 ? regs[i - 1] : anterior;
    return a ? Math.max(0, q.t - a.t) : q.nucleo + q.envio;
  });
}

/** O normal de cada etapa (a mediana) no período: o culpado é quem mais passou do normal dele. */
export function normais(regs: readonly RegistroQuadro[]): Record<EtapaMedida, number> {
  const r = {} as Record<EtapaMedida, number>;
  for (const e of ETAPAS_MEDIDAS) {
    // envio e página só existem nos quadros mandados/desenhados: o normal é entre eles
    const v = regs.map((q) => q[e]).filter((x) => e === 'nucleo' || e === 'leitura' || x > 0);
    r[e] = percentil(
      v.sort((a, b) => a - b),
      50,
    );
  }
  return r;
}

/**
 * A etapa culpada de um quadro lento. A leitura está dentro do núcleo: conta só o resto do núcleo pra ele. Se o que
 * passou do normal não explica nem um quarto do tempo de um quadro, o culpado é o som (se faltou) ou o ritmo.
 */
export function culpado(q: RegistroQuadro, normal: Record<EtapaMedida, number>, periodoMs: number): Etapa {
  const excesso: Record<EtapaMedida, number> = {
    nucleo: q.nucleo - q.leitura - Math.max(0, normal.nucleo - normal.leitura),
    leitura: q.leitura - normal.leitura,
    envio: q.envio - normal.envio,
    pagina: q.pagina - normal.pagina,
  };
  let melhor: EtapaMedida = 'nucleo';
  for (const e of ETAPAS_MEDIDAS) if (excesso[e] > excesso[melhor]) melhor = e;
  if (excesso[melhor] >= periodoMs / 4) return melhor;
  return q.faltas > 0 ? 'som' : 'ritmo';
}

/** Engasgos: quadro acima de LIMITE_ENGASGO × o tempo de um quadro, ou falta de som. */
export function acharEngasgos(
  regs: readonly RegistroQuadro[],
  periodoMs: number,
  anterior?: RegistroQuadro,
  normal = normais(regs),
): Engasgo[] {
  const iv = intervalos(regs, anterior);
  const r: Engasgo[] = [];
  regs.forEach((q, i) => {
    const duracao = Math.max(iv[i] ?? 0, q.pagina);
    if (duracao > LIMITE_ENGASGO * periodoMs || q.faltas > 0)
      r.push({ ...q, duracao: arred(duracao), culpado: culpado(q, normal, periodoMs) });
  });
  return r;
}

/** Resumo de um período (um segundo pro F3, a sessão inteira pro resumo.txt). */
export function resumir(regs: readonly RegistroQuadro[], periodoMs: number, anterior?: RegistroQuadro): Resumo {
  const iv = intervalos(regs, anterior);
  const engasgos = acharEngasgos(regs, periodoMs, anterior);
  const primeiro = anterior ?? regs[0];
  const ultimo = regs[regs.length - 1];
  const segundos = primeiro && ultimo ? (ultimo.t - primeiro.t) / 1000 : 0;
  const contagem = new Map<Etapa, number>();
  for (const e of engasgos) contagem.set(e.culpado, (contagem.get(e.culpado) ?? 0) + 1);
  let culpadoMaisComum: Etapa | null = null;
  for (const [e, n] of contagem)
    if (!culpadoMaisComum || n > (contagem.get(culpadoMaisComum) ?? 0)) culpadoMaisComum = e;
  let pior: RegistroQuadro | null = null;
  let piorIv = -1;
  regs.forEach((q, i) => {
    if ((iv[i] ?? 0) > piorIv) {
      piorIv = iv[i] ?? 0;
      pior = q;
    }
  });
  const porEtapa = {} as Resumo['porEtapa'];
  for (const e of ETAPAS_MEDIDAS) {
    const v = regs.map((q) => q[e]).filter((x) => e === 'nucleo' || e === 'leitura' || x > 0);
    const p = percentis(v);
    porEtapa[e] = { media: p.media, p99: p.p99 };
  }
  const quadrosNoRelogio = anterior ? regs.length : regs.length - 1;
  return {
    ...percentis(iv),
    quadros: regs.length,
    fps: segundos > 0 ? arred(quadrosNoRelogio / segundos, 1) : 0,
    segundos: arred(segundos),
    engasgos,
    engasgosPorMinuto: segundos > 0 ? arred((engasgos.length * 60) / segundos, 1) : 0,
    culpadoMaisComum,
    pior,
    porEtapa,
  };
}

/**
 * Fps suavizado como o PCSX2 (PerformanceMetrics.cpp): média móvel de ~16 leituras, mas se pular mais de 20% vai
 * direto pro valor novo (senão uma queda de verdade demora a aparecer).
 */
export function suavizarFps(anterior: number, agora: number): number {
  if (anterior <= 0 || Math.abs(agora - anterior) / anterior > 0.2) return agora;
  return arred(anterior + (agora - anterior) / 16, 1);
}

/** Histórico circular dos últimos N quadros (o F3 desenha o gráfico dele). Não cresce: o mais velho sai. */
export class HistoricoQuadros {
  private readonly q: RegistroQuadro[] = [];
  private inicio = 0;
  constructor(readonly limite = HISTORICO_QUADROS) {}

  get tamanho() {
    return this.q.length;
  }

  /** o último quadro guardado (pra o intervalo do próximo bloco) */
  get ultimo(): RegistroQuadro | undefined {
    if (!this.q.length) return undefined;
    return this.q[(this.inicio + this.q.length - 1) % this.q.length];
  }

  anotar(regs: readonly RegistroQuadro[]) {
    for (const r of regs) {
      if (this.q.length < this.limite) this.q.push(r);
      else {
        this.q[this.inicio] = r;
        this.inicio = (this.inicio + 1) % this.limite;
      }
    }
  }

  /** do mais velho pro mais novo */
  lista(): RegistroQuadro[] {
    return [...this.q.slice(this.inicio), ...this.q.slice(0, this.inicio)];
  }

  limpar() {
    this.q.length = 0;
    this.inicio = 0;
  }
}

/**
 * Junta o tempo de desenho da página aos quadros que foram mandados (os com `envio`), na ordem: o processo/Worker
 * não sabe quanto a página levou, e a página não sabe o tempo do processo. Quadro que a página pulou (chegou outro
 * antes de desenhar) fica com 0. Devolve quantos desenhos sobraram (chegaram antes do bloco do segundo).
 */
export function juntarPagina(regs: RegistroQuadro[], desenhos: number[]): number {
  let i = 0;
  for (const q of regs) {
    if (q.envio <= 0) continue;
    if (i >= desenhos.length) break;
    q.pagina = desenhos[i++] ?? 0;
  }
  desenhos.splice(0, i);
  return desenhos.length;
}
