import { acao } from '../app/acoes';
import { LATERAL } from '../app/menus';
import { usarTelas } from '../stores/telas';

export function Lateral() {
  const atual = usarTelas((t) => t.atual);
  const temJogo = usarTelas((t) => t.temJogo);
  return (
    <nav id="lateral" aria-label="navegação">
      <div className="lat-itens">
        {LATERAL.map((b, i) =>
          b === 'hr' ? (
            <hr key={i} />
          ) : (
            <button
              key={b.a}
              id={b.a === 'voltar-jogo' ? 'lat-jogo' : undefined}
              hidden={'soComJogo' in b && !temJogo}
              data-acao={b.a}
              title={b.dica}
              className={'tela' in b && b.tela === atual ? 'ativo' : undefined}
              onClick={() => acao(b.a)}
            >
              <i>{b.i}</i>
              <span>{b.t}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
