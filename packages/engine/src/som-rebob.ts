// O som ao rebobinar (fase R.2): guarda o som que saiu, por foto do rebobinador, e toca de trás pra frente quando o
// jogo volta no tempo. As contas são as do domain (som-rebobinar.ts); aqui é só a ordem: o que guardar, quando tocar e
// a emenda com o som normal ao soltar. O Rust (rebobinar.rs) faz o mesmo nos núcleos nativos.
//
//  jogando:  quadro → som → `saiu` (guarda em `pendente`) → foto gravada → `fotoGravada` (o pendente vira um trecho da pilha)
//  voltando: foto volta → `passo` (tira o trecho de cima da pilha, inverte, acelera 2×, fade de entrada, fita)
//  soltou:   `soltar` (prepara a cauda: o que tocaria a seguir) → os próximos `saiu` fazem o crossfade até ela sumir
import {
  acelerar,
  aplicarEntrada,
  coefFita,
  cruzar,
  filtrarFita,
  inverter,
  quadrosEm,
  SOM_REBOBINAR,
  type SomAoRebobinar,
} from '@kof/domain';

function juntar(partes: Float32Array[]): Float32Array {
  let n = 0;
  for (const p of partes) n += p.length;
  const r = new Float32Array(n);
  let o = 0;
  for (const p of partes) {
    r.set(p, o);
    o += p.length;
  }
  return r;
}

export class SomDoRebobinar {
  modo: SomAoRebobinar = 'fita';
  /** o som desde a última foto, quadro a quadro */
  private pendente: Float32Array[] = [];
  /** um trecho por foto (o som que saiu entre a foto anterior e ela), o mais velho primeiro */
  private pilha: Float32Array[] = [];
  private memoria: [number, number] = [0, 0];
  private ultimo: [number, number] = [0, 0];
  /** quantos quadros do fade de entrada já tocaram (0 = não está voltando) */
  private entrada = 0;
  private voltando = false;
  private cauda: Float32Array | null = null;
  private caudaPos = 0;
  private readonly a: number;
  private readonly entradaTotal: number;
  private readonly saidaTotal: number;

  constructor(taxa: number) {
    this.a = coefFita(SOM_REBOBINAR.fitaHz, taxa);
    this.entradaTotal = quadrosEm(SOM_REBOBINAR.entradaMs, taxa);
    this.saidaTotal = quadrosEm(SOM_REBOBINAR.saidaMs, taxa);
  }

  /** Quantos trechos guardados (um por foto). */
  get trechos(): number {
    return this.pilha.length;
  }

  /**
   * O som normal deste quadro, já na taxa da saída, antes de ir pra placa. Faz o crossfade no lugar (se acabou de soltar)
   * e guarda uma cópia quando `guardar` (o rebobinar está ligado).
   */
  saiu(som: Float32Array, guardar: boolean): void {
    const n = som.length >> 1;
    if (this.cauda) {
      cruzar(som, this.cauda, this.caudaPos, this.saidaTotal);
      this.caudaPos += n;
      if (this.caudaPos >= this.saidaTotal) this.cauda = null;
    }
    if (n) this.ultimo = [som[(n - 1) * 2] ?? 0, som[(n - 1) * 2 + 1] ?? 0];
    if (guardar && this.modo === 'fita') this.pendente.push(som.slice());
  }

  /** O rebobinador gravou uma foto: o som desde a anterior vira um trecho. `quantas` = fotos que ele tem agora. */
  fotoGravada(quantas: number): void {
    this.pilha.push(juntar(this.pendente));
    this.pendente = [];
    while (this.pilha.length > quantas) this.pilha.shift();
  }

  /** Uma foto voltou: o trecho que toca agora (null = mudo). */
  passo(): Float32Array | null {
    const t = this.pilha.pop();
    if (this.modo === 'mudo') {
      this.pendente = [];
      return null;
    }
    let seg = t ?? new Float32Array(0);
    if (!this.voltando) {
      // o 1º passo desfaz também o que tocou depois da última foto (é o mais novo: vai no fim, e invertido sai primeiro)
      if (this.pendente.length) seg = juntar([seg, ...this.pendente]);
      this.pendente = [];
      this.memoria = [this.ultimo[0], this.ultimo[1]];
      this.entrada = 0;
      this.voltando = true;
      this.cauda = null;
    }
    const r = this.tratar(seg, this.memoria);
    if (r.length) this.ultimo = [r[r.length - 2] ?? 0, r[r.length - 1] ?? 0];
    return r;
  }

  /** Soltou: prepara a cauda do som invertido pra o crossfade com o som normal que vem a seguir. */
  soltar(): void {
    if (!this.voltando) return;
    this.voltando = false;
    if (this.modo === 'mudo') return;
    // o que tocaria se continuasse voltando (espia a pilha sem tirar: no Só alegria ela continua valendo)
    const precisa = this.saidaTotal * SOM_REBOBINAR.velocidade;
    const partes: Float32Array[] = [];
    let tem = 0;
    for (let i = this.pilha.length - 1; i >= 0 && tem < precisa; i--) {
      const p = this.pilha[i] as Float32Array;
      partes.unshift(p);
      tem += p.length >> 1;
    }
    this.cauda = this.tratar(juntar(partes), [this.memoria[0], this.memoria[1]]);
    this.caudaPos = 0;
  }

  /** Esquece o som guardado (o rebobinador zerou). A cauda que já está tocando continua. */
  limpar(): void {
    this.pendente = [];
    this.pilha = [];
  }

  /** inverter → acelerar → fade de entrada → fita (o fade antes do filtro: a fita suaviza a emenda com o som de antes) */
  private tratar(seg: Float32Array, memoria: [number, number]): Float32Array {
    const r = acelerar(inverter(seg), SOM_REBOBINAR.velocidade);
    aplicarEntrada(r, this.entrada, this.entradaTotal);
    this.entrada += r.length >> 1;
    filtrarFita(r, this.a, memoria);
    return r;
  }
}
