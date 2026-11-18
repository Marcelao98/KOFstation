// Tela "Controles" no celular (a janela de teclas do antigo vira isto, web/android.js): os 6 modelos do controle de
// toque com miniatura, tamanho, transparência, vibrar e modo canhoto. Tudo vale na hora (stores/toque).
import { acao } from '../../app/acoes';
import { MODELOS, usarToque, type ModeloId } from '../../stores/toque';

interface Previa {
  bg: string;
  dp: string;
  ombro: string;
  f: Record<'X' | 'Y' | 'A' | 'B', string>;
  forma: 'cruz' | 'stick';
  anel?: boolean;
  arcade?: boolean;
  diag?: boolean;
  contorno?: string;
}

const PREV: Record<ModeloId, Previa> = {
  classico: {
    bg: '#c9c9d1',
    dp: '#3b3b45',
    ombro: '#6d6d78',
    f: { X: '#3a6fd3', Y: '#3aa05a', A: '#d33a3a', B: '#e0b020' },
    forma: 'cruz',
  },
  moderno: {
    bg: '#14161c',
    dp: '#ffffff33',
    ombro: '#2a2d38',
    f: { X: '#ffd24a', Y: '#4aa8ff', A: '#ff5a5a', B: '#4cd16b' },
    forma: 'stick',
    anel: true,
  },
  minimo: {
    bg: '#1a110b',
    dp: 'none',
    ombro: 'none',
    f: { X: 'none', Y: 'none', A: 'none', B: 'none' },
    forma: 'cruz',
    contorno: '#f3e5d0',
  },
  arcade: {
    bg: '#1a1020',
    dp: '#d01c1c',
    ombro: '#3a2a48',
    f: { X: '#3a8be0', Y: '#e8d23a', A: '#38c060', B: '#e0383a' },
    forma: 'stick',
    arcade: true,
  },
  portatil: {
    bg: '#b9bda6',
    dp: '#2a2c26',
    ombro: '#4a4e3e',
    f: { X: '#4a4e3e', Y: '#4a4e3e', A: '#8d1f4a', B: '#8d1f4a' },
    forma: 'cruz',
    diag: true,
  },
  tema: {
    bg: 'var(--painel)',
    dp: 'var(--painel2)',
    ombro: 'var(--painel2)',
    f: { X: 'var(--painel2)', Y: 'var(--painel2)', A: 'var(--destaque)', B: 'var(--destaque)' },
    forma: 'cruz',
    contorno: 'var(--borda)',
  },
};

/** Miniatura do modelo: cruz ou joystick, 4 botões e os ombros, nas cores dele (as mesmas coordenadas do antigo). */
function Miniatura({ id }: { id: ModeloId }) {
  const m = PREV[id];
  const c = m.contorno ? { stroke: m.contorno, strokeWidth: 1.4 } : {};
  const pos: Record<string, [number, number]> = m.diag
    ? { X: [92, 20], Y: [82, 30], A: [104, 30], B: [92, 40] }
    : m.arcade
      ? { X: [96, 20], Y: [84, 24], A: [102, 40], B: [88, 42] }
      : { X: [96, 18], Y: [84, 30], A: [108, 30], B: [96, 42] };
  return (
    <svg viewBox="0 0 120 56" aria-hidden="true">
      <rect width="120" height="56" fill={m.bg} />
      <rect x="4" y="3" width="24" height="7" rx="3" fill={m.ombro} {...c} />
      <rect x="92" y="3" width="24" height="7" rx="3" fill={m.ombro} {...c} />
      {m.forma === 'cruz' ? (
        <path d="M22 17h8v10h10v8H30v10h-8V35H12v-8h10z" fill={m.dp} {...c} />
      ) : (
        <>
          <circle
            cx="26"
            cy="31"
            r="14"
            fill={m.anel ? '#ffffff14' : '#2c2236'}
            {...(m.anel ? { stroke: '#ffffff55', strokeWidth: 1.4 } : {})}
          />
          <circle cx="26" cy="31" r="7" fill={m.arcade ? '#d01c1c' : '#ffffffcc'} />
        </>
      )}
      {Object.entries(pos).map(([k, [x, y]]) => (
        <circle
          key={k}
          cx={x}
          cy={y}
          r={m.diag && (k === 'X' || k === 'Y') ? 5 : 7}
          fill={m.f[k as 'X' | 'Y' | 'A' | 'B']}
          {...c}
        />
      ))}
    </svg>
  );
}

export function ControlesDeToque() {
  const t = usarToque();
  return (
    <section id="teclas" className="janela">
      <h2 className="titulo-j">🎮 Controles</h2>
      <p className="dica" id="teclas-dica">
        Escolha o modelo do controle e ajuste do seu jeito.
      </p>
      <div id="grade-teclas" style={{ display: 'block' }}>
        <button className="grande" data-acao="modo-controle" onClick={() => acao('controle-celular')}>
          📱 Usar este celular como controle do PC
        </button>
        <p className="dica">
          Com o KOFstation aberto no PC, na mesma Wi-Fi: o celular vira o controle, com o analógico e todos os botões.
        </p>
        <div className="ctl-lista">
          {MODELOS.map(([id, nome]) => (
            <button
              key={id}
              className={'ctl-card' + (t.modelo === id ? ' ativo' : '')}
              data-modelo={id}
              onClick={() => t.mudar({ modelo: id })}
            >
              <Miniatura id={id} />
              <b>{nome}</b>
            </button>
          ))}
        </div>
        <div className="ctl-ajustes">
          <label>
            <span>Tamanho</span>
            <input
              type="range"
              id="ctl-tam"
              min={0.7}
              max={1.4}
              step={0.05}
              value={t.tam}
              onChange={(e) => t.mudar({ tam: parseFloat(e.target.value) })}
            />
            <span>{Math.round(t.tam * 100)}%</span>
          </label>
          <label>
            <span>Transparência</span>
            <input
              type="range"
              id="ctl-opa"
              min={0.25}
              max={1}
              step={0.05}
              value={t.opa}
              onChange={(e) => t.mudar({ opa: parseFloat(e.target.value) })}
            />
            <span>{Math.round(t.opa * 100)}%</span>
          </label>
          <label>
            <span>Vibrar ao tocar</span>
            <input
              type="checkbox"
              id="ctl-vibrar"
              checked={t.vibrar}
              onChange={(e) => t.mudar({ vibrar: e.target.checked })}
            />
          </label>
          <label>
            <span>Modo canhoto (troca os lados)</span>
            <input
              type="checkbox"
              id="ctl-canhoto"
              checked={t.canhoto}
              onChange={(e) => t.mudar({ canhoto: e.target.checked })}
            />
          </label>
        </div>
        <button id="ctl-padrao" onClick={() => t.restaurar()}>
          Restaurar o padrão
        </button>
      </div>
    </section>
  );
}
