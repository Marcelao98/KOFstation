// 🎛 Painel de imagem (#visual do antigo, mesma marcação): Simples (cartões com a prévia, intensidade, nitidez, brilho)
// e Avançado (grupos, busca, ↺), comparar, ⭐ salvar, .kofvisual, por console e por jogo. F4 abre e fecha.
import { KofVisual, type ValoresVisuais as Valores } from '@kof/app-core';
import { useEffect, useRef, useState } from 'react';
import { config } from '../../stores/config';
import { usarJogo } from '../../stores/jogo';
import { escalarVisual, guardarPorSis, meusJeitos, usarPainel } from '../../stores/painel';
import { renderAtual, usarVisual, FILTROS } from '../../stores/visual';

const AJ = Object.fromEntries(KofVisual.AJUSTES.map((a) => [a[0], a]));
const mostraAj = (id: string, x: number) => {
  const a = AJ[id];
  if (!a) return '';
  return a[7] ? (a[7][x] ?? '') : a[4] <= 1.01 && a[3] >= 0 ? Math.round(x * 100) + '%' : x.toFixed(a[5] < 1 ? 2 : 0);
};
const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Prévia: o quadro atual desenhado com aquele estilo (uma por quadro de tela, pra não travar). */
function Previa({ v, chave, ah }: { v: Valores; chave: string; ah: number }) {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const r = renderAtual();
      const cv = c.current;
      if (!r || !cv) return;
      const px = r.previa(v, 144, ah);
      if (!px) return;
      const g = cv.getContext('2d');
      if (!g) return;
      const im = g.createImageData(144, ah);
      for (let y = 0; y < ah; y++) im.data.set(px.subarray((ah - 1 - y) * 144 * 4, (ah - y) * 144 * 4), y * 144 * 4); // o WebGL lê de baixo pra cima
      g.putImageData(im, 0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [v, chave, ah]);
  return <canvas ref={c} width={144} height={ah} />;
}

export function Visual() {
  const p = usarPainel();
  const { pre, v } = usarVisual();
  const temJogo = usarJogo((j) => !!j.jogo);
  const regId = usarJogo((j) => j.registro?.id);
  const [fps, setFps] = useState('');
  useEffect(() => {
    if (!p.aberto) return;
    const t = setInterval(() => {
      const r = renderAtual();
      setFps(temJogo && r ? r.quadros + ' quadros/s' : '');
      if (r) r.quadros = 0;
    }, 1000);
    return () => clearInterval(t);
  }, [p.aberto, temJogo]);
  useEffect(() => {
    if (!p.aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || (e.target as Element | null)?.closest?.('input, select')) return;
      e.preventDefault();
      e.stopPropagation();
      usarPainel.getState().fechar();
    };
    addEventListener('keydown', tecla, true);
    return () => removeEventListener('keydown', tecla, true);
  }, [p.aberto]);
  if (!p.aberto) return null;
  const r = renderAtual();
  const nome =
    pre === 'meu'
      ? '· do seu jeito'
      : pre.startsWith('meu:')
        ? '· ⭐ ' + pre.slice(4)
        : '· ' + (FILTROS.find(([k]) => k === pre)?.[1] ?? '');
  const n = r?.glPassosOk ? KofVisual.passos(v, r.telaL, r.telaA).length : 0;
  const custo =
    { leve: '🟢 leve', médio: '🟡 médio', pesado: '🔴 pesado' }[KofVisual.custo(v)] + (n ? ` · ${n + 1} etapas` : '');
  const ah = Math.round((144 * (r?.telaA ?? 224)) / (r?.telaL ?? 256));
  return (
    <section id="visual">
      <div className="titulo-j">
        <span>
          🎛 Imagem{' '}
          <small id="vis-nome" className="dica">
            {nome}
          </small>
        </span>
        <span className="vis-modos">
          {(['simples', 'avancado'] as const).map((m) => (
            <button
              key={m}
              data-vis-modo={m}
              className={p.modo === m ? 'ativo' : ''}
              onClick={() => p.set({ modo: m })}
            >
              {m === 'simples' ? 'Simples' : 'Avançado'}
            </button>
          ))}
        </span>
        <button className="x" data-acao="fechar-visual" onClick={() => p.fechar()}>
          ×
        </button>
      </div>
      <div className="vis-barra">
        <span id="vis-custo" title="quanto esse jeito pesa na placa de vídeo (no celular, prefira leve ou médio)">
          {custo}
        </span>
        <span id="vis-fps">{fps}</span>
        <select
          id="vis-comparar"
          title="comparar com a imagem crua"
          value={p.comparar}
          onChange={(e) => p.mudarComparar(Number(e.target.value) as 0 | 1 | 2)}
        >
          <option value="0">Comparar: não</option>
          <option value="1">Antes | depois (arraste)</option>
          <option value="2">Piscar antes e depois</option>
        </select>
      </div>
      {p.modo === 'simples' ? <Simples ah={ah} /> : <Avancado />}
      <div className="vis-botoes">
        <button className="grande sec" data-acao="vis-salvar" onClick={() => p.salvarMeu()}>
          ⭐ Salvar como meu jeito…
        </button>
        <button className="grande sec" data-acao="vis-zerar" onClick={() => p.zerar()}>
          ↺ Voltar ao original
        </button>
        <button className="grande sec" data-acao="vis-exportar" onClick={() => p.exportar()}>
          📤 Exportar estilo
        </button>
        <button className="grande sec" data-acao="vis-importar" onClick={() => p.importar()}>
          📥 Importar estilo
        </button>
      </div>
      <label className="vis-linha">
        <input
          type="checkbox"
          id="vis-porsis"
          defaultChecked={config().ler('visualPorSis') === '1'}
          onChange={(e) => {
            config().guardar('visualPorSis', e.target.checked ? '1' : '0');
            guardarPorSis();
          }}
        />{' '}
        Lembrar um jeito pra cada console
      </label>
      <label className="vis-linha" hidden={!temJogo}>
        <input
          type="checkbox"
          id="vis-porjogo"
          key={regId}
          defaultChecked={!!(regId && config().ler('visual.jogo.' + regId))}
          onChange={(e) => {
            if (!regId) return;
            if (e.target.checked) config().guardar('visual.jogo.' + regId, JSON.stringify({ pre, v }));
            else config().apagar('visual.jogo.' + regId);
          }}
        />{' '}
        Lembrar um jeito só pra este jogo
      </label>
      <p className="dica so-pc">o jogo continua rodando: mexa e veja na hora · F4 abre e fecha</p>
    </section>
  );
}

function Simples({ ah }: { ah: number }) {
  const p = usarPainel();
  const { pre, v } = usarVisual();
  const cats = ['Todos', ...KofVisual.CATEGORIAS.map(([c]) => c), '⭐ Meus'];
  const ids =
    p.cat === 'Todos'
      ? KofVisual.PREDEF.map(([k]) => k)
      : p.cat === '⭐ Meus'
        ? []
        : (KofVisual.CATEGORIAS.find(([c]) => c === p.cat)?.[1] ?? []);
  const meus = p.cat === 'Todos' || p.cat === '⭐ Meus' ? meusJeitos() : [];
  const rapido = (id: 'k' | 'nitidez' | 'brilho', x: number) => {
    if (id === 'k') {
      const base = p.base ?? { ...v };
      p.set({ base, k: x });
      p.mexeu({ ...escalarVisual(base, x), nitidez: v.nitidez ?? 0, brilho: v.brilho ?? 0 });
    } else p.mexeu({ ...v, [id]: x });
  };
  return (
    <div id="vis-simples">
      <div id="vis-cats" className="vis-chips">
        {cats.map((c) => (
          <button key={c} data-vis-cat={c} className={c === p.cat ? 'ativo' : ''} onClick={() => p.set({ cat: c })}>
            {c}
          </button>
        ))}
      </div>
      <div id="vis-pre">
        {ids.map((k) => {
          const d = KofVisual.PREDEF.find(([x]) => x === k);
          if (!d) return null;
          return (
            <button
              key={k}
              className={'vis-card' + (pre === k ? ' ativo' : '')}
              data-vis-pre={k}
              title={d[2]}
              onClick={() => p.usarPre(k)}
            >
              <Previa v={KofVisual.valores(k)} chave={k} ah={ah} />
              <b>{d[1]}</b>
              <small>{d[2]}</small>
            </button>
          );
        })}
        {meus.map((m) => (
          <button
            key={'meu:' + m.nome}
            className={'vis-card' + (pre === 'meu:' + m.nome ? ' ativo' : '')}
            data-vis-meu={m.nome}
            title="clique pra usar · botão direito pra apagar"
            onClick={() => p.usarMeu(m)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              p.apagarMeu(m.nome);
            }}
          >
            <Previa v={{ ...KofVisual.PADRAO, ...m.v }} chave={'meu:' + m.nome} ah={ah} />
            <b>⭐ {m.nome}</b>
            <small>clique pra usar · botão direito pra apagar</small>
          </button>
        ))}
        {p.cat === '⭐ Meus' && !meus.length && (
          <p className="dica">Nenhum ainda: ajuste do seu jeito e toque em ⭐ Salvar como meu jeito.</p>
        )}
      </div>
      <div id="vis-rapidos">
        {(
          [
            ['k', 'Intensidade do estilo', 0, 1.5, 0.05, p.k, Math.round(p.k * 100) + '%'],
            ['nitidez', 'Nitidez', 0, 1, 0.05, v.nitidez ?? 0, Math.round((v.nitidez ?? 0) * 100) + '%'],
            ['brilho', 'Brilho', -0.3, 0.3, 0.02, v.brilho ?? 0, (v.brilho ?? 0).toFixed(2)],
          ] as const
        ).map(([id, nome, min, max, passo, val, txt]) => (
          <div className="vis-aj" key={id}>
            <label>{nome}</label>
            <span className="vis-val">{txt}</span>
            <input
              type="range"
              data-vis-rapido={id}
              min={min}
              max={max}
              step={passo}
              value={val}
              onChange={(e) => rapido(id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Avancado() {
  const p = usarPainel();
  const { v } = usarVisual();
  const mudou = (id: string) => (v[id] ?? 0) !== AJ[id]?.[6];
  const grupos: Record<string, typeof KofVisual.AJUSTES> = {};
  for (const a of KofVisual.AJUSTES) (grupos[a[1]] ??= []).push(a);
  const nMud = (l: typeof KofVisual.AJUSTES) => l.filter((a) => mudou(a[0])).length;
  const todosMud = nMud(KofVisual.AJUSTES);
  const lista = p.busca
    ? KofVisual.AJUSTES.filter((a) => sem(a[2] + ' ' + a[1] + ' ' + (a[7] ?? []).join(' ')).includes(sem(p.busca)))
    : p.grupo === '*'
      ? KofVisual.AJUSTES.filter((a) => mudou(a[0]))
      : (grupos[p.grupo] ?? []);
  const passosOk = renderAtual()?.glPassosOk ?? true;
  return (
    <div id="vis-avancado">
      <input
        id="vis-busca"
        type="search"
        placeholder="🔎 procurar ajuste (brilho, linha, NTSC...)"
        value={p.busca}
        onChange={(e) => p.set({ busca: e.target.value.trim() })}
      />
      <div id="vis-grupos" className="vis-chips">
        {Object.entries(grupos).map(([g, l]) => {
          const m = nMud(l);
          return (
            <button
              key={g}
              data-vis-grupo={g}
              className={g === p.grupo && !p.busca ? 'ativo' : ''}
              onClick={() => p.set({ grupo: g, busca: '' })}
            >
              {KofVisual.GRUPOS[g]?.[0] ?? '•'} {g}
              {m ? <i>{m}</i> : null}
            </button>
          );
        })}
        <button
          data-vis-grupo="*"
          className={p.grupo === '*' && !p.busca ? 'ativo' : ''}
          onClick={() => p.set({ grupo: '*', busca: '' })}
        >
          ✏️ Mudados{todosMud ? <i>{todosMud}</i> : null}
        </button>
      </div>
      <div id="vis-ajustes">
        <div className="vis-gcab">
          <span>
            {p.busca
              ? `${lista.length} ajuste(s) com “${p.busca}”`
              : (KofVisual.GRUPOS[p.grupo]?.[1] ?? (p.grupo === '*' ? 'tudo que está fora do padrão' : ''))}
          </span>
          {lista.some((a) => mudou(a[0])) && (
            <button
              data-vis-zera-grupo="1"
              onClick={() => p.mexeu({ ...v, ...Object.fromEntries(lista.map((a) => [a[0], a[6]])) }, 'meu')}
            >
              ↺ zerar estes
            </button>
          )}
        </div>
        {!lista.length && <p className="dica">Nada aqui.</p>}
        {lista.map(([id, , nome, min, max, passo, padrao, opcoes]) => {
          const x = v[id] ?? padrao;
          return (
            <div
              key={id}
              className={'vis-aj' + (mudou(id) ? ' mudou' : '')}
              title={
                ['ntsc', 'ampliar', 'bloom'].includes(id) && !passosOk
                  ? 'esse aparelho não aguenta as passadas extras: esse ajuste não aparece'
                  : undefined
              }
            >
              <label>{nome}</label>
              <span className="vis-val">{opcoes ? '' : mostraAj(id, x)}</span>
              <button
                className="vis-zera"
                data-vis-zera={id}
                title="voltar ao padrão"
                onClick={() => p.mexeu({ ...v, [id]: padrao }, 'meu')}
              >
                ↺
              </button>
              {opcoes ? (
                <select
                  data-vis={id}
                  value={x}
                  onChange={(e) => p.mexeu({ ...v, [id]: Number(e.target.value) }, 'meu')}
                >
                  {opcoes.map((o, i) => (
                    <option key={o} value={i}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="range"
                  data-vis={id}
                  min={min}
                  max={max}
                  step={passo}
                  value={x}
                  onChange={(e) => {
                    p.set({ base: null, k: 1 });
                    p.mexeu({ ...v, [id]: Number(e.target.value) }, 'meu');
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
