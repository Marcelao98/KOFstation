// Modo diagnóstico (M16.3): grava a sessão de jogo em <dados>/diagnostico/<sessão>/ pelo backend (`diag.*`). Cada
// segundo de medição vira linhas de CSV num buffer; a cada 5 s os buffers vão em lote (nada trava o jogo). Ao fechar:
// o log do processo nativo e o resumo.txt. O formato das linhas e o resumo são do domain/diagnostico.ts.
import {
  AcumuladorDaSessao,
  CABECALHO_ENGASGOS,
  CABECALHO_QUADROS,
  cabecalhoSegundos,
  linhaSegundo,
  linhasEngasgos,
  linhasQuadros,
  nomeDaSessao,
  textoDoResumo,
  type ResumoDaSessao,
} from '@kof/domain';
import type { Backend } from './backend';
import type { LeituraDeDesempenho } from './desempenho';
import { registrar } from './log';

/** Arquivos que a página escreve aos pedaços. */
type Arquivo = 'quadros.csv' | 'segundos.csv' | 'engasgos.csv' | 'log.txt' | 'resumo.txt';

export interface SobreASessao {
  jogo: string;
  sistema: string;
  nucleo: string;
  versaoDoNucleo: string;
  nativo: boolean;
  /** tamanho do jogo (bytes); o caminho nunca vai */
  tamanho: number;
  fps: number;
  opcoes: Record<string, string>;
  /** placa de vídeo pela página (WebGL) e o navegador */
  pagina: { navegador: string; placa: string | null };
  /** placa de vídeo e driver vistos pelo núcleo nativo (GL_RENDERER/GL_VERSION) */
  placaDoNucleo?: string;
  kofstation: string;
}

export interface SessaoGravada {
  sessao: string;
  bytes: number;
  quando: number;
  resumo: string | null;
}

/** De quanto em quanto tempo os buffers vão pro disco. */
export const LOTE_MS = 5000;

export class GravadorDiagnostico {
  private buf = new Map<Arquivo, string[]>();
  private acc = new AcumuladorDaSessao();
  private t0: number | null = null;
  private segundos = 0;
  private colunasCpu: string[] | null = null;
  private cheio = false;
  private fechado = false;
  private ultimoLote = 0;
  private gravando: Promise<void> = Promise.resolve();

  private constructor(
    private backend: Backend,
    readonly sessao: string,
    private sobre: SobreASessao,
    private agora: () => number,
  ) {
    this.buf.set('quadros.csv', [CABECALHO_QUADROS]);
    this.buf.set('engasgos.csv', [CABECALHO_ENGASGOS]);
  }

  /** Abre a sessão no disco (com a máquina e o jogo no sessao.json). */
  static async abrir(
    backend: Backend,
    sobre: SobreASessao,
    quando = new Date(),
    agora: () => number = () => Date.now(),
  ): Promise<GravadorDiagnostico> {
    const maquina = await backend.chamar<Record<string, unknown>>('diag.maquina');
    const sessaoJson = {
      formato: 'kof-diagnostico',
      versao: 1,
      quando: quando.toISOString(),
      kofstation: sobre.kofstation,
      maquina: {
        ...maquina,
        navegador: sobre.pagina.navegador,
        placaDeVideoDaPagina: sobre.pagina.placa,
        placaDeVideoDoNucleo: sobre.placaDoNucleo ?? null,
      },
      jogo: { nome: sobre.jogo, sistema: sobre.sistema, tamanho: sobre.tamanho, fps: sobre.fps },
      nucleo: { nome: sobre.nucleo, versao: sobre.versaoDoNucleo, nativo: sobre.nativo },
      opcoes: sobre.opcoes,
    };
    const r = await backend.chamar<{ sessao: string }>('diag.abrir', {
      nome: nomeDaSessao(quando, sobre.jogo),
      sessao: sessaoJson,
    });
    return new GravadorDiagnostico(backend, r.sessao, sobre, agora);
  }

  get periodoMs() {
    return 1000 / (this.sobre.fps > 0 ? this.sobre.fps : 60);
  }

  get lotado() {
    return this.cheio;
  }

  private por(a: Arquivo, linhas: string[]) {
    if (!linhas.length) return;
    const b = this.buf.get(a);
    if (b) b.push(...linhas);
    else this.buf.set(a, [...linhas]);
  }

  /** Um segundo de medição (o MedidorDaSessao já juntou o desenho da página). */
  anotar(l: LeituraDeDesempenho) {
    if (this.fechado || this.cheio || !l.quadros.length) return;
    this.t0 ??= l.anterior?.t ?? l.quadros[0]?.t ?? 0;
    this.acc.anotar(l.quadros, l.resumo.engasgos, l.anterior);
    this.acc.anotarCpu(l.cpu);
    // as colunas de CPU ficam fixas no 1º segundo que tiver CPU (ou no 1º segundo, se não tiver: o WebAssembly)
    if (!this.colunasCpu) {
      this.colunasCpu = [...this.acc.linhasCpu];
      this.por('segundos.csv', [cabecalhoSegundos(this.colunasCpu)]);
    }
    this.segundos++;
    this.por('quadros.csv', linhasQuadros(l.quadros, this.t0, l.anterior));
    this.por('engasgos.csv', linhasEngasgos(l.resumo.engasgos, this.t0));
    this.por('segundos.csv', [linhaSegundo(this.segundos, l.resumo, l.cpu, this.colunasCpu)]);
    const agora = this.agora();
    if (agora - this.ultimoLote >= LOTE_MS) {
      this.ultimoLote = agora;
      void this.descarregar();
    }
  }

  /** Manda o que estiver nos buffers (um pedido por arquivo, em fila: a ordem das linhas não se mistura). */
  descarregar(): Promise<void> {
    const lote = [...this.buf].filter(([, l]) => l.length);
    this.buf.clear();
    this.gravando = this.gravando.then(async () => {
      for (const [arquivo, linhas] of lote) {
        if (this.cheio) return;
        try {
          const r = await this.backend.enviarBinario<{ cheio: boolean }>(
            'diag.anotar',
            { sessao: this.sessao, arquivo },
            new TextEncoder().encode(linhas.join('\n') + '\n'),
          );
          if (r.cheio) {
            this.cheio = true;
            registrar('warn', 'diagnostico', `sessão ${this.sessao} chegou no limite de tamanho: parei de gravar`);
          }
        } catch (e) {
          // disco cheio ou backend fora: o jogo segue; o resumo no fim diz o que deu
          registrar('warn', 'diagnostico', `não gravei ${arquivo}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    });
    return this.gravando;
  }

  resumo(): ResumoDaSessao {
    return this.acc.resumo();
  }

  /** Fecha: grava o resto, o log do processo e o resumo.txt. Devolve o texto do resumo. */
  async fechar(log: string[] = []): Promise<string> {
    if (this.fechado) return '';
    this.fechado = true;
    if (log.length) this.por('log.txt', log);
    await this.descarregar();
    const texto =
      textoDoResumo(this.acc.resumo(), {
        jogo: this.sobre.jogo,
        sistema: this.sobre.sistema,
        nucleo: this.sobre.nucleo,
        periodoMs: this.periodoMs,
        opcoes: this.sobre.opcoes,
      }) + (this.cheio ? '\n(a sessão chegou no limite de 20 MB: o fim não foi gravado quadro a quadro)\n' : '');
    try {
      await this.backend.enviarBinario(
        'diag.anotar',
        { sessao: this.sessao, arquivo: 'resumo.txt', trocar: true },
        new TextEncoder().encode(texto),
      );
    } catch (e) {
      registrar('warn', 'diagnostico', `não gravei o resumo: ${e instanceof Error ? e.message : String(e)}`);
    }
    return texto;
  }
}

export const listarDiagnosticos = (b: Backend) => b.chamar<SessaoGravada[]>('diag.listar');
export const exportarDiagnosticos = (b: Backend, sessoes: string[]) => b.lerBinario('diag.exportar', { sessoes });
