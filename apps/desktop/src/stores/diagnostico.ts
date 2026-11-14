// 🩺 Modo diagnóstico (M16.3, docs/DIAGNOSTICO.md): ligado, cada jogo aberto grava uma sessão (quadros, segundos,
// engasgos, máquina, opções, log) em <dados>/diagnostico/; ao fechar, o resumo aparece num aviso. A janela (Ajuda →
// 🩺 Modo diagnóstico) liga e desliga e exporta as sessões num .zip pra mandar.
import {
  exportarDiagnosticos,
  GravadorDiagnostico,
  listarDiagnosticos,
  registrar,
  textoDoErro,
  type SessaoGravada,
} from '@kof/app-core';
import { SISTEMAS } from '@kof/domain';
import { create } from 'zustand';
import { usarApp } from './app';
import { usarAvisos } from './avisos';
import { config } from './config';
import { jogoAbertoAgora, logDoNativo, opcoesEmUso, sobreONucleo, usarJogo } from './jogo';
import { servicos } from './servicos';

export interface Diagnostico {
  ligado: boolean;
  aberto: boolean;
  sessoes: SessaoGravada[];
  /** sessão gravando agora (null = nenhuma) */
  gravando: string | null;
  alternar: () => void;
  abrir: () => void;
  fechar: () => void;
  carregar: () => Promise<void>;
  exportar: (sessoes: string[]) => Promise<void>;
  /** F9 com o modo ligado: baixa o .zip da sessão de agora (ou da última) e devolve o nome do arquivo */
  exportarPraBug: () => Promise<string | null>;
}

let gravador: GravadorDiagnostico | null = null;

/** A placa de vídeo que a página usa (WebGL), pro sessao.json. */
function placaDaPagina(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof r === 'string' ? r : null;
  } catch {
    return null; // sem WebGL: o relatório vai sem a placa da página
  }
}

export function baixar(bytes: Uint8Array, nome: string, tipo: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: tipo }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export const usarDiagnostico = create<Diagnostico>()((set, get) => ({
  ligado: config().ler('diagnostico') === '1',
  aberto: false,
  sessoes: [],
  gravando: null,
  alternar: () => {
    const ligado = !get().ligado;
    config().guardar('diagnostico', ligado ? '1' : '0');
    set({ ligado });
    usarAvisos
      .getState()
      .avisar(
        ligado
          ? '🩺 Modo diagnóstico ligado: o próximo jogo aberto é gravado (o que está aberto, se reabrir)'
          : '🩺 Modo diagnóstico desligado',
        4000,
      );
    if (!ligado) void pararGravacao();
  },
  abrir: () => {
    set({ aberto: true });
    void get().carregar();
  },
  fechar: () => set({ aberto: false }),
  carregar: async () => {
    try {
      set({ sessoes: await listarDiagnosticos(servicos().backend) });
    } catch (e) {
      usarAvisos.getState().avisarErro(`não consegui listar os diagnósticos: ${textoDoErro(e)}`);
    }
  },
  exportarPraBug: async () => {
    if (!get().ligado) return null;
    await gravador?.descarregar();
    const sessao = get().gravando ?? (await listarDiagnosticos(servicos().backend))[0]?.sessao;
    if (!sessao) return null;
    const zip = await exportarDiagnosticos(servicos().backend, [sessao]);
    const nome = `kofdiagnostico-${sessao}.zip`;
    baixar(zip, nome, 'application/zip');
    return nome;
  },
  exportar: async (sessoes) => {
    if (!sessoes.length) return;
    try {
      await gravador?.descarregar(); // a sessão de agora vai com o que já mediu
      const zip = await exportarDiagnosticos(servicos().backend, sessoes);
      const data = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      baixar(zip, `kofdiagnostico-${data}.zip`, 'application/zip');
      usarAvisos.getState().avisar('🩺 relatório baixado (pasta Downloads): é esse .zip que você me manda', 6000);
    } catch (e) {
      usarAvisos.getState().avisarErro(`não consegui exportar o diagnóstico: ${textoDoErro(e)}`);
    }
  },
}));

async function comecarGravacao() {
  const j = usarJogo.getState();
  if (!j.jogo || !j.info) return;
  const jogo = j.jogo;
  const aberto = jogoAbertoAgora();
  const sis = j.info.sistema;
  const nucleo = sobreONucleo();
  try {
    const g = await GravadorDiagnostico.abrir(servicos().backend, {
      jogo: j.registro?.titulo || j.nome,
      sistema: SISTEMAS.find((s) => s.id === sis)?.nome ?? sis,
      nucleo: nucleo.nome,
      versaoDoNucleo: nucleo.versao,
      nativo: nucleo.nativo,
      tamanho: j.registro?.tamanho ?? aberto?.rom.length ?? 0,
      fps: j.info.fps,
      opcoes: opcoesEmUso(sis, usarJogo.getState().registro?.id),
      pagina: { navegador: navigator.userAgent, placa: placaDaPagina() },
      kofstation: usarApp.getState().info?.version ?? '?',
      ...(nucleo.placa ? { placaDoNucleo: nucleo.placa } : {}),
    });
    // trocou de jogo enquanto abria: essa sessão já nasce fechada
    if (usarJogo.getState().jogo !== jogo) {
      await g.fechar();
      return;
    }
    gravador = g;
    usarDiagnostico.setState({ gravando: g.sessao });
  } catch (e) {
    registrar('warn', 'diagnostico', `não abri a sessão de diagnóstico: ${textoDoErro(e)}`);
    usarAvisos.getState().avisarErro(`🩺 diagnóstico não gravou: ${textoDoErro(e)}`);
  }
}

async function pararGravacao(nativo = false) {
  const g = gravador;
  if (!g) return;
  gravador = null;
  usarDiagnostico.setState({ gravando: null });
  const log = nativo ? await logDoNativo() : [];
  const texto = await g.fechar(log);
  // o resumo em 3 linhas no aviso (o resto está no resumo.txt)
  const linhas = texto.split('\n').slice(2, 5).join(' · ');
  if (linhas) usarAvisos.getState().avisar(`🩺 ${linhas}`, 9000);
  if (usarDiagnostico.getState().aberto) void usarDiagnostico.getState().carregar();
}

// jogo novo: fecha a sessão do anterior e, com o modo ligado, abre a dele; cada segundo medido vai pro gravador
let eraNativo = false;
usarJogo.subscribe((s, a) => {
  if (s.jogo !== a.jogo) {
    void pararGravacao(eraNativo).then(() => {
      eraNativo = sobreONucleo().nativo;
      if (s.jogo && usarDiagnostico.getState().ligado) void comecarGravacao();
    });
  }
  if (s.leitura && s.leitura !== a.leitura) gravador?.anotar(s.leitura);
});
