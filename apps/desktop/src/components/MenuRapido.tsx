// Menu rápido (#rapido) no meio do jogo: F2, botão direito ou Select+Start. Mesmos itens do antigo (ITENS_RAPIDO); o que
// ainda não chegou no app novo avisa a etapa. ↑↓ escolhe, ◀▶ ajusta, Enter/A confirma, Esc/B fecha.
import { nomeDoTema, TODOS_TEMAS, MODOS, nomeModo } from '@kof/domain';
import { useEffect, useState } from 'react';
import { acao } from '../app/acoes';
import { PROPORCOES, usarJogo } from '../stores/jogo';
import { usarPrefs } from '../stores/prefs';
import { usarModo } from '../stores/modo';
import { MOLDURAS, usarMoldura } from '../stores/moldura';
import { FILTROS, usarVisual } from '../stores/visual';
import { PALETAS_GB, PALETAS_NES } from '@kof/app-core';

interface Item {
  t: string;
  f?: () => void;
  v?: () => string;
  aj?: (d: number) => void;
  /** só aparece quando (ex.: cores do GB só no Game Boy) */
  so?: () => boolean;
}

const ciclar = (l: [string, string][], atual: string, d: number) => {
  const i = Math.max(
    0,
    l.findIndex(([k]) => k === atual),
  );
  return l[(i + d + l.length) % l.length]?.[0] ?? atual;
};

const fechar = () => usarJogo.getState().fecharRapido();
const depois = (f: () => void) => () => {
  fechar();
  f();
};

function itens(): Item[] {
  const j = usarJogo.getState();
  const p = usarPrefs.getState();
  const l: Item[] = [
    { t: '▶ Continuar', f: fechar },
    { t: '💾 Salvar estado', f: depois(() => acao('salvar-estado')) },
    { t: '⟲ Carregar último estado', f: depois(() => acao('carregar-ultimo')) },
    { t: '🎵 Guardar esta música', f: depois(() => acao('guardar-musica')) },
    { t: '🐞 Reportar bug', f: depois(() => acao('bug')) },
    { t: '🗂 Estados salvos', f: depois(() => acao('estados')) },
    { t: '☕ Biblioteca', f: depois(() => acao('biblioteca')) },
    { t: '🎮 Jogadores (2 a 4)', f: depois(() => acao('jogadores')) },
    { t: '⌨ Controles e teclas', f: depois(() => acao('teclas')) },
    {
      t: '📈 Painel de desempenho',
      v: () => (j.desempenho ? 'ligado' : 'desligado'),
      aj: () => j.alternarDesempenho(),
      f: depois(() => j.alternarDesempenho()),
    },
    {
      t: '🎮 Modo',
      v: () => nomeModo(usarModo.getState().modo),
      aj: (d) => {
        const i = MODOS.findIndex(([k]) => k === usarModo.getState().modo);
        const novo = MODOS[(i + d + MODOS.length) % MODOS.length];
        if (novo) usarModo.getState().mudar(novo[0]);
      },
      f: depois(() => acao('emu-opcoes')),
    },
    {
      t: '🎨 Tema',
      v: () => nomeDoTema(p.tema) ?? p.tema,
      aj: (d) => {
        const i = TODOS_TEMAS.findIndex(([k]) => k === usarPrefs.getState().tema);
        const novo = TODOS_TEMAS[(i + d + TODOS_TEMAS.length) % TODOS_TEMAS.length];
        if (novo) usarPrefs.getState().escolherTema(novo[0]);
      },
      f: depois(() => acao('temas')),
    },
    {
      t: 'Filtro',
      v: () => FILTROS.find(([k]) => k === usarVisual.getState().pre)?.[1] ?? 'Meu jeito',
      aj: (d) => {
        const pre = usarVisual.getState().pre;
        usarVisual.getState().filtro(ciclar(FILTROS, FILTROS.some(([k]) => k === pre) ? pre : 'original', d));
      },
    },
    {
      t: 'Cores do Game Boy',
      so: () => j.info?.sistema === 'gb',
      v: () => PALETAS_GB.find(([k]) => k === usarMoldura.getState().paletaGb)?.[1] ?? '',
      aj: (d) => usarMoldura.getState().mudarPaletaGb(ciclar(PALETAS_GB, usarMoldura.getState().paletaGb, d)),
    },
    {
      t: 'Cores do NES',
      so: () => j.info?.sistema === 'nes',
      v: () => PALETAS_NES.find(([k]) => k === usarMoldura.getState().paletaNes)?.[1] ?? '',
      aj: (d) => usarMoldura.getState().mudarPaletaNes(ciclar(PALETAS_NES, usarMoldura.getState().paletaNes, d)),
    },
    { t: 'Proporção', v: () => PROPORCOES.find(([k]) => k === j.proporcao)?.[1] ?? '', aj: (d) => j.mudarProporcao(d) },
    { t: '🎛 Painel de imagem', f: depois(() => acao('visual')) },
    {
      t: 'Moldura',
      v: () => MOLDURAS.find(([k]) => k === usarMoldura.getState().moldura)?.[1] ?? '',
      aj: (d) => {
        const m = usarMoldura.getState();
        m.mudar(
          ciclar(
            MOLDURAS.filter(([k]) => k !== 'propria' || m.propria),
            m.moldura,
            d,
          ),
        );
      },
    },
    { t: 'Volume', v: () => (j.mudo ? 'mudo' : `${j.volume}%`), aj: (d) => j.mudarVolume(d * 10) },
    { t: '⛶ Tela cheia', f: () => acao('cheia') },
    { t: '↺ Reiniciar', f: depois(() => acao('reiniciar')) },
  ];
  return l.filter((it) => !it.so || it.so());
}

/** Teclas do menu rápido (também usadas pelo controle). Devolve true se tratou. */
export const teclaDoRapido: { tratar: ((code: string) => boolean) | null } = { tratar: null };

export function MenuRapido() {
  const aberto = usarJogo((j) => j.rapidoAberto);
  usarJogo((j) => [j.volume, j.mudo, j.proporcao, j.desempenho].join()); // redesenha quando os valores mudam
  usarPrefs((p) => p.tema);
  const [sel, setSel] = useState(0);
  const lista = itens();

  useEffect(() => {
    if (!aberto) return;
    setSel(0);
    teclaDoRapido.tratar = (code) => {
      const l = itens();
      if (code === 'ArrowDown') setSel((s) => (s + 1) % l.length);
      else if (code === 'ArrowUp') setSel((s) => (s - 1 + l.length) % l.length);
      else if (code === 'ArrowLeft' || code === 'ArrowRight')
        setSel((s) => {
          l[s]?.aj?.(code === 'ArrowLeft' ? -1 : 1);
          return s;
        });
      else if (code === 'Enter' || code === 'Space')
        setSel((s) => {
          const it = l[s];
          if (it?.f) it.f();
          else it?.aj?.(1);
          return s;
        });
      else if (code === 'Escape' || code === 'Backspace' || code === 'F2') fechar();
      else return false;
      return true;
    };
    return () => {
      teclaDoRapido.tratar = null;
    };
  }, [aberto]);

  if (!aberto) return <section id="rapido" hidden />;
  return (
    <section id="rapido">
      <div className="titulo-j">☕ Menu rápido</div>
      <ul id="rapido-lista">
        {lista.map((it, i) => (
          <li key={it.t} className={i === sel ? 'sel' : undefined} onClick={() => (setSel(i), it.f?.())}>
            <span>{it.t}</span>
            {it.aj && (
              <span className="ajuste">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSel(i);
                    it.aj?.(-1);
                  }}
                >
                  ◀
                </button>
                <b>{it.v?.()}</b>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSel(i);
                    it.aj?.(1);
                  }}
                >
                  ▶
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="dica so-pc">↑↓ escolhe · ◀▶ ajusta · Enter/A confirma · Esc/B fecha · botão direito abre e fecha</p>
    </section>
  );
}
