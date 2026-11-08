// O "🔄 Procurar atualização" do menu e a procura sozinha depois de abrir (o procurarAtualizacao do antigo).
import { avisoDaAtualizacao, mensagemDoErro, paraBackendError, procurarAtualizacao } from '@kof/app-core';
import { usarAvisos } from './avisos';
import { servicos } from './servicos';

let procurando = false;

export async function procurar(manual: boolean): Promise<void> {
  const avisos = usarAvisos.getState();
  if (procurando) {
    if (manual) avisos.avisar('🔄 já estou procurando atualização…', 3000);
    return;
  }
  procurando = true;
  if (manual) avisos.avisar('🔄 procurando atualização…', 30000);
  try {
    const s = await procurarAtualizacao(servicos().backend);
    const a = avisoDaAtualizacao(s, manual);
    if (a?.erro) avisos.avisarErro(a.texto);
    else if (a) avisos.avisar(a.texto, a.ms);
    else if (manual) avisos.fechar();
  } catch (e) {
    const b = paraBackendError(e);
    if (manual) avisos.avisarErro(`${mensagemDoErro(b.code)} (${b.message})`);
  } finally {
    procurando = false;
  }
}

/** Uns segundos depois de abrir, como o antigo (10 s): não atrapalha a abertura do app nem do jogo. */
export function procurarDepoisDeAbrir(ms = 10000): void {
  setTimeout(() => void procurar(false), ms);
}
