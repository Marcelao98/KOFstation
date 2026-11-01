// ☕ Biblioteca (#biblioteca do antigo, mesma marcação e classes): lista em lotes de 150 (rolar ou andar com as setas
// carrega mais), ficha do jogo à direita, Jogar/Estados, rodapé com a pasta Kof Games. Digitar já procura.
import { curtoDoSistema, nomeDoSistema, quando, sistemaDoItem, type ItemBiblioteca } from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { usarBiblioteca } from '../../stores/biblioteca';
import { usarTelas } from '../../stores/telas';
import { FiltrosDaBiblioteca, MetaDoJogo, popAberto, teclaDoPop } from './Filtros';
import { Capa, srcCapa } from './Capas';

const LOTE = 150;

function detalhe(r: ItemBiblioteca, n: number): string {
  if (!r.jogo) return 'na pasta Kof Games · ainda não jogado';
  const j = r.jogo;
  let t = `${nomeDoSistema(sistemaDoItem(r))} · jogado ${quando(j.ultimo)} · ${n} ${n === 1 ? 'estado salvo' : 'estados salvos'} · ${(j.tamanho / 1048576).toFixed(1)} MB`;
  if (j.temAuto && j.autoQuando) t += ` · parou em ${quando(j.autoQuando)}`;
  return t;
}

export function Biblioteca() {
  const b = usarBiblioteca();
  const [mostrando, setMostrando] = useState(LOTE);
  const ul = useRef<HTMLUListElement>(null);
  const filtro = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const sel = b.visiveis[b.selecionada];

  useEffect(() => {
    void usarBiblioteca.getState().mostrar();
  }, []);

  // a busca espera 140 ms depois da última tecla (como no antigo)
  useEffect(() => {
    const t = setTimeout(() => usarBiblioteca.getState().filtrar(texto), 140);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => setMostrando(Math.max(LOTE, b.selecionada + 30)), [b.visiveis, b.selecionada]);

  useEffect(() => {
    ul.current?.querySelector('li.sel')?.scrollIntoView?.({ block: 'nearest' });
  }, [b.selecionada, b.visiveis]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = usarTelas.getState();
      if (t.atual !== 'biblioteca' || t.temasAberto || usarBiblioteca.getState().pedirPasta) return;
      if (usarBiblioteca.getState().plano) return;
      if (popAberto()) return void teclaDoPop(e);
      const s = usarBiblioteca.getState();
      const naBusca = e.target === filtro.current;
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        e.preventDefault();
        s.selecionar(s.selecionada + (e.code === 'ArrowDown' ? 1 : -1));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        void s.jogar(e.shiftKey);
      } else if (e.code === 'F6' || (e.code === 'KeyE' && !naBusca)) {
        e.preventDefault();
        acao('estados-do-sel');
      } else if (!naBusca && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) filtro.current?.focus();
    };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, []);

  const rolar = (e: React.UIEvent<HTMLUListElement>) => {
    const u = e.currentTarget;
    if (mostrando < b.visiveis.length && u.scrollTop + u.clientHeight > u.scrollHeight - 400)
      setMostrando(mostrando + LOTE);
  };

  const n = b.visiveis.length;
  const total = b.itens.length;
  let estado = b.estado;
  if (!estado && !b.lendo) {
    let s = b.texto.trim()
      ? `${n.toLocaleString('pt-BR')} ${n === 1 ? 'jogo achado' : 'jogos achados'}`
      : `${total.toLocaleString('pt-BR')} jogos`;
    if (b.escondidas) s += ` · ${b.escondidas.toLocaleString('pt-BR')} hacks/cópias ruins escondidos`;
    if (mostrando < n) s += ` · mostrando ${mostrando.toLocaleString('pt-BR')}, role pra ver mais`;
    estado = total > 30 || b.escondidas || n < total ? s : '';
  }
  const auto = !!sel?.jogo?.temAuto;
  const src = sel ? srcCapa(sel) : null;

  return (
    <section id="biblioteca" className="janela">
      <div className="titulo-j">
        ☕ Biblioteca{' '}
        <span>
          <button
            className="x so-pc"
            data-acao="sofa"
            title="modo sofá (Select no controle)"
            onClick={() => acao('sofa')}
          >
            🛋
          </button>
          <button
            className="x"
            data-acao="fechar-biblioteca"
            title="voltar ao jogo (Esc)"
            onClick={() => acao('fechar-tela')}
          >
            ×
          </button>
        </span>
      </div>
      <div className="bib">
        <div className="bib-esq">
          <input
            id="filtro"
            ref={filtro}
            placeholder="procure por nome, gênero, empresa ou ano…"
            autoComplete="off"
            spellCheck={false}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <FiltrosDaBiblioteca />
          <p id="bib-estado" className="dica" hidden={!estado}>
            {estado}
          </p>
          <ul id="roms" ref={ul} onScroll={rolar}>
            {b.visiveis.slice(0, mostrando).map((r, i) => {
              const sis = sistemaDoItem(r);
              const c = r.jogo ? b.contagem[r.jogo.id] : 0;
              return (
                <li
                  key={(r.jogo?.id ?? '') + (r.pasta?.path ?? '') + i}
                  data-i={i}
                  className={i === b.selecionada ? 'sel' : undefined}
                  onClick={() => (i === b.selecionada ? void b.jogar() : b.selecionar(i))}
                >
                  <span>{r.nome}</span>
                  {sis !== 'snes' && <small className="sis-tag">{curtoDoSistema(sis)}</small>}
                  {r.jogo?.traducao && (
                    <small className="sis-tag" title={'traduzido: ' + r.jogo.traducao}>
                      🇧🇷
                    </small>
                  )}
                  <small className="li-ext">{r.jogo ? (c ? '💾 ' + c : '★') : r.pasta?.ext}</small>
                </li>
              );
            })}
          </ul>
          <p id="lista-vazia" className="dica" hidden={total > 0 || b.lendo}>
            {b.raiz?.path ? (
              <>
                Nenhum jogo ainda. Ponha jogos em <b>Kof Games/Novos</b> (vão sozinhos pro lugar certo) ou arraste uma
                ROM pra cá.
              </>
            ) : (
              <>
                Nenhum jogo ainda. Escolha a <b>pasta Kof Games</b> (só uma vez) ou arraste uma ROM pra cá.
              </>
            )}
          </p>
        </div>
        <div className="bib-dir">
          <div className="capa">
            <Capa item={sel} />
            <span id="capa-vazia" hidden={!!src}>
              ☕
            </span>
          </div>
          <h2 id="info-nome">{sel ? sel.nome : 'KOFstation'}</h2>
          <p id="info-det" className="dica">
            {sel
              ? detalhe(sel, sel.jogo ? (b.contagem[sel.jogo.id] ?? 0) : 0)
              : 'Super Nintendo, NES, Game Boy, GBA, Sega, Neo Geo, PlayStation e PS2'}
          </p>
          <MetaDoJogo item={sel} />
          <div className="bib-botoes">
            <button className="grande" data-acao="jogar" onClick={() => void b.jogar()} disabled={!sel}>
              {auto ? '▶ Continuar' : '▶ Jogar'}
            </button>
            <button className="grande sec" data-acao="do-zero" hidden={!auto} onClick={() => void b.jogar(true)}>
              ↺ Começar do zero
            </button>
            <button className="grande sec" data-acao="estados-do-sel" onClick={() => acao('estados-do-sel')}>
              Estados salvos
            </button>
          </div>
        </div>
      </div>
      <div className="bib-rodape">
        <button className="sec" data-acao="pasta" onClick={() => acao('pasta')}>
          📁 Pasta Kof Games
        </button>
        <button className="sec" data-acao="abrir" onClick={() => acao('abrir')}>
          ＋ Adicionar arquivo
        </button>
        <button className="sec" data-acao="estatisticas" onClick={() => acao('estatisticas')}>
          📊 Estatísticas
        </button>
        <button className="sec" data-acao="jukebox" onClick={() => acao('jukebox')}>
          🎵 Jukebox
        </button>
        <button
          className="sec"
          data-acao="so-principais"
          title="esconde hacks [h], cópias ruins [b] [o], trainers [t]… (traduções [T+Por] ficam)"
          onClick={() => b.alternarPrincipais()}
        >
          🧹 Só os principais: {b.soPrincipais ? 'ligado' : 'desligado'}
        </button>
        <button
          className="sec"
          data-acao="reler-pasta"
          title="arruma os jogos novos (Novos, soltos em Games) e lê a pasta de novo"
          onClick={() => void b.mostrar(true)}
        >
          🔄 Reler e organizar
        </button>
        <button className="sec" data-acao="capas" onClick={() => acao('capas')}>
          🖼 Capas oficiais: {capasLigadas() ? 'ligadas' : 'desligadas'}
        </button>
        <span className="dica so-pc">
          setas navegam · Enter joga · Shift+Enter do zero · E estados · controle: A joga, X estados, Select sofá
        </span>
      </div>
    </section>
  );
}

function capasLigadas() {
  try {
    return localStorage.getItem('kofstation.capas') !== '0';
  } catch {
    return true;
  }
}
