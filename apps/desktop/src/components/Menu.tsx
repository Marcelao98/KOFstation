// A barra de menus do antigo (#menu): clicar no título abre; com um aberto, passar o mouse troca; clicar fora fecha.
import { useEffect, useState } from 'react';
import { acao } from '../app/acoes';
import { MENUS } from '../app/menus';
import { INICIO, usarJukebox } from '../stores/jukebox';
import { usarBug } from '../stores/bug';

export function Menu() {
  const [aberto, setAberto] = useState<number | null>(null);
  const musica = usarJukebox((j) => j.escolhaInicio);
  const cacador = usarBug((b) => b.cacador);
  const rotulo = (a: string, t: string) =>
    a === 'musica-inicio'
      ? 'Música no Início: ' + (INICIO.find(([k]) => k === musica)?.[1] ?? '')
      : a === 'cacador-toggle'
        ? 'Caçador de bugs: ' + (cacador ? 'ligado' : 'desligado')
        : t;
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
                    {rotulo(it.a, it.t)}
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
