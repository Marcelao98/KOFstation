// PlayStation e Nintendo 64 nativos no APK (M14.4): os núcleos ARM64 rodam no Java (Ps1Jogo/N64Jogo do antigo, as mesmas
// `.so`), desenham numa tela nativa POR CIMA da área do jogo e tocam o som direto. Esta classe é a "fachada" do
// `fachada()` do android.js do antigo, com a cara de sessão de jogo do app novo (a mesma de `JogoNativo`): manda os
// botões a cada ~16 ms (que também é o sinal de "jogando"; parou = menu aberto, a tela nativa some), a posição da área do
// jogo, o volume e o savestate. A imagem nunca passa pela página, então `eventos.quadro` não é chamado.
import type { InfoDoJogo } from './libretro';
import { mascaraLibretro, mascaraN64 } from './nucleos';
import type { ReplayDoBug } from './mensagens';

/** O que a casca Java expõe (window.KOFnesApk): <console>Nativo/Abrir/Pad/Area/Fechar/Reiniciar/Volume/Estado/CarregarEstado. */
export type ApkNativo = Record<string, (...a: never[]) => unknown>;

export interface AmbienteAndroid {
  apk: ApkNativo;
  /** onde o Java avisa que abriu (window.__ps1Pronto / __n64Pronto) */
  janela: Record<string, unknown>;
  /** o retângulo do canvas do jogo na tela (o Java põe a tela nativa nele) */
  area: () => { left: number; top: number; width: number; height: number } | null;
}

export interface OpcoesAndroid {
  sistema: 'ps1' | 'n64';
  nome: string;
  volume: number;
  mudo: boolean;
}

/** Empacota os 4 eixos (-32767..32767) em 4 bytes com sinal, como o `empacotar` do nucleo.js do antigo. */
export const empacotarEixos = (e: readonly number[]): number =>
  (((e[0] ?? 0) >> 8) & 255) |
  ((((e[1] ?? 0) >> 8) & 255) << 8) |
  ((((e[2] ?? 0) >> 8) & 255) << 16) |
  ((((e[3] ?? 0) >> 8) & 255) << 24);

const chamar = (apk: ApkNativo, nome: string, ...a: unknown[]): unknown =>
  (apk[nome] as (...x: unknown[]) => unknown)(...a);

export function apkTemNativo(apk: ApkNativo | undefined, c: 'ps1' | 'n64'): boolean {
  try {
    return !!apk && typeof apk[c + 'Nativo'] === 'function' && !!chamar(apk, c + 'Nativo');
  } catch {
    return false; // casca sem essa parte (ou a .so não carregou): o app usa o WebAssembly
  }
}

export class JogoNativoAndroid {
  readonly nativo = true;
  readonly android = true;
  info!: InfoDoJogo;
  comSom = true;
  descartados = 0;
  sobreNucleo: { nome: string; versao: string; placa?: string };
  private botoes = [0, 0, 0, 0];
  private eixos = [0, 0, 0, 0];
  private volume: number;
  private mudo: boolean;
  private pausado = false;
  private batida = 0;
  private relogio = 0;

  private constructor(
    private amb: AmbienteAndroid,
    private o: OpcoesAndroid,
  ) {
    this.volume = o.volume;
    this.mudo = o.mudo;
    this.sobreNucleo = {
      nome: o.sistema === 'ps1' ? 'PCSX-ReARMed (nativo, Android)' : 'Mupen64Plus-Next (nativo, Android)',
      versao: 'ARM64',
    };
  }

  /** Abre o jogo (o Java copia o CD ou cartucho do que a pessoa escolheu: pode demorar) e começa a mandar os botões. */
  static async abrir(amb: AmbienteAndroid, o: OpcoesAndroid): Promise<JogoNativoAndroid> {
    const c = o.sistema;
    const r = await new Promise<{ principal?: string; largura?: number; altura?: number; fps?: number }>(
      (ok, falha) => {
        amb.janela['__' + c + 'Pronto'] = (x: { erro?: string } | null) => {
          amb.janela['__' + c + 'Pronto'] = null;
          if (x && x.erro) falha(new Error(x.erro));
          else ok((x ?? {}) as { principal?: string });
        };
        try {
          chamar(amb.apk, c + 'Abrir', o.nome);
        } catch (e) {
          falha(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );
    const j = new JogoNativoAndroid(amb, o);
    j.info = {
      sistema: c,
      largura: r.largura ?? 320,
      altura: r.altura ?? 240,
      fps: r.fps ?? 59.94,
      taxaAudio: 32000,
      proporcao: 4 / 3,
    };
    j.relogio = setInterval(() => j.bater(), 16) as unknown as number;
    j.bater();
    return j;
  }

  private bater() {
    if (this.pausado) return; // parou de mandar = o Java entende "menu aberto" e esconde a tela nativa
    const c = this.o.sistema;
    if (this.batida++ % 30 === 0) {
      const a = this.amb.area();
      if (a) chamar(this.amb.apk, c + 'Area', a.left, a.top, a.width, a.height);
      chamar(this.amb.apk, c + 'Volume', this.mudo ? 0 : this.volume);
    }
    const bits = this.botoes[0] ?? 0;
    chamar(this.amb.apk, c + 'Pad', c === 'n64' ? mascaraN64(bits) : mascaraLibretro(bits), empacotarEixos(this.eixos));
  }

  botoesDo(jogador: number, bits: number) {
    this.botoes[jogador] = bits; // o celular joga com 1 jogador; o resto fica guardado e ignorado
  }
  eixosDo(jogador: number, e: readonly number[] | null) {
    if (jogador === 0) this.eixos = e ? [...e.slice(0, 4)] : [0, 0, 0, 0];
  }
  pausar(sim: boolean) {
    this.pausado = sim;
    if (!sim) this.bater();
  }
  turbo() {
    // sem turbo no nativo do celular (o antigo também não tinha)
  }
  reiniciar() {
    chamar(this.amb.apk, this.o.sistema + 'Reiniciar');
  }
  ajustarVolume(volume: number, mudo: boolean) {
    this.volume = volume;
    this.mudo = mudo;
    chamar(this.amb.apk, this.o.sistema + 'Volume', mudo ? 0 : volume);
  }
  salvarEstado(): Promise<Uint8Array> {
    const t = atob(String(chamar(this.amb.apk, this.o.sistema + 'Estado')));
    return Promise.resolve(Uint8Array.from(t, (ch) => ch.charCodeAt(0)));
  }
  carregarEstado(e: Uint8Array): Promise<void> {
    let t = '';
    for (let i = 0; i < e.length; i += 0x8000) t += String.fromCharCode(...e.subarray(i, i + 0x8000));
    if (!chamar(this.amb.apk, this.o.sistema + 'CarregarEstado', btoa(t)))
      return Promise.reject(new Error('o núcleo nativo não aceitou o estado'));
    return Promise.resolve();
  }
  /** O cartão de memória e o save do N64 ficam no Java (SavesNativos), não passam pela página. */
  lerSram(): Promise<Uint8Array | null> {
    return Promise.resolve(null);
  }
  escreverSram() {
    // nada: o Java guarda sozinho
  }
  mudarOpcoes() {
    // as opções do núcleo nativo do celular são as fixas da .so (ver Ps1Jogo.java)
  }
  configurarRebobinar(): void {
    // sem rebobinar no nativo
  }
  rebobinar(): void {
    // sem rebobinar no nativo
  }
  cacador(): void {
    // o caçador de bugs é do WebAssembly
  }
  replayDoBug(): Promise<ReplayDoBug> {
    return Promise.resolve({ estado: null, entradas: '', quadros: 0, agora: { estado: '', assinatura: 'nativo' } });
  }
  fechar() {
    clearInterval(this.relogio);
    this.relogio = 0;
    try {
      chamar(this.amb.apk, this.o.sistema + 'Fechar');
    } catch {
      // a casca já fechou o núcleo (o app saiu): nada a fazer
    }
  }
}
