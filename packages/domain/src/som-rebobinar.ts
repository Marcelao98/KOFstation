// Som ao rebobinar (fase R): as contas puras. O som é estéreo intercalado em float (-1..1), na taxa da saída. Quem
// guarda o som que saiu e chama estas funções é a engine (worker.ts) e, nos nativos, o Rust (rebobinar.rs): os dois
// conferem os mesmos vetores de teste (packages/contracts/fixtures/som-rebobinar.json), pra o som sair idêntico.
//
// O efeito: ao começar, o som invertido entra com um fade (~80 ms); durante, passa por um passa-baixa leve (a "fita")
// e sai a 2× (a imagem volta a 2×: o tom sobe uma oitava, como fita voltando); ao soltar, crossfade de potência
// constante (~80 ms) do som invertido pro som normal que o núcleo volta a gerar.

export type SomAoRebobinar = 'fita' | 'mudo';

export const SOM_REBOBINAR = {
  /** duração do fade de entrada, em ms */
  entradaMs: 80,
  /** duração do crossfade ao soltar, em ms */
  saidaMs: 80,
  /** corte do passa-baixa da "fita", em Hz */
  fitaHz: 3500,
  /** velocidade do som voltando (a imagem volta a 2×) */
  velocidade: 2,
} as const;

/** Quantos quadros estéreo cabem em `ms` na taxa `taxa`. */
export const quadrosEm = (ms: number, taxa: number): number => Math.max(1, Math.round((ms * taxa) / 1000));

/** Inverte a ordem dos quadros estéreo (o esquerdo continua esquerdo). Devolve um novo. */
export function inverter(estereo: Float32Array): Float32Array {
  const n = estereo.length >> 1;
  const r = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i;
    r[i * 2] = estereo[j * 2] ?? 0;
    r[i * 2 + 1] = estereo[j * 2 + 1] ?? 0;
  }
  return r;
}

/**
 * Acelera por `fator` (2 = metade do tamanho), pela média de cada janela de `fator` quadros (fator inteiro) ou por
 * interpolação linear (fator fracionário). A média já é um passa-baixa: não sobra chiado de "aliasing".
 */
export function acelerar(estereo: Float32Array, fator: number): Float32Array {
  const n = estereo.length >> 1;
  if (fator <= 1 || n === 0) return estereo.slice();
  const m = Math.floor(n / fator);
  const r = new Float32Array(m * 2);
  if (Number.isInteger(fator)) {
    for (let i = 0; i < m; i++) {
      let e = 0;
      let d = 0;
      for (let k = 0; k < fator; k++) {
        e += estereo[(i * fator + k) * 2] ?? 0;
        d += estereo[(i * fator + k) * 2 + 1] ?? 0;
      }
      r[i * 2] = e / fator;
      r[i * 2 + 1] = d / fator;
    }
    return r;
  }
  for (let i = 0; i < m; i++) {
    const p = i * fator;
    const a = Math.floor(p);
    const f = p - a;
    const b = Math.min(a + 1, n - 1);
    for (let c = 0; c < 2; c++) {
      const x0 = estereo[a * 2 + c] ?? 0;
      const x1 = estereo[b * 2 + c] ?? 0;
      r[i * 2 + c] = x0 + (x1 - x0) * f;
    }
  }
  return r;
}

/** Ganho do fade de entrada no quadro `i` de `total` (meio cosseno: começa e termina sem quina). */
export function ganhoEntrada(i: number, total: number): number {
  if (i >= total) return 1;
  if (i <= 0) return 0;
  return 0.5 - 0.5 * Math.cos((Math.PI * i) / total);
}

/** Aplica o fade de entrada no lugar: `inicio` = quantos quadros do fade já passaram antes deste trecho. */
export function aplicarEntrada(estereo: Float32Array, inicio: number, total: number): void {
  const n = estereo.length >> 1;
  for (let i = 0; i < n && inicio + i < total; i++) {
    const g = ganhoEntrada(inicio + i, total);
    estereo[i * 2] = (estereo[i * 2] ?? 0) * g;
    estereo[i * 2 + 1] = (estereo[i * 2 + 1] ?? 0) * g;
  }
}

/** Coeficiente do passa-baixa de um polo pra o corte `hz` na taxa `taxa`. */
export const coefFita = (hz: number, taxa: number): number => 1 - Math.exp((-2 * Math.PI * hz) / taxa);

/**
 * A "fita": passa-baixa de um polo, no lugar. `memoria` = [esquerdo, direito] da última saída (atualizada aqui), pra
 * o filtro continuar sem emenda de um trecho pro outro. Comece a memória com o último som que saiu (sem estalo).
 */
export function filtrarFita(estereo: Float32Array, a: number, memoria: [number, number]): void {
  let e = memoria[0];
  let d = memoria[1];
  const n = estereo.length >> 1;
  for (let i = 0; i < n; i++) {
    e += a * ((estereo[i * 2] ?? 0) - e);
    d += a * ((estereo[i * 2 + 1] ?? 0) - d);
    estereo[i * 2] = e;
    estereo[i * 2 + 1] = d;
  }
  memoria[0] = e;
  memoria[1] = d;
}

/** Ganhos [do que sai, do que entra] do crossfade de potência constante no quadro `i` de `total`. */
export function ganhosCruzados(i: number, total: number): [number, number] {
  const t = i >= total ? 1 : i <= 0 ? 0 : i / total;
  return [Math.cos((Math.PI / 2) * t), Math.sin((Math.PI / 2) * t)];
}

/**
 * Crossfade no lugar: `novo` (o som normal) recebe por cima o `velho` (a cauda do som invertido) que vai sumindo.
 * `inicio` = quantos quadros do crossfade já passaram; depois de `total`, `novo` fica intocado (idêntico ao normal).
 */
export function cruzar(novo: Float32Array, velho: Float32Array, inicio: number, total: number): void {
  const n = novo.length >> 1;
  for (let i = 0; i < n && inicio + i < total; i++) {
    const [gv, gn] = ganhosCruzados(inicio + i, total);
    const k = inicio + i;
    novo[i * 2] = (novo[i * 2] ?? 0) * gn + (velho[k * 2] ?? 0) * gv;
    novo[i * 2 + 1] = (novo[i * 2 + 1] ?? 0) * gn + (velho[k * 2 + 1] ?? 0) * gv;
  }
}

/**
 * O trecho que toca a cada passo pra trás: o som de uma foto (na ordem em que saiu) vira invertido, acelerado e
 * filtrado. `memoria` é a do filtro (continua de um passo pro outro). Não aplica o fade de entrada (quem chama sabe
 * quantos quadros do fade já foram).
 */
export function trechoPraTras(
  somDaFoto: Float32Array,
  a: number,
  memoria: [number, number],
  velocidade: number,
): Float32Array {
  const r = acelerar(inverter(somDaFoto), velocidade);
  filtrarFita(r, a, memoria);
  return r;
}
