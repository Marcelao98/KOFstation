import { useEffect, useRef, useState } from 'react';
import { acao } from '../app/acoes';
import { BlocoAparelhos } from './BlocoAparelhos';
import { usarRede } from '../stores/rede';
import { LATERAL } from '../app/menus';
import { usarTelas } from '../stores/telas';

export function Lateral() {
  const atual = usarTelas((t) => t.atual);
  const temJogo = usarTelas((t) => t.temJogo);
  const [aberto, setAberto] = useState(false);
  const online = usarRede((r) => r.aparelhos.filter((a) => a.online).length);
  const raiz = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    addEventListener('pointerdown', fora);
    addEventListener('keydown', esc);
    return () => {
      removeEventListener('pointerdown', fora);
      removeEventListener('keydown', esc);
    };
  }, [aberto]);
  return (
    <nav id="lateral" aria-label="navegação" ref={raiz}>
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
        <hr />
        <button
          id="lat-aparelhos"
          data-acao="arranjo"
          title="📡 Aparelhos: quem roda, onde aparece, quem controla"
          aria-expanded={aberto}
          className={aberto ? 'ativo' : undefined}
          onClick={() => setAberto((x) => !x)}
        >
          <i>📡</i>
          <span>Aparelhos{online ? ` · ${online + 1}` : ''}</span>
        </button>
      </div>
      {aberto ? (
        <div id="painel-aparelhos">
          <BlocoAparelhos fechar={() => setAberto(false)} />
        </div>
      ) : null}
    </nav>
  );
}
