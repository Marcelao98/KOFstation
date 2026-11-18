// A tela "Controle do PC" do celular (#modo-controle do antigo): barra com o estado, a "telinha" com o console e o jogo que o
// PC abriu, o endereço e a senha (só enquanto nunca conectou, ou no ⓘ), os atalhos ⏪ 💾 📂 🏠 ☰ e, no Jogar no PC, o vídeo,
// o ping e o menu do PC. O controle de toque (ControleDeToque) fica por baixo, como no antigo.
import { useEffect, useRef } from 'react';
import {
  alternarFiltroRemoto,
  atalhoPc,
  itemDoMenuPc,
  menuDoPc,
  mostrarInfoDoControle,
  puxarVideo,
  rebobinarNoPc,
  sairModoControle,
  usarMC,
} from '../stores/modoControle';
import { acao } from '../app/acoes';

export function ModoControle() {
  const s = usarMC();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v || !s.stream) return;
    v.srcObject = s.stream;
    void v.play().catch(() => undefined); // sem gesto ainda: o próximo toque começa
    return puxarVideo(v);
  }, [s.stream]);
  useEffect(() => {
    document.body.classList.toggle('remoto-filtro', s.remoto && s.filtro);
  }, [s.remoto, s.filtro]);
  if (!s.ativo) return null;
  const cls = [
    'modo-controle',
    s.ligado && 'ligado',
    s.pareando && 'pareando',
    s.remoto && 'remoto',
    s.remoto && s.filtro && 'filtrado',
    s.menuAberto && 'menu-aberto',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      id="modo-controle"
      className={cls}
      style={
        s.jogador
          ? ({ '--jog-cor': ['#e84545', '#3d8bfd', '#27c26c', '#f2b632'][s.jogador - 1] ?? '' } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mc-barra">
        <i className="mc-luz" />
        <span className="mc-status">{s.status}</span>
        <button className="mc-info" aria-label="endereço e senha" onClick={mostrarInfoDoControle}>
          ⓘ
        </button>
        <button className="mc-sair" aria-label="sair" onClick={sairModoControle}>
          ✕
        </button>
      </div>
      <div className="mc-tela">
        <small className="mc-sis">{s.sisNome}</small>
        <b className="mc-jogo">{s.jogoNome}</b>
      </div>
      <div className="mc-parear">
        <b>📱 Conectar ao PC</b>
        <span>
          No PC: <b>Arquivo → Celular como controle</b> e digite:
        </span>
        <code>{s.endereco}</code>
        <em>{s.dica}</em>
        <small>Só na primeira vez: depois o PC conecta sozinho.</small>
      </div>
      <div className="mc-atalhos">
        <button
          data-at="rebob"
          aria-label="rebobinar (segure)"
          onPointerDown={(e) => {
            e.preventDefault();
            rebobinarNoPc(true);
            e.currentTarget.classList.add('on');
          }}
          onPointerUp={(e) => {
            rebobinarNoPc(false);
            e.currentTarget.classList.remove('on');
          }}
          onPointerCancel={() => rebobinarNoPc(false)}
          onPointerLeave={(e) => {
            rebobinarNoPc(false);
            e.currentTarget.classList.remove('on');
          }}
        >
          ⏪
        </button>
        <button data-at="salvar-estado" aria-label="salvar estado" onClick={() => atalhoPc('salvar-estado')}>
          💾
        </button>
        <button
          data-at="carregar-ultimo"
          aria-label="carregar o último estado"
          onClick={() => atalhoPc('carregar-ultimo')}
        >
          📂
        </button>
        <button data-at="home" aria-label="Início do PC" onClick={() => atalhoPc('home')}>
          🏠
        </button>
        <button data-at="menu" aria-label="menu" onClick={menuDoPc}>
          ☰
        </button>
      </div>
      {s.remoto && (
        <>
          <video className="mc-video" ref={video} playsInline autoPlay />
          <small className="mc-ping">{s.ping}</small>
          <div className="mc-menu" hidden={!s.menuAberto}>
            <div className="mc-menu-pc">
              {s.menuItens.map((it) => (
                <div className="mc-item" key={it.i}>
                  {it.aj && (
                    <button className="mc-aj" onClick={() => itemDoMenuPc(it.i, -1)}>
                      ◀
                    </button>
                  )}
                  <button onClick={() => itemDoMenuPc(it.i, it.aj ? 1 : 0)}>{it.t + (it.v ? ': ' + it.v : '')}</button>
                  {it.aj && (
                    <button className="mc-aj" onClick={() => itemDoMenuPc(it.i, 1)}>
                      ▶
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mc-item">
              <button data-r="filtro" onClick={alternarFiltroRemoto}>
                🎛 Filtro e moldura do celular: {s.filtro ? 'ligado' : 'desligado'}
              </button>
            </div>
            <div className="mc-item">
              <button data-r="visual" onClick={() => acao('visual')}>
                🖼 Escolher o filtro do celular…
              </button>
            </div>
            <div className="mc-item">
              <button data-r="voltar" onClick={menuDoPc}>
                ▶ Voltar ao jogo
              </button>
            </div>
            <div className="mc-item">
              <button data-r="sair" onClick={sairModoControle}>
                📺 Voltar pra TV (o jogo continua no PC)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
