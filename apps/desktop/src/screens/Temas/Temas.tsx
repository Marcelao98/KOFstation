// Galeria de temas (#temas) por cima da tela atual, com véu: passar o mouse/foco experimenta, clicar escolhe, sair sem
// escolher volta ao de antes. Busca sem acento e categorias, como no antigo.
import { contarCategorias, nomeDoTema, temasFiltrados } from '@kof/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { usarAvisos } from '../../stores/avisos';
import { usarPrefs } from '../../stores/prefs';
import { usarShowcase } from '../../stores/showcase';
import { usarTelas } from '../../stores/telas';

export function Temas() {
  const { tema, temaNaTela, escolherTema, experimentarTema, desfazerExperimento } = usarPrefs();
  const fechar = usarTelas((t) => t.fecharTemas);
  const [cat, setCat] = useState('todos');
  const [busca, setBusca] = useState('');
  const grupos = useMemo(() => temasFiltrados(cat, busca), [cat, busca]);
  const cats = useMemo(() => contarCategorias(busca), [busca]);
  const grade = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = grade.current?.querySelector<HTMLElement>(`.previa[data-tema="${tema}"]`);
    b?.focus({ preventScroll: true });
    b?.scrollIntoView?.({ block: 'nearest' });
    return () => usarPrefs.getState().desfazerExperimento(); // fechou sem escolher: volta o tema de antes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir/fechar a galeria
  }, []);

  const escolher = (id: string) => {
    escolherTema(id);
    fechar();
    usarAvisos.getState().avisar('🎨 tema: ' + (nomeDoTema(id) ?? id));
  };
  const showcase = (ms: number) => {
    const lista = grupos.flatMap(([, l]) => l);
    fechar();
    const telas = usarTelas.getState();
    if (telas.atual === 'jogo' && !telas.temJogo) telas.abrir('home');
    usarShowcase.getState().iniciar(lista, ms);
  };

  return (
    <>
      <div id="veu" onClick={fechar} />
      <section id="temas" className="janela" aria-label="galeria de temas">
        <div className="titulo-j">
          <span>
            🎨 Temas{' '}
            <small id="tema-nome" className="dica">
              · {nomeDoTema(temaNaTela)}
              {temaNaTela === tema ? ' (em uso)' : ''}
            </small>
          </span>
          <button className="x" data-acao="fechar-temas" onClick={fechar}>
            ×
          </button>
        </div>
        <div className="temas-barra">
          <input
            id="temas-busca"
            type="search"
            placeholder="🔎 buscar tema (nome ou categoria)"
            autoComplete="off"
            spellCheck={false}
            value={busca}
            onChange={(e) => setBusca(e.target.value.trim())}
          />
          <div id="temas-cats">
            {cats.map(({ categoria, n }) => (
              <button
                key={categoria}
                className={'cat' + (categoria === cat ? ' ativo' : '')}
                data-cat={categoria}
                disabled={n === 0 && categoria !== cat}
                onClick={() => setCat(categoria)}
              >
                {categoria === 'todos' ? 'Todos' : categoria} · {n}
              </button>
            ))}
          </div>
        </div>
        <div
          id="grade-temas"
          ref={grade}
          onMouseLeave={() => {
            const f = document.activeElement as HTMLElement | null;
            if (f?.classList.contains('previa') && f.dataset.tema) experimentarTema(f.dataset.tema);
            else desfazerExperimento();
          }}
        >
          {!grupos.length && <p className="dica">nenhum tema encontrado{busca ? ` pra "${busca}"` : ''}</p>}
          {grupos.map(([g, lista]) => (
            <div key={g}>
              <h3>{g}</h3>
              <div className="temas-grupo">
                {lista.map(([id, nome, desc]) => (
                  <button
                    key={id}
                    className={'previa' + (tema === id ? ' ativo' : '')}
                    data-tema={id}
                    title={desc ? `${nome}: ${desc}` : nome}
                    onMouseEnter={() => experimentarTema(id)}
                    onFocus={() => experimentarTema(id)}
                    onClick={() => escolher(id)}
                  >
                    <span className="pv-barra"></span>
                    <span className="pv-corpo">
                      <span className="pv-nome">{nome}</span>
                      <span className="pv-desc">{desc ?? ''}</span>
                      <span className="pv-tela"></span>
                      <span className="pv-bot"></span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="grande" data-acao="visual-temas" onClick={() => acao('visual-temas')}>
          🎛 Painel de imagem: filtros, efeitos e ajustes finos
        </button>
        <button className="grande sec" data-acao="showcase" onClick={() => showcase(3500)}>
          ▶ Showcase lento: um tema a cada 3,5 s
        </button>
        <button className="grande sec" data-acao="showcase-rapido" onClick={() => showcase(500)}>
          ⚡ Showcase rápido: meio segundo por tema
        </button>
        <p className="dica so-pc">passe o mouse pra experimentar · clique (ou Enter) pra escolher · Esc fecha</p>
      </section>
    </>
  );
}

export function BarraShowcase() {
  const { ativo, lista, i, parar } = usarShowcase();
  if (!ativo) return null;
  const t = lista[i % lista.length];
  return (
    <div id="showcase">
      <span>
        🎨 <b id="showcase-nome">{t?.[1]}</b>{' '}
        <small id="showcase-n">
          {(i % lista.length) + 1}/{lista.length}
        </small>
      </span>
      <button className="grande" data-acao="showcase-ficar" onClick={() => parar(true)}>
        Ficar com este
      </button>
      <button className="grande sec" data-acao="showcase-parar" onClick={() => parar(false)}>
        ⏹ Parar
      </button>
    </div>
  );
}
