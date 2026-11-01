// Uma sessão de jogo num núcleo libretro do kofstation-old (ponte.cpp compilada pra wasm). Faz o que a classe
// Consolinho do web/nucleo.js fazia, sem DOM: roda no Worker do app e no Node (testes).
import type { SistemaId } from '@kof/domain';
import { NUCLEOS, mascaraLibretro, nomeParaNucleo, type ConfigNucleo } from './nucleos';
import { encaixarQuadro } from './quadro';

/** O pedaço do módulo do emscripten que a ponte expõe (funções lr_*). */
export interface ModuloLibretro {
  HEAPU8: Uint8Array;
  HEAPF64: Float64Array;
  _lr_alloc(n: number): number;
  _free(p: number): void;
  _lr_var(k: number, v: number): void;
  _lr_init(): void;
  _lr_load(rom: number, n: number, nome: number): number;
  _lr_info(): number;
  _lr_run(n: number, copia: number): void;
  _lr_pad(m: number): void;
  _lr_pad_n?(j: number, m: number): void;
  _lr_eixos_n?(j: number, lx: number, ly: number, rx: number, ry: number): void;
  _lr_fb(): number;
  _lr_w(): number;
  _lr_h(): number;
  _lr_audio(): number;
  _lr_audio_n(): number;
  _lr_reset(): void;
  _lr_unload(): void;
  _lr_state_size(): number;
  _lr_state_save(p: number, n: number): number;
  _lr_state_load(p: number, n: number): number;
  _lr_mem_ptr?(id: number): number;
  _lr_mem_size?(id: number): number;
  _lr_ok?(): number;
}

export type FabricaDeNucleo = (opcoes: {
  print: (s: string) => void;
  printErr: (s: string) => void;
}) => Promise<ModuloLibretro>;

export interface InfoDoJogo {
  sistema: SistemaId;
  largura: number;
  altura: number;
  fps: number;
  taxaAudio: number;
  /** proporção da tela do aparelho (do núcleo ou fixa do sistema) */
  proporcao: number;
}

const texto = (m: ModuloLibretro, s: string): number => {
  const b = new TextEncoder().encode(s + '\0');
  const p = m._lr_alloc(b.length);
  m.HEAPU8.set(b, p);
  return p;
};

export class SessaoLibretro {
  readonly config: ConfigNucleo;
  readonly log: string[] = [];
  private mod!: ModuloLibretro;
  info!: InfoDoJogo;
  /** imagem no formato do canvas (RGBA, 1 pixel por Uint32), no tamanho largura × altura */
  quadro = new Uint32Array(0);
  /** botões (bits do controle virtual) e eixos (-32767..32767) de cada jogador */
  readonly pad = [0, 0, 0, 0];
  readonly eixos = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  /** bateria: RAM do cartucho (id 0) e, no Game Boy, o relógio (id 1) logo depois — [endereço, tamanho] */
  private partesSram: [number, number][] = [];
  /** onde o estado é salvo dentro da memória do núcleo (reaproveitado: o rebobinar compara direto ali) */
  private estadoBuf = 0;
  tamEstado = 0;

  constructor(readonly sistema: SistemaId) {
    const c = NUCLEOS[sistema];
    if (!c) throw new Error(`o app novo ainda não roda ${sistema}`);
    this.config = c;
  }

  async iniciar(fabrica: FabricaDeNucleo, opcoesExtras: Record<string, string> = {}): Promise<void> {
    const anotar = (s: string) => {
      this.log.push(String(s));
      if (this.log.length > 40) this.log.shift();
    };
    this.mod = await fabrica({ print: anotar, printErr: anotar });
    for (const [k, v] of Object.entries({ ...this.config.opcoes, ...opcoesExtras })) {
      const pk = texto(this.mod, k);
      const pv = texto(this.mod, v);
      this.mod._lr_var(pk, pv);
      this.mod._free(pk);
      this.mod._free(pv);
    }
    this.mod._lr_init();
  }

  carregar(rom: Uint8Array): InfoDoJogo {
    const m = this.mod;
    const p = m._lr_alloc(rom.length);
    m.HEAPU8.set(rom, p);
    const pn = texto(m, nomeParaNucleo(this.sistema, rom));
    const ok = m._lr_load(p, rom.length, pn);
    m._free(p);
    m._free(pn);
    if (!ok) {
      const falta = this.log
        .filter((l) => /fail|error|invalid|unsupported/i.test(l))
        .slice(-2)
        .join(' · ');
      throw new Error(`o núcleo ${this.config.nucleo} não aceitou essa ROM` + (falta ? `: ${falta}` : ''));
    }
    const i = m._lr_info() >> 3;
    const f64 = m.HEAPF64;
    this.info = {
      sistema: this.sistema,
      largura: this.config.largura,
      altura: this.config.altura,
      fps: f64[i + 5] ?? 60,
      taxaAudio: f64[i + 6] ?? 32000,
      proporcao: this.config.proporcao ?? f64[i + 4] ?? this.config.largura / this.config.altura,
    };
    this.quadro = new Uint32Array(this.info.largura * this.info.altura);
    if (m._lr_mem_ptr && m._lr_mem_size) {
      const ptr = m._lr_mem_ptr.bind(m);
      const tam = m._lr_mem_size.bind(m);
      this.partesSram = [0, 1].map((id): [number, number] => [ptr(id), tam(id)]).filter(([p, t]) => p && t);
    }
    this.tamEstado = m._lr_state_size();
    this.estadoBuf = m._lr_alloc((this.tamEstado + 3) & ~3);
    return this.info;
  }

  /** Tamanho da bateria (0 = o jogo não tem save). */
  get tamanhoSram(): number {
    return this.partesSram.reduce((s, [, t]) => s + t, 0);
  }

  /** Cópia da bateria (as partes juntas, como o `cart.sram` do antigo). */
  lerSram(): Uint8Array {
    const r = new Uint8Array(this.tamanhoSram);
    let o = 0;
    for (const [p, t] of this.partesSram) {
      r.set(this.mod.HEAPU8.subarray(p, p + t), o);
      o += t;
    }
    return r;
  }

  /** Põe um save na bateria; o que faltar vira 0xFF (memória apagada), como no antigo. */
  escreverSram(b: Uint8Array): void {
    let o = 0;
    for (const [p, t] of this.partesSram) {
      const h = this.mod.HEAPU8;
      for (let i = 0; i < t; i++) h[p + i] = o + i < b.length ? (b[o + i] ?? 0xff) : 0xff;
      o += t;
    }
  }

  /** Roda um quadro. Devolve as amostras de som desse quadro (estéreo intercalado, int16) — uma vista na memória do
   *  núcleo, válida até o próximo quadro. `mudouTamanho` = a resolução mudou (Sega). */
  rodar(): { audio: Int16Array; mudouTamanho: boolean } {
    const m = this.mod;
    m._lr_pad(mascaraLibretro(this.pad[0] ?? 0));
    if (m._lr_pad_n && m._lr_eixos_n)
      for (let j = 1; j < 4; j++) {
        m._lr_pad_n(j, mascaraLibretro(this.pad[j] ?? 0));
        const e = this.eixos[j] ?? [0, 0, 0, 0];
        m._lr_eixos_n(j, e[0] ?? 0, e[1] ?? 0, e[2] ?? 0, e[3] ?? 0);
      }
    m._lr_run(1, 1);
    const w = m._lr_w();
    const h = m._lr_h();
    let mudouTamanho = false;
    if (this.config.dinamico && w > 0 && h > 0 && (w !== this.info.largura || h !== this.info.altura)) {
      this.info = { ...this.info, largura: w, altura: h };
      this.quadro = new Uint32Array(w * h);
      mudouTamanho = true;
    }
    const fb = new Uint32Array(m.HEAPU8.buffer, m._lr_fb(), w * h);
    encaixarQuadro(fb, w, h, this.info.largura, this.info.altura, this.quadro);
    const audio = new Int16Array(m.HEAPU8.buffer, m._lr_audio(), m._lr_audio_n() * 2);
    return { audio, mudouTamanho };
  }

  reiniciar(): void {
    this.mod._lr_reset();
  }

  private resultado(r: number): boolean {
    return !!(this.mod._lr_ok ? this.mod._lr_ok() : r);
  }

  private salvarNoBuffer(): boolean {
    if (this.resultado(this.mod._lr_state_save(this.estadoBuf, this.tamEstado))) return true;
    // o tamanho do estado mudou depois que o jogo começou (FBNeo): pergunta de novo e tenta mais uma vez
    const n = this.mod._lr_state_size();
    if (n === this.tamEstado) return false;
    this.mod._free(this.estadoBuf);
    this.tamEstado = n;
    this.estadoBuf = this.mod._lr_alloc((n + 3) & ~3);
    return this.resultado(this.mod._lr_state_save(this.estadoBuf, this.tamEstado));
  }

  /** Savestate (bytes do núcleo, o mesmo que o `serializar` do antigo). */
  salvarEstado(): Uint8Array {
    if (!this.salvarNoBuffer()) throw new Error('o núcleo não conseguiu salvar o estado');
    return this.mod.HEAPU8.slice(this.estadoBuf, this.estadoBuf + this.tamEstado);
  }

  /** O estado salvo direto na memória do núcleo, como palavras de 32 bits (pro rebobinar comparar sem copiar). */
  estadoVivo(): Int32Array | null {
    if (!this.salvarNoBuffer()) return null;
    return new Int32Array(this.mod.HEAPU8.buffer, this.estadoBuf, (this.tamEstado + 3) >> 2);
  }

  carregarEstado(e: Uint8Array): void {
    if (e.length > this.tamEstado) {
      this.mod._free(this.estadoBuf);
      this.tamEstado = e.length;
      this.estadoBuf = this.mod._lr_alloc((e.length + 3) & ~3);
    }
    this.mod.HEAPU8.set(e, this.estadoBuf);
    if (!this.resultado(this.mod._lr_state_load(this.estadoBuf, e.length)))
      throw new Error('o núcleo não aceitou esse estado');
  }
}
