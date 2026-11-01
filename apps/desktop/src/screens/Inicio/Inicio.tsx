// O Início (#home) do antigo: jogando agora / continuar de onde parou / primeira vez, os atalhos e os jogados
// recentemente (montarHome do antigo).
import { listarJogos } from '@kof/app-core';
import { DICAS_PC, FRASES, LOGOS, TODOS_TEMAS, quando, saudacao, type RegistroJogo } from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { usarApp } from '../../stores/app';
import { ultimoQuadro, usarJogo } from '../../stores/jogo';
import { usarPrefs } from '../../stores/prefs';
import { autoLigado, continuar } from '../../stores/auto';
import { usarAvisos } from '../../stores/avisos';
import { usarBiblioteca } from '../../stores/biblioteca';
import { servicos } from '../../stores/servicos';
import { srcCapa } from '../Biblioteca/Capas';

const sortearDica = (antes: number): number => {
  let i: number;
  do i = Math.floor(Math.random() * DICAS_PC.length);
  while (i === antes && DICAS_PC.length > 1);
  return i;
};

const ATALHOS: { a: string; i: string; b: string; s: React.ReactNode; id?: string }[] = [
  { a: 'biblioteca', i: '📚', b: 'Biblioteca', s: 'seus jogos e a pasta de ROMs' },
  {
    a: 'abrir',
    i: '＋',
    b: 'Abrir uma ROM',
    s: (
      <>
        .sfc, .smc, .nes, .gb, .gbc, .gba, .md, .sms, .gg, .zip (Neo Geo) .cue/.chd/.pbp (PlayStation) ou .iso (PS2)
        <span className="so-pc"> (ou arraste)</span>
      </>
    ),
  },
  { a: 'jukebox', i: '🎵', b: 'Jukebox', s: 'as trilhas que você guardou' },
  { a: 'estatisticas', i: '📊', b: 'Estatísticas', s: 'quanto você jogou, e o quê' },
  {
    a: 'temas',
    i: '🎨',
    b: 'Temas',
    s: (
      <>
        <span className="n-temas">{TODOS_TEMAS.length}</span> jeitos de deixar com a sua cara
      </>
    ),
  },
  { a: 'guia', i: '📖', b: 'Guia', s: 'tudo que o KOFstation sabe fazer' },
  { a: 'aparelhos', i: '📡', b: 'Aparelhos', s: 'parear o celular com o PC', id: 'hm-aparelhos' },
  { a: 'bios-tela', i: '🔑', b: 'BIOS', s: 'guarde a BIOS dos consoles (PS2, Neo Geo...)', id: 'hm-bios' },
];

/** A foto do jogo pausado (o último quadro), como o print do "Jogando agora" do antigo. */
function FotoDoJogo() {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = c.current;
    const q = ultimoQuadro;
    if (!el || !q.pixels) return;
    el.width = q.largura;
    el.height = q.altura;
    const img = new ImageData(q.largura, q.altura);
    img.data.set(new Uint8Array(q.pixels.buffer, q.pixels.byteOffset, q.largura * q.altura * 4));
    el.getContext('2d')?.putImageData(img, 0, 0);
  }, []);
  return <canvas ref={c} style={{ width: '100%', imageRendering: 'pixelated' }} />;
}

const abrir = (j: RegistroJogo, doZero = false) =>
  void (
    autoLigado() && j.temAuto && !doZero
      ? continuar(j)
      : usarBiblioteca.getState().jogar(true, { nome: j.nome, chave: j.nome, jogo: j })
  ).catch((e: unknown) => usarAvisos.getState().avisarErro(e instanceof Error ? e.message : String(e)));

function useJogosRecentes(): RegistroJogo[] {
  const [l, setL] = useState<RegistroJogo[]>([]);
  const aberto = usarJogo((j) => j.registro?.id);
  useEffect(() => {
    let vivo = true;
    listarJogos(servicos().armazem).then(
      (js) => vivo && setL(js.sort((a, b) => b.ultimo - a.ultimo)),
      () => undefined, // sem a loja: o Início fica no "primeira vez"
    );
    return () => {
      vivo = false;
    };
  }, [aberto]);
  return l;
}

export function Inicio() {
  const jogo = usarJogo((j) => j.jogo);
  const idAberto = usarJogo((j) => j.registro?.id);
  const jogos = useJogosRecentes();
  const ultimo = jogos[0];
  const continuarAuto = !!ultimo?.temAuto && autoLigado();
  const nomeDoJogo = usarJogo((j) => j.nome);
  const tema = usarPrefs((p) => p.temaNaTela);
  const info = usarApp((a) => a.info);
  const [dica, setDica] = useState(() => sortearDica(-1));
  const logo = LOGOS[tema] ?? '🎮';
  return (
    <section id="home">
      <header className="hm-topo">
        <div className="hm-marca">
          <span className="hm-logo" id="hm-logo">
            {logo}
          </span>
          <div>
            <h1>KOFstation</h1>
            <p className="hm-lema">
              Super Nintendo, NES, Game Boy, GBA, Sega, Neo Geo, PlayStation e PS2 num lugar só, pra facilitar a sua
              jogatina.
            </p>
          </div>
        </div>
        <p className="hm-saudacao" id="hm-saudacao">
          <b>{saudacao(new Date().getHours())}! </b>
          {FRASES[tema] ?? 'Bora jogar?'}
        </p>
      </header>
      <div className="hm-corpo">
        <article className="hm-destaque" id="hm-destaque">
          {jogo ? (
            <>
              <div className="hm-print">
                <FotoDoJogo />
              </div>
              <div className="hm-info">
                <small className="hm-rotulo">🎮 Jogando agora</small>
                <h2>{nomeDoJogo}</h2>
                <p className="dica">O jogo está pausado esperando você.</p>
                <button className="grande" data-acao="voltar-jogo" onClick={() => acao('voltar-jogo')}>
                  ▶ Voltar ao jogo
                </button>
                <button className="grande sec" data-acao="salvar-estado" onClick={() => acao('salvar-estado')}>
                  💾 Salvar estado
                </button>
              </div>
            </>
          ) : ultimo ? (
            <>
              <div className="hm-print">
                {(() => {
                  const src =
                    ultimo.autoCapa || ultimo.capa || srcCapa({ nome: ultimo.nome, chave: ultimo.nome, jogo: ultimo });
                  return src ? <img src={src} alt="" /> : logo;
                })()}
              </div>
              <div className="hm-info">
                <small className="hm-rotulo">
                  {continuarAuto ? '⟳ Continuar de onde parou' : '🕹 Jogado por último'}
                </small>
                <h2>{ultimo.nome}</h2>
                <p className="dica">
                  {continuarAuto && ultimo.autoQuando
                    ? 'parou em ' + quando(ultimo.autoQuando)
                    : 'jogado ' + quando(ultimo.ultimo)}
                </p>
                <button className="grande" data-acao="hm-continuar" onClick={() => abrir(ultimo)}>
                  {continuarAuto ? '▶ Continuar' : '▶ Jogar'}
                </button>
                {continuarAuto && (
                  <button className="grande sec" data-acao="hm-zero" onClick={() => abrir(ultimo, true)}>
                    ↺ Começar do zero
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="hm-print">{logo}</div>
              <div className="hm-info">
                <small className="hm-rotulo">👋 Primeira vez por aqui?</small>
                <h2>Vamos começar</h2>
                <p className="dica">
                  Escolha a pasta onde ficam suas ROMs (uma vez só) ou arraste uma ROM pra esta janela.
                </p>
                <button className="grande" data-acao="pasta" onClick={() => acao('pasta')}>
                  📁 Escolher pasta de ROMs
                </button>
                <button className="grande sec" data-acao="abrir" onClick={() => acao('abrir')}>
                  ＋ Abrir uma ROM
                </button>
                <button className="grande sec" data-acao="guia" onClick={() => acao('guia')}>
                  📖 Ver o guia
                </button>
              </div>
            </>
          )}
        </article>
        <div className="hm-atalhos">
          {ATALHOS.map((x) => (
            <button key={x.a} data-acao={x.a} onClick={() => acao(x.a)}>
              <i>{x.i}</i>
              <b>{x.b}</b>
              <small id={x.id}>{x.s}</small>
            </button>
          ))}
        </div>
      </div>
      <Recentes jogos={jogos.filter((j) => (jogo ? j.id !== idAberto : j !== ultimo)).slice(0, 6)} />
      <div className="hm-dica">
        <span>💡</span>
        {/* dicas são HTML fixo nosso (só <b>), copiadas do antigo */}
        <p id="hm-dica" dangerouslySetInnerHTML={{ __html: DICAS_PC[dica] ?? '' }} />
        <button className="x" data-acao="hm-dica" title="outra dica" onClick={() => setDica(sortearDica(dica))}>
          ↻
        </button>
      </div>
      <footer className="hm-rodape">
        SNES do PC em Kof, linguagem parceira · <span id="hm-versao">versão {info?.version ?? '…'}</span> ·{' '}
        <button className="hm-link" data-acao="guia" onClick={() => acao('guia')}>
          guia
        </button>{' '}
        ·{' '}
        <button className="hm-link" data-acao="bug" onClick={() => acao('bug')}>
          reportar bug
        </button>{' '}
        ·{' '}
        <button className="hm-link" data-acao="musica-inicio" onClick={() => acao('musica-inicio')}>
          🎵 Se Essa Rua
        </button>
      </footer>
    </section>
  );
}

function Recentes({ jogos }: { jogos: RegistroJogo[] }) {
  return (
    <section className="hm-bloco" id="hm-bloco-recentes" hidden={!jogos.length}>
      <h3>Jogados recentemente</h3>
      <div className="hm-recentes" id="hm-recentes">
        {jogos.map((j) => {
          const src = srcCapa({ nome: j.nome, chave: j.nome, jogo: j });
          return (
            <button key={j.id} className="hm-cartao" title={'jogado ' + quando(j.ultimo)} onClick={() => abrir(j)}>
              <div className="hm-capa">{src ? <img src={src} alt="" loading="lazy" /> : '🎮'}</div>
              <span>{j.nome}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
