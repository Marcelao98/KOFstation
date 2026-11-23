// A tela "Controle do PC" do celular (#modo-controle do antigo): barra com o estado, a "telinha" com o console e o jogo que o
// PC abriu, o endereço e a senha (só enquanto nunca conectou, ou no ⓘ), os atalhos ⏪ 💾 📂 🏠 ☰ e, no Jogar no PC, o vídeo,
// o ping e o menu do PC. O controle de toque (ControleDeToque) fica por baixo, como no antigo.
import { useEffect, useRef, useState } from 'react';
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
import { usarTelas } from '../stores/telas';
import {
  arrastarMira,
  depuracaoWiimote,
  guardarSensibilidadeMira,
  recentrarMira,
  sensibilidadeMira,
} from '../stores/sensores';
import { acao } from '../app/acoes';

export function ModoControle() {
  const s = usarMC();
  const [calibrar, setCalibrar] = useState(false);
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
    if (!(s.remoto && s.filtro)) return;
    // com o filtro, a imagem do PC é desenhada no #tela, que só aparece na tela do jogo: sem isso o celular via o
    // Início por baixo (achado no tools/testar-mesa.mjs, 22/11). Ao sair, volta pro Início se não tem jogo aqui.
    const t = usarTelas.getState();
    if (t.atual !== 'jogo') t.abrir('jogo');
    window.dispatchEvent(new Event('resize')); // o tamanho da imagem muda com o remoto-filtro
    return () => {
      document.body.classList.remove('remoto-filtro');
      const u = usarTelas.getState();
      if (u.atual === 'jogo' && !u.temJogo) u.abrir('home');
      window.dispatchEvent(new Event('resize'));
    };
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
      {s.sis === 'wii' && !s.remoto ? (
        <PainelWiimote />
      ) : (
        <div className="mc-tela">
          <small className="mc-sis">{s.sisNome}</small>
          <b className="mc-jogo">{s.jogoNome}</b>
        </div>
      )}
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
        {s.sis === 'wii' && (
          <button data-at="mira" aria-label="calibrar a mira do Wiimote" onClick={() => setCalibrar((c) => !c)}>
            🎯
          </button>
        )}
      </div>
      {calibrar && s.sis === 'wii' && <CalibrarMira fechar={() => setCalibrar(false)} />}
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

/** Calibração do Wiimote (opcional, 22/11): o meio da tela e a sensibilidade da mira, guardada neste celular. */
function CalibrarMira({ fechar }: { fechar: () => void }) {
  const [sens, setSens] = useState(sensibilidadeMira);
  const [meio, setMeio] = useState(false);
  const mudar = (d: number) => setSens(guardarSensibilidadeMira(sens + d));
  return (
    <div className="mc-calibrar" role="dialog" aria-label="calibrar a mira">
      <b>🎯 Calibrar a mira (opcional)</b>
      <small>Aponte o celular pro meio da TV e toque:</small>
      <button
        className="grande"
        data-r="meio"
        onClick={() => {
          recentrarMira();
          setMeio(true);
        }}
      >
        {meio ? '✅ Meio marcado (toque de novo se quiser)' : '🎯 Aqui é o meio'}
      </button>
      <small>Sensibilidade: mais alta = a mira anda mais com menos movimento</small>
      <div className="mc-sens">
        <button data-r="sens-menos" onClick={() => mudar(-0.25)}>
          −
        </button>
        <b>{sens.toFixed(2).replace('.', ',')}×</b>
        <button data-r="sens-mais" onClick={() => mudar(0.25)}>
          +
        </button>
      </div>
      <button className="grande sec" data-r="pronto" onClick={fechar}>
        Pronto
      </button>
    </div>
  );
}

const n2 = (v: number) => (v >= 0 ? ' ' : '') + v.toFixed(2);

/**
 * O celular como Wiimote (22/11): o quadro da mira (o ponto = pra onde o Wiimote aponta; arrastar o dedo aqui move a
 * mira, junto com a inclinação: o jeito de mirar bem em celular sem giroscópio) e a depuração ao vivo, que aparece
 * sozinha e esconde no ✕.
 */
function PainelWiimote() {
  const [d, setD] = useState(depuracaoWiimote);
  const [dep, setDep] = useState(true);
  const ultimo = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const t = setInterval(() => setD(depuracaoWiimote()), 100);
    return () => clearInterval(t);
  }, []);
  const mov = d.mov;
  const x = mov?.x ?? 0;
  const y = mov?.y ?? 0;
  return (
    <div className="mc-wii">
      <div
        className="mc-mira"
        aria-label="mira: arraste o dedo pra mirar"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          ultimo.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const u = ultimo.current;
          if (!u || u.id !== e.pointerId) return;
          const r = e.currentTarget.getBoundingClientRect();
          arrastarMira((e.clientX - u.x) / r.width, (e.clientY - u.y) / r.height);
          ultimo.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (ultimo.current = null)}
        onPointerCancel={() => (ultimo.current = null)}
      >
        <i className="mc-ponto" style={{ left: `${(x + 1) * 50}%`, top: `${(y + 1) * 50}%` }} />
        <small>{d.meioMarcado ? '👆 arraste pra mirar' : '📺 aponte pra TV e aperte um botão'}</small>
      </div>
      {dep ? (
        <pre className="mc-dep">
          <button className="mc-dep-x" aria-label="esconder a depuração" onClick={() => setDep(false)}>
            ✕
          </button>
          {`🧪 Wiimote · ${d.ligado ? 'ligado' : 'desligado'} · ${d.hz} leituras/s
giroscópio: ${d.giroscopio === null ? '?' : d.giroscopio ? 'sim' : 'não (mira pela inclinação + dedo)'}
aceleração (g): ${mov ? mov.acel.map(n2).join(' ') : '—'}
força: ${d.forca.toFixed(2)} g${d.chacoalhando ? ' · CHACOALHANDO' : ''}
mira: x ${n2(x)}  y ${n2(y)} · meio ${d.meioMarcado ? 'marcado' : 'esperando um botão'}
sensibilidade: ${d.sens.toFixed(2)}× · mandando: ${mov ? 'sim' : 'não'}`}
        </pre>
      ) : (
        <button className="mc-dep-abrir" aria-label="mostrar a depuração" onClick={() => setDep(true)}>
          🧪
        </button>
      )}
    </div>
  );
}
