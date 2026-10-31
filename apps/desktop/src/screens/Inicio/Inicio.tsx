// O Início (#home) do antigo, por enquanto no estado "primeira vez" (sem jogos: a biblioteca chega no M3).
import { DICAS_PC, FRASES, LOGOS, TODOS_TEMAS, saudacao } from '@kof/domain';
import { useState } from 'react';
import { acao } from '../../app/acoes';
import { usarApp } from '../../stores/app';
import { usarPrefs } from '../../stores/prefs';

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

export function Inicio() {
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
      <section className="hm-bloco" id="hm-bloco-recentes" hidden>
        <h3>Jogados recentemente</h3>
        <div className="hm-recentes" id="hm-recentes"></div>
      </section>
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
