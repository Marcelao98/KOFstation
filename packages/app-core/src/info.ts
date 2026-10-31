import { CONTRACT_VERSION, ehAppInfo, type AppInfo } from '@kof/contracts';
import { BackendError, ERRO_RESPOSTA_INVALIDA, paraBackendError, type Backend } from './backend';

/** Caso de uso: pergunta ao backend quem ele é e confere se fala a mesma versão do contrato. */
export async function obterInfo(backend: Backend): Promise<AppInfo> {
  let v: unknown;
  try {
    v = await backend.chamar<unknown>('app.info');
  } catch (e) {
    throw paraBackendError(e);
  }
  if (!ehAppInfo(v)) throw new BackendError({ code: ERRO_RESPOSTA_INVALIDA, message: 'app.info fora do formato' });
  if (v.contractVersion !== CONTRACT_VERSION)
    throw new BackendError({
      code: 'CONTRACT_MISMATCH',
      message: `contrato ${v.contractVersion}, esperado ${CONTRACT_VERSION}`,
      details: { recebido: v.contractVersion, esperado: CONTRACT_VERSION },
    });
  return v;
}
