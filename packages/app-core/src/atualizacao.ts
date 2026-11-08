// Caso de uso do atualizador (M15.1; o procurarAtualizacao do antigo, app.js 1796–1831). O Rust baixa a versão nova
// (manifesto assinado) e ela entra na próxima abertura; aqui é só perguntar e dizer ao jogador o que aconteceu.
import { paraBackendError, type Backend } from './backend';

export interface SituacaoAtualizacao {
  versao: string;
  commit: string;
  ligado: boolean;
  motivo?: string;
  situacao: 'parado' | 'procurando' | 'emDia' | 'pronta' | 'erro';
  nova?: string;
  baixados: number;
  bytes: number;
  erro?: { code: string; message: string };
}

const SITUACOES = ['parado', 'procurando', 'emDia', 'pronta', 'erro'];
function ehSituacao(v: unknown): v is SituacaoAtualizacao {
  const s = v as SituacaoAtualizacao;
  return !!s && typeof s.ligado === 'boolean' && typeof s.versao === 'string' && SITUACOES.includes(s.situacao);
}

/** Pede pra procurar e espera terminar (o Rust baixa numa linha separada; aqui pergunta a cada `intervalo` ms). */
export async function procurarAtualizacao(
  backend: Backend,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  intervalo = 1500,
): Promise<SituacaoAtualizacao> {
  let s: unknown;
  try {
    s = await backend.chamar<unknown>('app.atualizacao', { procurar: true });
    while (ehSituacao(s) && s.situacao === 'procurando') {
      await esperar(intervalo);
      s = await backend.chamar<unknown>('app.atualizacao', {});
    }
  } catch (e) {
    throw paraBackendError(e);
  }
  if (!ehSituacao(s))
    throw paraBackendError({ code: 'BACKEND_BAD_RESPONSE', message: 'app.atualizacao fora do formato' });
  return s;
}

/** O aviso pro jogador (texto e quanto tempo fica), ou null quando não precisa dizer nada (procura sozinha em dia). */
export function avisoDaAtualizacao(
  s: SituacaoAtualizacao,
  manual: boolean,
): { texto: string; ms: number; erro?: boolean } | null {
  switch (s.situacao) {
    case 'pronta':
      return {
        texto: `🆕 versão nova do KOFstation baixada${s.nova ? ` (${s.nova})` : ''}: feche e abra o KOFstation pra usar`,
        ms: 8000,
      };
    case 'emDia':
      return manual ? { texto: `✔ você está na versão mais nova (${s.versao})`, ms: 4000 } : null;
    case 'erro':
      return manual
        ? { texto: `não consegui atualizar agora: ${s.erro?.message ?? 'erro desconhecido'}`, ms: 6000, erro: true }
        : null;
    default:
      return manual && !s.ligado
        ? {
            texto: `🔄 atualizador desligado: ${s.motivo ?? 'sem motivo'}${s.versao ? ` (versão ${s.versao})` : ''}`,
            ms: 5000,
          }
        : null;
  }
}
