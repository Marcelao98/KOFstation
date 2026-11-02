import { usePausado } from '../hooks/usePausa';
import { usarJogo } from '../stores/jogo';
import { usarJukebox } from '../stores/jukebox';
import { usarTelas } from '../stores/telas';
import { acao } from '../app/acoes';

export function Status() {
  const { nome, medicao, jogo } = usarJogo();
  const pausado = usePausado();
  return (
    <footer id="status">
      <span id="st-jogo">{jogo ? nome : 'nenhum jogo'}</span>
      <MiniJuke />
      <span id="st-fps">{jogo ? `${pausado ? 'pausado · ' : ''}${medicao ? `${medicao.fps} fps` : ''}` : ''}</span>
    </footer>
  );
}

/** O mini-player da jukebox na barra de baixo (some com a jukebox aberta e com a música do Início). */
function MiniJuke() {
  const { lista, atual, tocando, interna, info } = usarJukebox();
  const naJuke = usarTelas((t) => t.atual === 'jukebox');
  const f = lista[atual];
  if (!info || interna || naJuke || !f) return null;
  return (
    <span id="st-juke">
      <span id="st-juke-nome">{`🎵 ${f.titulo} · ${f.jogo}`}</span>{' '}
      <button className="x" id="st-juke-tocar" onClick={() => acao('jk-tocar')}>
        {tocando ? '⏸' : '▶'}
      </button>
      <button className="x" onClick={() => acao('jk-prox')}>
        ⏭
      </button>
      <button className="x" title="abrir a jukebox" onClick={() => acao('jukebox')}>
        ☰
      </button>
      <button className="x" title="parar" onClick={() => acao('jk-parar')}>
        ✕
      </button>
    </span>
  );
}
