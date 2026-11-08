// Medidor da sessão de jogo (M16): junta os quadros que o processo nativo / o Worker mandam a cada segundo
// (`porQuadro`) com o tempo que a página levou pra desenhar cada um, guarda os últimos 600 e calcula o resumo do
// segundo (domain/desempenho.ts). O F3 e o modo diagnóstico leem daqui.
import {
  HistoricoQuadros,
  juntarPagina,
  lerPorQuadro,
  resumir,
  suavizarFps,
  type CpuLinha,
  type RegistroQuadro,
  type Resumo,
} from '@kof/domain';
import type { Medicao } from '@kof/engine';

export interface LeituraDeDesempenho {
  /** os quadros do segundo que acabou de chegar (já com o desenho da página) */
  quadros: RegistroQuadro[];
  resumo: Resumo;
  fpsSuave: number;
  cpu: CpuLinha[];
}

/** Desenhos guardados à espera do bloco do segundo: mais que isso é quadro que nunca vai ter par (descarta). */
const MAX_DESENHOS = 1200;

export class MedidorDaSessao {
  readonly historico = new HistoricoQuadros();
  private desenhos: number[] = [];
  private pendente = false;
  private fps = 0;

  /** @param fpsDoJogo os quadros por segundo do console (o tempo de um quadro sai daqui; pode mudar depois de abrir) */
  constructor(public fpsDoJogo = 60) {}

  get periodoMs() {
    return 1000 / (this.fpsDoJogo > 0 ? this.fpsDoJogo : 60);
  }

  /** Chegou um quadro na página. Se o anterior não foi desenhado (chegou outro antes), ele conta como pulado. */
  chegou() {
    if (this.pendente) this.anotarDesenho(0);
    this.pendente = true;
  }

  /** A página desenhou o último quadro que chegou, em `ms`. */
  desenhou(ms: number) {
    if (!this.pendente) return; // redesenho do mesmo quadro (chiado/moldura): não é quadro novo
    this.pendente = false;
    this.anotarDesenho(Math.max(0.001, ms));
  }

  private anotarDesenho(ms: number) {
    this.desenhos.push(ms);
    if (this.desenhos.length > MAX_DESENHOS) this.desenhos.splice(0, this.desenhos.length - MAX_DESENHOS);
  }

  /** O bloco do segundo chegou. null = medição sem quadros (versão antiga do processo, ou pausado). */
  medicao(m: Medicao): LeituraDeDesempenho | null {
    if (!m.porQuadro?.length) return null;
    let quadros: RegistroQuadro[];
    try {
      quadros = lerPorQuadro(m.porQuadro);
    } catch {
      return null; // bloco fora do formato: o F3 de médias continua; o próximo bloco tenta de novo
    }
    juntarPagina(quadros, this.desenhos);
    const anterior = this.historico.ultimo;
    // o processo reabriu (o relógio dele voltou pro zero): não compara com o bloco velho
    const continua = anterior && quadros[0] && quadros[0].t >= anterior.t ? anterior : undefined;
    if (!continua) this.historico.limpar();
    this.historico.anotar(quadros);
    const resumo = resumir(quadros, this.periodoMs, continua);
    this.fps = suavizarFps(this.fps, resumo.fps);
    return { quadros, resumo, fpsSuave: this.fps, cpu: m.cpu ?? [] };
  }
}
