// ⏺ O selo de "gravando" no canto do palco, com o relógio. Clicar para a gravação (igual ao F10).
import { tempoGravando } from '@kof/domain';
import { useEffect, useState } from 'react';
import { usarGravacao } from '../stores/gravacao';

export function Gravando() {
  const { gravando, desde, ocupado, parar } = usarGravacao();
  const [agora, setAgora] = useState(() => performance.now());
  useEffect(() => {
    if (!gravando) return;
    const r = setInterval(() => setAgora(performance.now()), 500);
    return () => clearInterval(r);
  }, [gravando]);
  if (!gravando && !ocupado) return null;
  return (
    <button id="gravando" title="Parar a gravação (F10)" onClick={() => void parar()} disabled={!gravando}>
      {gravando ? `⏺ ${tempoGravando(agora - desde)}` : '💾 salvando…'}
    </button>
  );
}
