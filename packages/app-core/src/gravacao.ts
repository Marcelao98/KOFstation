// ⏺ Gravar o jogo (G.1): leva os pedaços do vídeo pro disco (`gravacao.parte`), um de cada vez e em ordem, e no fim
// dá o nome final (`gravacao.fim`). Um pedaço que falha (disco cheio, pasta sumiu) para tudo e avisa uma vez.
import type { Backend } from './backend';

export class EscritorDeGravacao {
  private fila: Promise<void> = Promise.resolve();
  private enviados = 0;
  private falha: Error | null = null;

  constructor(
    private readonly backend: Backend,
    readonly nome: string,
    /** chamado uma vez, no primeiro pedaço que falhou */
    private readonly aoFalhar: (e: Error) => void,
  ) {}

  /** quantos bytes já estão no disco */
  get bytes() {
    return this.enviados;
  }

  anexar(pedaco: Blob) {
    this.fila = this.fila.then(async () => {
      if (this.falha) return;
      const args = { nome: this.nome, offset: this.enviados };
      try {
        const b = this.backend;
        await (b.enviarArquivo
          ? b.enviarArquivo('gravacao.parte', args, pedaco)
          : b.enviarBinario('gravacao.parte', args, new Uint8Array(await pedaco.arrayBuffer())));
        this.enviados += pedaco.size;
      } catch (e) {
        this.falha = e instanceof Error ? e : new Error(String(e));
        this.aoFalhar(this.falha);
      }
    });
  }

  /** Espera os pedaços que faltam e fecha o arquivo. Devolve o caminho dentro da Kof Games. */
  async fechar(): Promise<string> {
    await this.fila;
    if (this.falha) throw this.falha;
    if (!this.enviados) throw new Error('a gravação ficou vazia (nenhum quadro chegou)');
    const r = await this.backend.chamar<{ path: string }>('gravacao.fim', { nome: this.nome });
    return r.path;
  }
}
