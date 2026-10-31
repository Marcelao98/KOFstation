// A barra de menus do antigo (#menu): clicar no título abre; com um aberto, passar o mouse troca; clicar fora fecha.
import { useEffect, useState } from 'react';
import { acao } from '../app/acoes';
import { MENUS } from '../app/menus';

export function Menu() {
  const [aberto, setAberto] = useState<number | null>(null);
  useEffect(() => {
    if (aberto === null) return;
    const fechar = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('#menu')) setAberto(null);
    };
    addEventListener('click', fechar);
    return () => removeEventListener('click', fechar);
  }, [aberto]);

  return (
    <nav id="menu">
      {MENUS.map((m, i) => (
        <div
          key={m.titulo}
          className={'m' + (aberto === i ? ' aberto' : '')}
          onMouseEnter={() => aberto !== null && setAberto(i)}
        >
          <button
            data-acao={m.acao}
            onClick={() => {
              if (m.acao) {
                setAberto(null);
                acao(m.acao);
              } else setAberto(aberto === i ? null : i);
            }}
          >
            {m.titulo}
          </button>
          {m.itens.length > 0 && (
            <div className="sub">
              {m.itens.map((it, j) =>
                it === 'hr' ? (
                  <hr key={j} />
                ) : (
                  <button
                    key={j}
                    data-acao={it.a}
                    className={it.pc ? 'so-pc' : undefined}
                    onClick={() => {
                      setAberto(null);
                      acao(it.a, it.v);
                    }}
                  >
                    {it.t}
                    {it.k && <kbd>{it.k}</kbd>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
