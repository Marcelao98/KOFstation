// Painel de desempenho (F3), como o #desempenho do antigo: quadros por segundo e de onde vem o atraso.
import { usarJogo } from '../stores/jogo';

export function Desempenho() {
  const { desempenho, medicao, jogo } = usarJogo();
  if (!desempenho || !jogo || !medicao) return null;
  const m = medicao;
  return (
    <div id="desempenho">
      {m.fps} fps · núcleo {m.nucleoMs} ms · engasgos {m.atrasos}/s · falta de som {m.faltasDeSom} · som na fila{' '}
      {m.somNaFilaMs} ms
      {jogo.comSom ? '' : ' · sem som'}
    </div>
  );
}
