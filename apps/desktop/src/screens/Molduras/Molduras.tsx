// 🖼 Galeria de molduras (#molduras do antigo): categorias, cada moldura com o print do jogo dentro, animações, uma por
// console e a moldura sua em PNG.
import { cartelaTeste, KofMolduras, svgMoldura } from '@kof/app-core';
import { useEffect, useMemo } from 'react';
import { fotoDoQuadro } from '../../app/foto';
import { usarJogo } from '../../stores/jogo';
import { usarMoldura } from '../../stores/moldura';

function printDaCartela(): string {
  const px = cartelaTeste();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 224;
  const g = c.getContext('2d');
  if (!g) return '';
  const d = new Uint8ClampedArray(256 * 224 * 4);
  d.set(new Uint8Array(px.buffer));
  g.putImageData(new ImageData(d, 256, 224), 0, 0);
  return c.toDataURL('image/png');
}

export function Molduras() {
  const m = usarMoldura();
  const info = usarJogo((j) => j.info);
  useEffect(() => {
    if (!m.galeria) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      usarMoldura.getState().set({ galeria: false });
    };
    addEventListener('keydown', tecla, true);
    return () => removeEventListener('keydown', tecla, true);
  }, [m.galeria]);
  const print = useMemo(() => (m.galeria ? fotoDoQuadro(256) || printDaCartela() : ''), [m.galeria]);
  if (!m.galeria) return null;
  const r = !info || ['snes', 'nes', 'md', 'sms'].includes(info.sistema) ? 4 / 3 : info.proporcao;
  const h = 96;
  const w = Math.round(h * r);
  const cs = getComputedStyle(document.documentElement);
  const cor = (n: string, p: string) => cs.getPropertyValue(n).trim() || p;
  const cores = {
    fundo: cor('--fundo', '#222'),
    painel: cor('--painel', '#333'),
    destaque: cor('--destaque', '#e2b85c'),
    texto: cor('--texto', '#eee'),
    borda: cor('--borda', '#555'),
  };
  const cats = ['Todas', ...new Set(KofMolduras.LISTA.map((x) => x.cat)), 'Sua'];
  const itens: [string, string, string, string][] = [
    ['nenhuma', 'Sem moldura', 'só o jogo', 'Todas'],
    ...KofMolduras.LISTA.map((x): [string, string, string, string] => [x.id, x.nome, x.desc, x.cat]),
    [
      'propria',
      'Moldura sua (PNG)',
      m.propria ? 'a que você escolheu' : 'escolha um PNG com o meio transparente',
      'Sua',
    ],
  ];
  return (
    <>
      <div id="veu" onClick={() => m.set({ galeria: false })} />
      <section id="molduras" className="janela">
        <div className="titulo-j">
          <span>🖼 Molduras</span>
          <button className="x" data-acao="fechar-molduras" onClick={() => m.set({ galeria: false })}>
            ×
          </button>
        </div>
        <div id="mold-cats">
          {cats.map((c) => (
            <button key={c} data-mold-cat={c} className={c === m.cat ? 'ativo' : ''} onClick={() => m.set({ cat: c })}>
              {c}
            </button>
          ))}
        </div>
        <div id="grade-molduras">
          {itens
            .filter(([id, , , cat]) => m.cat === 'Todas' || cat === m.cat || id === 'nenhuma')
            .map(([id, nome, desc, cat]) => {
              void cat;
              const sv = id === 'nenhuma' || id === 'propria' ? null : svgMoldura(id, w, h, false, cores);
              const W = sv ? sv.W : w;
              const H = sv ? sv.H : h;
              const esc = Math.min(1, 200 / W, 150 / H);
              const p = m.propria;
              const fundo: React.CSSProperties = sv
                ? { backgroundImage: sv.url, backgroundSize: '100% 100%' }
                : id === 'propria' && p
                  ? { backgroundImage: `url("${p.url}")`, backgroundSize: '100% 100%' }
                  : {};
              const S = sv ? sv.S : id === 'propria' && p ? null : { x: 0, y: 0, w, h };
              const im: React.CSSProperties = S
                ? {
                    left: S.x * esc + 'px',
                    top: S.y * esc + 'px',
                    width: S.w * esc + 'px',
                    height: S.h * esc + 'px',
                    borderRadius: (sv ? sv.raio * h * esc : 2) + 'px',
                  }
                : p
                  ? {
                      left: (p.buraco[0] / p.larg) * 100 + '%',
                      top: (p.buraco[1] / p.alt) * 100 + '%',
                      width: (p.buraco[2] / p.larg) * 100 + '%',
                      height: (p.buraco[3] / p.alt) * 100 + '%',
                    }
                  : {};
              return (
                <button
                  key={id}
                  className={'mold-card' + (id === m.moldura ? ' ativo' : '')}
                  data-mold-escolher={id}
                  title={desc}
                  onClick={() => (id === 'propria' && !p ? m.escolherPropria() : m.mudar(id))}
                >
                  <div
                    className="mold-quadro"
                    style={{ width: Math.round(W * esc) + 'px', height: Math.round(H * esc) + 'px', ...fundo }}
                  >
                    <img src={print} alt="" style={im} hidden={id === 'propria' && !p} />
                  </div>
                  <span>
                    <b>{nome}</b>
                    <small>{desc}</small>
                  </span>
                </button>
              );
            })}
        </div>
        <div className="mold-opcoes">
          <label className="vis-linha">
            <input
              type="checkbox"
              id="mold-anim"
              checked={m.anim}
              onChange={(e) => m.set({ anim: e.target.checked })}
            />{' '}
            Animações (LED piscando, neon, bandeirinha)
          </label>
          <label className="vis-linha">
            <input
              type="checkbox"
              id="mold-porsis"
              checked={m.porSis}
              onChange={(e) => m.set({ porSis: e.target.checked })}
            />{' '}
            Cada console com a sua (Game Boy no tijolão, Neo Geo no fliperama…)
          </label>
          <button className="grande sec" data-acao="mold-propria" onClick={() => m.escolherPropria()}>
            📂 Usar uma moldura minha (PNG com o meio transparente)…
          </button>
        </div>
        <p className="dica so-pc">clique pra escolher · Esc fecha</p>
      </section>
    </>
  );
}
