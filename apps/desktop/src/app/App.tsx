import { mensagemDoErro, obterInfo, paraBackendError, type Backend } from '@kof/app-core';
import type { AppInfo } from '@kof/contracts';
import { useEffect, useState } from 'react';

type Estado =
  { tipo: 'carregando' } | { tipo: 'ok'; info: AppInfo } | { tipo: 'erro'; codigo: string; detalhe: string };

export function App({ backend }: { backend: Backend }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  useEffect(() => {
    let vivo = true;
    obterInfo(backend).then(
      (info) => vivo && setEstado({ tipo: 'ok', info }),
      (e: unknown) => {
        const b = paraBackendError(e);
        if (vivo) setEstado({ tipo: 'erro', codigo: b.code, detalhe: b.message });
      },
    );
    return () => {
      vivo = false;
    };
  }, [backend]);

  return (
    <main className="janela" style={{ margin: 'auto', padding: 24, maxWidth: 520 }}>
      <h1>KOFstation</h1>
      {estado.tipo === 'carregando' && <p>Conectando…</p>}
      {estado.tipo === 'ok' && (
        <p data-testid="info">
          Versão {estado.info.version} · {estado.info.os} ({estado.info.arch})
        </p>
      )}
      {estado.tipo === 'erro' && (
        <p role="alert">
          {mensagemDoErro(estado.codigo)} <small>({estado.detalhe})</small>
        </p>
      )}
    </main>
  );
}
