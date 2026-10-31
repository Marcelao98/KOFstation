// Guia (#guia): o mesmo texto do antigo (paginas.html), uma página por vez. Botões dentro do texto (ex.: "Fazer backup
// agora") passam pelas mesmas ações dos menus.
import { useEffect, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { ATALHOS, TECLAS_DO_JOGO, nomeDaTecla } from '../../app/atalhos';
import paginas from './paginas.html?raw';

const MENU: [string, string][] = [
  ['comecar', '👋 Começando'],
  ['biblioteca', '📚 Biblioteca'],
  ['jogando', '🎮 Jogando'],
  ['tempo', '⏪ Voltar no tempo'],
  ['backup', '💾 Saves e backup'],
  ['imagem', '🖼 Imagem e som'],
  ['jukebox', '🎵 Jukebox'],
  ['temas', '🎨 Temas e início'],
  ['bugs', '🐞 Bugs e atualizações'],
  ['atalhos', '⌨️ Atalhos'],
];

let ultima = 'comecar';

export function Guia() {
  const [pagina, setPagina] = useState(ultima);
  const texto = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ultima = pagina;
    const t = texto.current;
    if (!t) return;
    t.querySelectorAll<HTMLElement>('[data-pagina]').forEach((d) => {
      d.hidden = d.dataset.pagina !== pagina;
    });
    t.scrollTop = 0;
    const tab = t.querySelector('#tab-ajuda');
    if (tab && !tab.childElementCount) {
      const linha = (k: string, v: string) => {
        const tr = document.createElement('tr');
        const a = document.createElement('td');
        const b = document.createElement('td');
        a.innerHTML = `<kbd></kbd>`;
        (a.firstChild as HTMLElement).textContent = k;
        b.textContent = v;
        tr.append(a, b);
        tab.appendChild(tr);
      };
      for (const x of ATALHOS) linha(nomeDaTecla(x), x.descricao);
      for (const [k, v] of TECLAS_DO_JOGO) linha(k, v);
    }
  }, [pagina]);
  return (
    <section id="guia" className="janela">
      <div className="titulo-j">
        📖 Guia do KOFstation{' '}
        <button className="x" data-acao="fechar-guia" onClick={() => acao('fechar-guia')}>
          ×
        </button>
      </div>
      <div className="gu">
        <nav className="gu-menu">
          {MENU.map(([id, nome]) => (
            <button
              key={id}
              data-guia={id}
              className={id === pagina ? 'ativo' : undefined}
              onClick={() => setPagina(id)}
            >
              {nome}
            </button>
          ))}
        </nav>
        {/* HTML fixo do antigo (escrito por nós, sem nada vindo de fora) */}
        <div
          className="gu-texto"
          ref={texto}
          dangerouslySetInnerHTML={{ __html: paginas }}
          onClick={(e) => {
            const b = (e.target as Element).closest<HTMLElement>('[data-acao]');
            if (b?.dataset.acao) acao(b.dataset.acao);
          }}
        />
      </div>
    </section>
  );
}
