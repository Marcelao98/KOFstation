// Configurações do app num arquivo do Rust (<dados>/config/config.json), com os nomes de chave do antigo. Leitura
// síncrona da memória; gravação junta as mudanças e grava 250 ms depois (ou na hora, com `gravarJa`).
import type { Backend } from './backend';
import { registrar, textoDoErro } from './log';

export interface DocConfig {
  versao: number;
  valores: Record<string, string>;
}

export class Configuracao {
  private valores: Record<string, string> = {};
  private relogio: ReturnType<typeof setTimeout> | undefined;
  private gravando: Promise<void> = Promise.resolve();
  private ouvintes = new Set<(k: string) => void>();

  constructor(private b: Backend | null) {}

  /** Lê o arquivo. Na primeira vez (arquivo vazio), traz o que as versões M1–M3 deixaram no navegador. */
  async carregar(migrar?: () => Record<string, string>): Promise<void> {
    if (!this.b) return;
    const d = await this.b.chamar<DocConfig>('config.read', { doc: 'config' });
    this.valores = { ...d.valores };
    if (!Object.keys(this.valores).length && migrar) {
      const velhos = migrar();
      if (Object.keys(velhos).length) {
        this.valores = velhos;
        this.agendar();
      }
    }
  }

  ler(k: string): string | null {
    return this.valores[k] ?? null;
  }
  numero(k: string, padrao: number): number {
    const v = this.valores[k];
    return v === undefined || v === '' || !Number.isFinite(Number(v)) ? padrao : Number(v);
  }
  guardar(k: string, v: string | number): void {
    const t = String(v);
    if (this.valores[k] === t) return;
    this.valores[k] = t;
    this.agendar();
    this.ouvintes.forEach((f) => f(k));
  }
  apagar(k: string): void {
    if (!(k in this.valores)) return;
    this.valores = Object.fromEntries(Object.entries(this.valores).filter(([x]) => x !== k));
    this.agendar();
    this.ouvintes.forEach((f) => f(k));
  }
  /** Todas as chaves (com um prefixo, opcional). */
  chaves(prefixo = ''): string[] {
    return Object.keys(this.valores).filter((k) => k.startsWith(prefixo));
  }
  todas(): Record<string, string> {
    return { ...this.valores };
  }
  ouvir(f: (k: string) => void): () => void {
    this.ouvintes.add(f);
    return () => this.ouvintes.delete(f);
  }

  private agendar() {
    clearTimeout(this.relogio);
    this.relogio = setTimeout(() => void this.gravarJa(), 250);
  }

  /** Grava agora (fechar a janela, antes de exportar backup). */
  gravarJa(): Promise<void> {
    clearTimeout(this.relogio);
    const b = this.b;
    if (!b) return Promise.resolve();
    const dados = { versao: 1, valores: { ...this.valores } };
    this.gravando = this.gravando.then(() =>
      b.chamar<null>('config.write', { doc: 'config', data: dados }).then(
        () => undefined,
        (e: unknown) => registrar('error', 'config', `configuração não gravada: ${textoDoErro(e)}`),
      ),
    );
    return this.gravando;
  }
}
