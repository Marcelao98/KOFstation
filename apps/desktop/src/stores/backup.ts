// Backup .kofsave: fazer (baixa o arquivo) e trazer (escolher ou arrastar). A janela tem as duas caixinhas do antigo
// ("com savestates" e "trazer configurações").
import { ehPacote } from '@kof/domain';
import { exportarBackup, importarBackup, resumoDoImport, type ResumoImport } from '@kof/app-core';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { servicos } from './servicos';

export interface EstadoBackup {
  aberto: boolean;
  comEstados: boolean;
  comConfig: boolean;
  abrir: () => void;
  fechar: () => void;
  mudar: (p: Partial<Pick<EstadoBackup, 'comEstados' | 'comConfig'>>) => void;
  exportar: () => Promise<void>;
  importar: (bytes: Uint8Array, comConfig?: boolean) => Promise<ResumoImport | null>;
  escolherArquivo: () => void;
}

/** Quem quer saber de saves trazidos (o jogo aberto recarrega o dele: M5.1). */
export const aoTrazerSaves = new Set<(chaves: string[]) => void>();

const tamanho = (n: number) =>
  n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

function baixar(nome: string, u8: Uint8Array) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u8 as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export const usarBackup = create<EstadoBackup>()((set, get) => ({
  aberto: false,
  comEstados: false,
  comConfig: false,
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false }),
  mudar: (p) => set(p),
  exportar: async () => {
    try {
      await config().gravarJa();
      const { nome, bytes } = await exportarBackup(servicos().armazem, config(), get().comEstados);
      baixar(nome, bytes);
      usarAvisos.getState().avisar(`💾 backup pronto (${tamanho(bytes.length)})`, 3000);
    } catch (e) {
      usarAvisos.getState().avisarErro(`não consegui fazer o backup: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
  importar: async (bytes, comConfig = get().comConfig) => {
    try {
      if (!ehPacote(bytes)) throw new Error('isso não é um pacote .kofsave');
      const r = await importarBackup(servicos().armazem, config(), bytes, comConfig);
      await config().gravarJa();
      if (r.chavesTrazidas.length) aoTrazerSaves.forEach((f) => f(r.chavesTrazidas));
      usarAvisos.getState().avisar(resumoDoImport(r), 6000);
      return r;
    } catch (e) {
      usarAvisos.getState().avisar(`não consegui trazer o backup: ${e instanceof Error ? e.message : String(e)}`, 5000);
      return null;
    }
  },
  escolherArquivo: () => {
    const e = document.createElement('input');
    e.type = 'file';
    e.accept = '.kofsave,application/octet-stream';
    e.onchange = async () => {
      const f = e.files?.[0];
      if (f) await get().importar(new Uint8Array(await f.arrayBuffer()));
    };
    e.click();
  },
}));
