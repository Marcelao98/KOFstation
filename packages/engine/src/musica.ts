// A música de uma faixa da jukebox, sem DOM (roda no Worker do tocador e no Node): uma instância SEPARADA do núcleo
// (o jogo aberto não é tocado), sem imagem e sem botão, com o estado do jogo do momento em que a música foi guardada (o
// `tocador` do web/nucleo.js do antigo). SNES com .spc: o .spc entra num estado do Snes9x (spc.ts).
import type { SistemaId } from '@kof/domain';
import { SessaoLibretro, type ExtrasDoJogo, type FabricaDeNucleo } from './libretro';
import { CANAIS, taxaDaOnda } from './sonda';
import { estadoDoSpc, regsDoDsp, romQuieta } from './spc';

export const PADRAO_SEG = 180;
export const PADRAO_FADE = 8000;
/** amostras de onda por canal que a tela recebe (a sonda guarda 4096) */
export const TAM_ONDA = 2048;

export interface FaixaParaTocar {
  sistema: SistemaId;
  /** ROM do jogo (SNES com .spc: nenhuma, usa a ROM quieta) */
  rom?: Uint8Array | null;
  /** estado do núcleo (bytes do savestate) */
  estado?: Uint8Array | null;
  spc?: Uint8Array | null;
  /** trilha do KOFstation: comandos pros chips FM e PSG (toca no núcleo só de som) */
  fm?: Uint8Array | null;
  /** BIOS e os arquivos do jogo (Neo Geo: o zip do pai) */
  extras?: ExtrasDoJogo;
}

/** O que o Worker do tocador precisa de uma música (do núcleo do jogo ou do núcleo só de som). */
export interface FonteDeMusica {
  canais: number;
  nomes: readonly string[];
  papeis: readonly string[];
  /** amplitude máxima de cada canal na onda = 1 */
  escalas: readonly number[];
  taxa: number;
  taxaOnda: number;
  amostras: number;
  readonly temOndas: boolean;
  mudar(m: number): void;
  quadro(): Int16Array;
  ondas(destino?: Int16Array): Int16Array;
  niveis(ondas?: Int16Array): Float32Array;
  gerarWav(segundos: number, fadeMs: number, pausa?: () => Promise<void>): Promise<{ pcm: Int16Array; taxa: number }>;
}

/** Pico de cada canal nas últimas 512 amostras da onda (as barras ao vivo). */
function picos(ondas: Int16Array, canais: number, escalas?: readonly number[]): Float32Array {
  const r = new Float32Array(canais);
  for (let v = 0; v < canais; v++) {
    let mn = 1e9;
    let mx = -1e9;
    for (let k = TAM_ONDA - 512; k < TAM_ONDA; k++) {
      const x = ondas[v * TAM_ONDA + k] ?? 0;
      if (x < mn) mn = x;
      if (x > mx) mx = x;
    }
    r[v] = ((mx - mn) * (escalas?.[v] ?? 1 / 7680)) / 2;
  }
  return r;
}

/** Gera o .wav de qualquer fonte (o `exportarWav` do antigo: tempo + fade, mais rápido que o tempo real). */
async function wavDe(
  f: Pick<FonteDeMusica, 'taxa' | 'quadro'>,
  segundos: number,
  fadeMs: number,
  pausa?: () => Promise<void>,
): Promise<{ pcm: Int16Array; taxa: number }> {
  const taxa = Math.round(f.taxa);
  const fade = fadeMs / 1000;
  const total = Math.round(taxa * (segundos + fade));
  const pcm = new Int16Array(total * 2);
  let n = 0;
  let desde = Date.now();
  while (n < total) {
    const b = f.quadro();
    for (let i = 0; i + 1 < b.length && n < total; i += 2, n++) {
      const t = n / taxa;
      const k = t > segundos ? Math.max(0, 1 - (t - segundos) / fade) : 1;
      pcm[n * 2] = (b[i] ?? 0) * k;
      pcm[n * 2 + 1] = (b[i + 1] ?? 0) * k;
    }
    if (pausa && Date.now() - desde > 40) {
      await pausa();
      desde = Date.now();
    }
  }
  return { pcm, taxa };
}

export class Musica implements FonteDeMusica {
  readonly s: SessaoLibretro;
  /** canais mostrados (nomes do sistema; 0 = sem sonda) */
  canais = 0;
  nomes: readonly string[] = [];
  papeis: readonly string[] = [];
  escalas: readonly number[] = [];
  taxa = 32000;
  taxaOnda = 32768;
  /** amostras (estéreo) já geradas desde o começo da faixa */
  amostras = 0;
  private indices: number[] = [];
  private totalSonda = 0;
  private mudas = 0;

  private constructor(readonly sistema: SistemaId) {
    this.s = new SessaoLibretro(sistema);
  }

  static async abrir(f: FaixaParaTocar, fabrica: FabricaDeNucleo): Promise<Musica> {
    const m = new Musica(f.sistema);
    const s = m.s;
    await s.iniciar(fabrica);
    const rom = f.spc ? romQuieta() : f.rom;
    if (!rom) throw new Error('falta a ROM do jogo pra tocar essa música');
    const info = s.carregar(rom, f.extras ?? {});
    m.taxa = info.taxaAudio;
    if (f.spc) {
      s.rodarSoSom();
      s.carregarEstado(estadoDoSpc(f.spc, s.salvarEstado()));
    } else if (f.estado) s.carregarEstado(f.estado);
    // sem estado: a ROM é a própria música (trilha) e toca desde o começo
    const mod = s.modulo;
    mod._lr_sonda?.(1);
    m.totalSonda = mod._lr_canais?.() ?? 0;
    const c = CANAIS[f.sistema];
    if (c) {
      m.nomes = c.nomes;
      m.papeis = c.papeis;
      m.escalas = c.nomes.map((_, i) => c.escalas?.[i] ?? 1 / 7680);
      m.indices = c.indices ? [...c.indices] : c.nomes.map((_, i) => i);
      // SNES no Snes9x: sem sonda, mas as 8 vozes (barras pelo envelope e mudo pelas opções)
      m.canais = f.sistema === 'snes' ? 8 : m.totalSonda ? Math.min(m.indices.length, c.nomes.length) : 0;
    }
    m.taxaOnda = taxaDaOnda(s.config.nucleo);
    return m;
  }

  get temOndas(): boolean {
    return this.totalSonda > 0 && this.canais > 0;
  }

  /** Bit por canal: 1 = mudo (Genesis Plus GX e Snes9x pelas opções de volume do próprio núcleo). */
  mudar(m: number): void {
    this.mudas = m;
    const n = this.s.config.nucleo;
    if (n === 'genplus') {
      const op: Record<string, string> = {};
      this.indices.slice(0, this.canais).forEach((c, l) => {
        const k = c < 6 ? `genesis_plus_gx_md_channel_${c}_volume` : `genesis_plus_gx_psg_channel_${c - 6}_volume`;
        op[k] = m & (1 << l) ? '0' : '100';
      });
      this.s.mudarOpcoes(op);
    } else if (n === 'snes9x') {
      const op: Record<string, string> = {};
      for (let v = 0; v < 8; v++) op[`snes9x_sndchan_volume_${v + 1}`] = m & (1 << v) ? '0' : '100';
      this.s.mudarOpcoes(op);
    } else this.s.modulo._lr_mudas?.(m);
  }

  get mudasAtuais(): number {
    return this.mudas;
  }

  /** Um quadro de som (vista na memória do núcleo, válida até o próximo). */
  quadro(): Int16Array {
    const a = this.s.rodarSoSom();
    this.amostras += a.length / 2;
    return a;
  }

  /** As ondas dos canais, a mais nova no fim: `TAM_ONDA` amostras por canal. */
  ondas(destino = new Int16Array(this.canais * TAM_ONDA)): Int16Array {
    const mod = this.s.modulo;
    if (!this.temOndas || !mod._lr_onda || !mod._lr_onda_pos_c) return destino.fill(0);
    const tam = 4096;
    const buf = new Int16Array(mod.HEAPU8.buffer, mod._lr_onda(), this.totalSonda * tam);
    for (let v = 0; v < this.canais; v++) {
      const c = this.indices[v] ?? v;
      const pos = mod._lr_onda_pos_c(c);
      for (let k = 0; k < TAM_ONDA; k++)
        destino[v * TAM_ONDA + k] = buf[c * tam + ((pos - TAM_ONDA + k) & (tam - 1))] ?? 0;
    }
    return destino;
  }

  /** Nível de cada canal (0..1): no SNES o envelope (ENVX) de cada voz; nos outros, o pico da onda. */
  niveis(ondas?: Int16Array): Float32Array {
    const r = new Float32Array(this.canais);
    if (this.sistema === 'snes') {
      const vivo = this.s.estadoVivo(); // sem copiar o estado (~800 KB)
      const regs = vivo ? regsDoDsp(new Uint8Array(vivo.buffer, vivo.byteOffset, this.s.tamEstado)) : null;
      if (regs) for (let v = 0; v < 8; v++) r[v] = (regs[v * 16 + 8] ?? 0) / 127;
      return r;
    }
    return ondas ? picos(ondas, this.canais, this.escalas) : r;
  }

  /** O .wav da faixa: `segundos` + fade, mais rápido que o tempo real (o `exportarWav` do antigo). */
  gerarWav(segundos: number, fadeMs: number, pausa?: () => Promise<void>) {
    return wavDe(this, segundos, fadeMs, pausa);
  }
}

/** O núcleo só de som do antigo (nucleo-libretro/somfm.c: YM2612 + PSG do Genesis Plus GX), o `KofSomFm`. */
export interface ModuloSomFm {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _som_iniciar(taxa: number): void;
  _som_tocar(p: number, n: number): void;
  _som_mudas(m: number): void;
  _som_quadro(): number;
  _som_saida(): number;
  _som_onda(): number;
  _som_onda_pos(): number;
}

const CANAIS_FM = ['FM 1', 'FM 2', 'FM 3', 'FM 4', 'FM 5', 'FM 6', 'PSG 1', 'PSG 2', 'PSG 3', 'Ruído'];
const PAPEIS_FM = ['FM', 'FM', 'FM', 'FM', 'FM', 'FM', 'quadrada', 'quadrada', 'quadrada', 'LFSR'];

/** A trilha do KOFstation no som do Mega Drive: 10 canais (6 FM + 4 PSG), 48 kHz. */
export class MusicaFm implements FonteDeMusica {
  canais = 10;
  nomes = CANAIS_FM;
  papeis = PAPEIS_FM;
  escalas = CANAIS_FM.map((_, v) => (v < 6 ? 1 / 8192 : 1 / 2100));
  taxa = 48000;
  taxaOnda = 26633;
  amostras = 0;
  readonly temOndas = true;

  private constructor(private m: ModuloSomFm) {}

  static async abrir(cmd: Uint8Array, fabrica: () => Promise<ModuloSomFm>): Promise<MusicaFm> {
    const m = await fabrica();
    m._som_iniciar(48000);
    const p = m._malloc(cmd.length);
    m.HEAPU8.set(cmd, p);
    m._som_tocar(p, cmd.length);
    m._som_mudas(0);
    m._som_onda(); // liga a sonda (o somfm.c só grava as ondas depois que alguém pede)
    return new MusicaFm(m);
  }

  mudar(x: number) {
    this.m._som_mudas(x);
  }

  quadro(): Int16Array {
    const n = this.m._som_quadro();
    this.amostras += n;
    return new Int16Array(this.m.HEAPU8.buffer, this.m._som_saida(), n * 2);
  }

  ondas(destino = new Int16Array(10 * TAM_ONDA)): Int16Array {
    const tam = 4096;
    const buf = new Int16Array(this.m.HEAPU8.buffer, this.m._som_onda(), 10 * tam);
    const pos = this.m._som_onda_pos() >> 2;
    for (let v = 0; v < 10; v++) {
      const p = this.m.HEAPU32[pos + v] ?? 0;
      for (let k = 0; k < TAM_ONDA; k++)
        destino[v * TAM_ONDA + k] = buf[v * tam + ((p - TAM_ONDA + k) & (tam - 1))] ?? 0;
    }
    return destino;
  }

  niveis(ondas?: Int16Array): Float32Array {
    return ondas ? picos(ondas, 10, this.escalas) : new Float32Array(10);
  }

  gerarWav(segundos: number, fadeMs: number, pausa?: () => Promise<void>) {
    return wavDe(this, segundos, fadeMs, pausa);
  }
}

/** Ganho do fade no fim da faixa (1 = volume cheio; `segundos` 0 = sem fim). */
export function ganhoDoFade(t: number, segundos: number, fadeMs: number): number {
  if (!segundos || t <= segundos) return 1;
  return Math.max(0, 1 - ((t - segundos) * 1000) / fadeMs);
}
