// 🎵 Jukebox (#jukebox do antigo): a faixa tocando (capa, tempo, controles), as três vistas (Capa com as barras dos
// canais, Ondas com Mudo/Solo por canal, Notas com o piano e a sincronia) e a lista agrupada por jogo.
import { useEffect, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { capaPorNome, usarCapas } from '../../stores/capas';
import { mudasEfetivas, tocadorAtual, usarJukebox, type ItemJuke } from '../../stores/jukebox';
import {
  analisarNotas,
  coresDosCanais,
  desenharNotas,
  desenharOnda,
  estiloOndas,
  novoPiano,
  type Cores,
} from './desenho';

const mmss = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const CURTO: Record<string, string> = {
  gb: 'GB',
  nes: 'NES',
  md: 'MD',
  sms: 'SMS',
  gba: 'GBA',
  gg: 'GG',
  neogeo: 'NEO',
};

function rotuloDe(m: ItemJuke): string {
  if (m.trilha) return m.autor ?? '';
  if (m.origem === 'spc') return m.segundos ? mmss(m.segundos) : '.spc';
  return 'do jogo' + (m.sistema && m.sistema !== 'snes' && CURTO[m.sistema] ? ' · ' + CURTO[m.sistema] : '');
}

export function Jukebox() {
  const j = usarJukebox();
  const f = j.lista[j.atual];
  // a capa oficial do jogo pelo nome (srcCapa do antigo); sem ela, o print guardado com a música
  usarCapas((c) => c.versao); // redesenha quando a capa chega
  const capa = (f && f.origem !== 'trilha' && f.sistema ? capaPorNome(f.jogo, f.sistema) : null) ?? f?.capa ?? null;
  const nomes = j.info?.nomes ?? ['Voz 1', 'Voz 2', 'Voz 3', 'Voz 4', 'Voz 5', 'Voz 6', 'Voz 7', 'Voz 8'];
  const snesV = nomes.length === 8 && nomes[0] === 'Voz 1';
  const m = mudasEfetivas(j);
  const arquivo = useRef<HTMLInputElement>(null);
  const vozes = useRef<HTMLDivElement>(null);
  const ondas = useRef<HTMLDivElement>(null);
  const notas = useRef<HTMLCanvasElement>(null);
  const [tempo, setTempo] = useState('');

  useEffect(() => {
    void usarJukebox.getState().carregar();
  }, []);

  // laço de desenho (o desenharVozes do antigo)
  useEffect(() => {
    let vivo = true;
    let piano = novoPiano(nomes.length);
    let cores: Cores = coresDosCanais(nomes.length, estiloOndas(usarJukebox.getState().estilo));
    let quadros = 0;
    const laco = () => {
      if (!vivo) return;
      requestAnimationFrame(laco);
      const s = usarJukebox.getState();
      const tk = s.tocando ? tocadorAtual() : null;
      const u = tk?.ultimo ?? null;
      const est = estiloOndas(s.estilo);
      if (++quadros % 60 === 1) cores = coresDosCanais(nomes.length, est); // o tema pode ter mudado
      const mudas = mudasEfetivas(s);
      if (s.vista === 'ondas' && ondas.current) {
        const cvs = ondas.current.querySelectorAll('canvas');
        cvs.forEach((cv, v) => {
          const esc = tk?.info.escalas[v] ?? 1 / 7680;
          const cor = mudas & (1 << v) ? cores.fraca : (cores.canal[v] ?? cores.fraca);
          desenharOnda(cv, tk?.info.temOndas ? u : null, v, tk?.info.taxaOnda ?? 32000, esc, cor, cores, est);
        });
      } else if (s.vista === 'notas' && notas.current) {
        if (piano.canais.length !== nomes.length) piano = novoPiano(nomes.length);
        if (tk && u && tk.info.temOndas)
          analisarNotas(piano, u.ondas, u.amostras / tk.info.taxa, mudas, tk.info.taxaOnda, tk.info.escalas);
        const t = u ? Math.max(0, u.ouvido - s.sinc / 1000) : piano.t;
        desenharNotas(notas.current, piano, t, mudas, cores, est);
      } else if (vozes.current) {
        [...vozes.current.children].forEach((b, v) => {
          const i = b.firstElementChild as HTMLElement | null;
          if (i) i.style.height = (u ? Math.min(100, (u.niveis[v] ?? 0) * 100) : 0) + '%';
        });
      }
      const fx = s.lista[s.atual];
      if (quadros % 15 === 0 && tk) {
        const t = u ? u.amostras / tk.info.taxa : 0;
        const tot = (fx?.segundos || 180) + (fx?.fadeMs || 8000) / 1000;
        setTempo(fx ? mmss(t) + (s.repetir ? ' · repetindo' : ' / ' + mmss(tot)) : '');
      }
    };
    laco();
    return () => {
      vivo = false;
    };
  }, [nomes.length]);

  let grupo: string | null = null;
  return (
    <section
      id="jukebox"
      className="janela"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const spcs = [...e.dataTransfer.files].filter((x) => /\.spc$/i.test(x.name));
        if (!spcs.length) return;
        e.preventDefault();
        e.stopPropagation();
        void j.importarSpcs(spcs);
      }}
    >
      <div className="titulo-j">
        🎵 Jukebox{' '}
        <button className="x" data-acao="fechar-jukebox" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div className={'jk' + (j.vista !== 'capa' ? ' ondas' : '')}>
        <div className="jk-tocando">
          <div className="jk-capa">{capa ? <img id="jk-capa" alt="" src={capa} /> : <span>🎵</span>}</div>
          <h2 id="jk-titulo">{f ? f.titulo : 'Nada tocando'}</h2>
          <p id="jk-jogo" className="dica">
            {f
              ? [f.jogo, f.artista].filter(Boolean).join(' · ')
              : j.lista.length
                ? 'escolha uma música'
                : 'guarde uma música no jogo (F7) ou abra arquivos .spc'}
          </p>
          <p id="jk-tempo" className="dica">
            {f ? tempo : ''}
          </p>
          <div className="jk-controles">
            <button className={'x' + (j.aleatorio ? ' ativo' : '')} title="aleatório" onClick={j.alternarAleatorio}>
              🔀
            </button>
            <button className="x" title="anterior" onClick={() => j.proxima(-1)}>
              ⏮
            </button>
            <button className="jk-play" data-acao="jk-tocar" title="tocar / pausar (Espaço)" onClick={j.alternar}>
              {j.tocando && !j.interna ? '⏸' : '▶'}
            </button>
            <button className="x" title="próxima" onClick={() => j.proxima(1)}>
              ⏭
            </button>
            <button
              className={'x' + (j.repetir ? ' ativo' : '')}
              title="repetir esta música pra sempre"
              onClick={j.alternarRepetir}
            >
              🔁
            </button>
          </div>
          <div className="jk-vista">
            {(
              [
                ['capa', '🖼 Capa', 'capa e barras dos canais'],
                ['ondas', '〰 Ondas', 'osciloscópio: a forma da onda de cada canal'],
                ['notas', '🎹 Notas', 'piano: as notas de cada canal passando'],
              ] as const
            ).map(([k, t, d]) => (
              <button
                key={k}
                className={'sec' + (j.vista === k ? ' ativo' : '')}
                data-acao={'jk-vista-' + k}
                title={d}
                onClick={() => j.mudarVista(k)}
              >
                {t}
              </button>
            ))}
            <select
              id="jk-estilo"
              title="estilo das ondas"
              value={j.estilo}
              onChange={(e) => j.mudarEstilo(e.target.value)}
            >
              <option value="">estilo do tema</option>
              <option value="fio">Fio</option>
              <option value="neon">Neon</option>
              <option value="preenchido">Preenchido</option>
              <option value="pixel">Pixel</option>
            </select>
          </div>
          <div
            id="jk-vozes"
            ref={vozes}
            title="os canais do chip de som: clique pra silenciar um"
            style={{ gridTemplateColumns: `repeat(${nomes.length}, 1fr)` }}
            hidden={j.vista !== 'capa'}
          >
            {nomes.map((nm, v) => (
              <button
                key={nm + v}
                className={'jk-voz' + (m & (1 << v) ? ' muda' : '')}
                title={nm + ': clique pra silenciar'}
                onClick={() => {
                  if (j.solo >= 0) j.alternarSolo(j.solo);
                  j.alternarMudo(v);
                }}
              >
                <i></i>
                <span>{snesV ? v + 1 : nm}</span>
              </button>
            ))}
          </div>
          {j.vista === 'capa' && (
            <p className="dica" id="jk-vozes-dica">
              {snesV ? 'as 8 vozes do chip de som · ' : `os ${nomes.length} canais do chip de som · `}clique numa pra
              silenciar
            </p>
          )}
          <div id="jk-ondas" ref={ondas} hidden={j.vista !== 'ondas'} className={nomes.length <= 4 ? 'poucos' : ''}>
            {j.vista === 'ondas' && j.info && !j.info.temOndas && (
              <p className="dica">
                o Snes9x não entrega a onda de cada voz (só o núcleo Kof entregava): Mudo e Solo funcionam
              </p>
            )}
            {nomes.map((nm, v) => (
              <div
                key={nm + v}
                className={'jk-canal' + (m & (1 << v) ? ' apagado' : '') + (j.solo === v ? ' solo' : '')}
              >
                <canvas></canvas>
                <div className="jk-canal-rot">
                  <b>{nm}</b>
                  <span>{j.info?.papeis[v] ?? ''}</span>
                </div>
                <div className="jk-canal-acoes">
                  <button
                    data-m="mudo"
                    className={j.mudas & (1 << v) ? 'ativo' : ''}
                    title="silenciar só este canal"
                    onClick={() => j.alternarMudo(v)}
                  >
                    🔇 Mudo
                  </button>
                  <button
                    data-m="solo"
                    className={j.solo === v ? 'ativo' : ''}
                    title="ouvir só este canal"
                    onClick={() => j.alternarSolo(v)}
                  >
                    🎧 Solo
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div id="jk-notas" hidden={j.vista !== 'notas'}>
            <canvas ref={notas}></canvas>
            <div id="jk-notas-leg">
              {nomes.map((nm, v) => (
                <button
                  key={nm + v}
                  className={'jk-nota-canal' + (m & (1 << v) ? ' apagado' : '')}
                  title={'silenciar ' + nm}
                  onClick={() => j.alternarMudo(v)}
                >
                  <i></i>
                  {nm}
                </button>
              ))}
            </div>
            <label
              className="jk-sinc"
              title="cada fone e caixa de som tem o seu atraso: ajuste até a tecla acender junto com o som (vale pra todas as músicas neste aparelho)"
            >
              ⏱ sincronia do piano
              <button className="x" title="piano 10 ms mais cedo" onClick={() => j.mudarSinc(j.sinc - 10)}>
                −
              </button>
              <input
                id="jk-sinc"
                type="range"
                min={-500}
                max={500}
                step={10}
                value={j.sinc}
                onChange={(e) => j.mudarSinc(Number(e.target.value))}
              />
              <button className="x" title="piano 10 ms mais tarde" onClick={() => j.mudarSinc(j.sinc + 10)}>
                +
              </button>
              <output id="jk-sinc-v">
                {j.sinc === 0
                  ? '0 ms'
                  : (j.sinc > 0 ? '+' : '−') +
                    Math.abs(j.sinc) +
                    ' ms ' +
                    (j.sinc > 0 ? '(mais tarde)' : '(mais cedo)')}
              </output>
            </label>
          </div>
        </div>
        <div className="jk-lado">
          <ul id="jk-lista">
            {j.lista.map((it, i) => {
              const cab = it.jogo !== grupo;
              grupo = it.jogo;
              return [
                cab ? (
                  <li key={'g-' + it.key} className="jk-grupo">
                    {it.jogo}
                  </li>
                ) : null,
                <li key={it.key} className={'jk-faixa' + (i === j.atual ? ' sel' : '')} onClick={() => void j.tocar(i)}>
                  <span>{(i === j.atual && j.tocando ? '♪ ' : '') + it.titulo}</span>
                  <small>{rotuloDe(it)}</small>
                  <span className="jk-acoes">
                    {it.origem !== 'trilha' && (
                      <BotaoX
                        t="✎"
                        tit="renomear"
                        fn={() => {
                          const t = prompt('Nome da música:', it.titulo);
                          if (t) void j.renomear(it, t);
                        }}
                      />
                    )}
                    {it.origem !== 'trilha' && (!it.sistema || it.sistema === 'snes') && (
                      <BotaoX t="⬇" tit="exportar .spc" fn={() => void j.exportarSpc(it)} />
                    )}
                    <BotaoX
                      t="🎧"
                      tit="exportar .wav (do jeito que está tocando: mudo e solo valem)"
                      fn={() => void j.exportarWav(it)}
                    />
                    {it.origem !== 'trilha' && (
                      <BotaoX
                        t="🗑"
                        tit="apagar"
                        fn={() => {
                          if (confirm(`Apagar "${it.titulo}" da jukebox?`)) void j.apagar(it);
                        }}
                      />
                    )}
                  </span>
                </li>,
              ];
            })}
          </ul>
          <p id="jk-vazia" className="dica" hidden={j.lista.length > 0}>
            Nenhuma música ainda. No meio do jogo, aperte <b>F7</b> pra guardar a música que está tocando, ou abra
            arquivos <b>.spc</b>.
          </p>
        </div>
      </div>
      <div className="bib-rodape">
        <button className="sec" data-acao="guardar-musica" onClick={() => acao('guardar-musica')}>
          🎵 Guardar a música do jogo (F7)
        </button>
        <button className="sec" data-acao="abrir-spc" onClick={() => arquivo.current?.click()}>
          📂 Abrir arquivos .spc…
        </button>
        <span className="dica">Espaço toca/pausa · P volta pro jogo · arraste arquivos .spc pra cá</span>
        <input
          type="file"
          id="arquivo-spc"
          ref={arquivo}
          accept=".spc"
          multiple
          hidden
          onChange={(e) => {
            const l = [...(e.target.files ?? [])];
            e.target.value = '';
            if (l.length) void j.importarSpcs(l);
          }}
        />
      </div>
    </section>
  );
}

function BotaoX({ t, tit, fn }: { t: string; tit: string; fn: () => void }) {
  return (
    <button
      className="x"
      title={tit}
      onClick={(e) => {
        e.stopPropagation();
        fn();
      }}
    >
      {t}
    </button>
  );
}
