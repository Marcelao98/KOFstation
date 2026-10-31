import { usePausado } from '../hooks/usePausa';
import { usarJogo } from '../stores/jogo';

export function Status() {
  const { nome, medicao, jogo } = usarJogo();
  const pausado = usePausado();
  return (
    <footer id="status">
      <span id="st-jogo">{jogo ? nome : 'nenhum jogo'}</span>
      <span id="st-fps">{jogo ? `${pausado ? 'pausado · ' : ''}${medicao ? `${medicao.fps} fps` : ''}` : ''}</span>
    </footer>
  );
}
