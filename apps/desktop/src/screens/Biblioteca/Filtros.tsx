// Filtros da biblioteca (#bib-filtros: Console, Gênero, Empresa, Década, Jogadores, Série, Ordem), o menu com a
// contagem de cada valor (#bib-pop, com caixinha de procurar quando passa de 12) e os botõezinhos da ficha
// (#info-meta) que filtram pelo que foi tocado. Igual ao antigo (app.js 3376–3466).
import {
  consulta,
  decada,
  FACETAS,
  normal,
  opcoesDaFaceta,
  ORDENS,
  type FacetaId,
  type ItemBiblioteca,
} from '@kof/domain';
import type { Ordem } from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { usarBiblioteca } from '../../stores/biblioteca';

type PopId = FacetaId | 'ordem';
let popAtual: PopId | null = null;
let fecharPopAtual: (() => void) | null = null;

export const popAberto = (): boolean => popAtual !== null;

export function teclaDoPop(e: KeyboardEvent): void {
  const pop = document.getElementById('bib-pop');
  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    fecharPopAtual?.();
    document.getElementById('filtro')?.focus();
    return;
  }
  if ((e.code === 'ArrowDown' || e.code === 'ArrowUp') && pop) {
    e.preventDefault();
    const bs = [...pop.querySelectorAll<HTMLButtonElement>('button')];
    const i = bs.indexOf(document.activeElement as HTMLButtonElement);
    const j = i < 0 ? 0 : Math.max(0, Math.min(bs.length - 1, i + (e.code === 'ArrowDown' ? 1 : -1)));
    bs[j]?.focus();
    bs[j]?.scrollIntoView?.({ block: 'nearest' });
  }
}

export function FiltrosDaBiblioteca() {
  const { base, itens, filtros, ordem, texto, soPrincipais } = usarBiblioteca();
  const [pop, setPop] = useState<{ id: PopId; x: number; y: number } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    popAtual = pop?.id ?? null;
    fecharPopAtual = () => setPop(null);
    if (!pop) return;
    const fora = (e: PointerEvent) => {
      if (!(e.target as Element).closest('#bib-pop, #bib-filtros')) setPop(null);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [pop]);
  useEffect(() => () => void (popAtual = null), []);
  const escondido = !base || !itens.length;
  const b = usarBiblioteca.getState();
  return (
    <>
      <div id="bib-filtros" ref={caixa} hidden={escondido}>
        {FACETAS.map((f) => {
          const v = filtros[f.id];
          return (
            <button
              key={f.id}
              className={'chip' + (v ? ' ativo' : '')}
              data-faceta={f.id}
              onClick={(e) => {
                if (v) return b.mudarFiltro(f.id, ''); // o ✕ tira o filtro
                if (pop?.id === f.id) return setPop(null);
                const el = e.currentTarget;
                setPop({ id: f.id, x: el.offsetLeft, y: el.offsetTop + el.offsetHeight + 4 });
              }}
            >
              {v ? `${f.nome}: ${f.rotulo ? f.rotulo(v) : v} ✕` : f.nome + ' ▾'}
            </button>
          );
        })}
        <button
          className={'chip' + (ordem !== 'padrao' ? ' ativo' : '')}
          data-faceta="ordem"
          onClick={(e) => {
            if (pop?.id === 'ordem') return setPop(null);
            const el = e.currentTarget;
            setPop({ id: 'ordem', x: el.offsetLeft, y: el.offsetTop + el.offsetHeight + 4 });
          }}
        >
          ↕ {ORDENS.find(([k]) => k === ordem)?.[1]}
        </button>
      </div>
      {pop && (
        <Pop
          id={pop.id}
          x={Math.min(pop.x, (caixa.current?.parentElement?.clientWidth ?? 600) - 260)}
          y={pop.y}
          opcoes={
            pop.id === 'ordem'
              ? ORDENS.map(([k, t]) => [k, t, 0] as [string, string, number])
              : opcoesDaFaceta(pop.id, itens, consulta(texto), filtros, base, soPrincipais)
          }
          atual={pop.id === 'ordem' ? ordem : (filtros[pop.id] ?? '')}
          escolher={(v) => {
            if (pop.id === 'ordem') b.mudarOrdem(v as Ordem);
            else b.mudarFiltro(pop.id, v);
            setPop(null);
            document.getElementById('filtro')?.focus();
          }}
        />
      )}
    </>
  );
}

function Pop(p: {
  id: PopId;
  x: number;
  y: number;
  opcoes: [string, string, number][];
  atual: string;
  escolher: (v: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const caixa = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const comBusca = p.opcoes.length > 12;
  useEffect(() => {
    if (comBusca) caixa.current?.focus();
    else (lista.current?.querySelector<HTMLButtonElement>('.ativo') ?? lista.current?.querySelector('button'))?.focus();
  }, [comBusca]);
  const w = normal(busca);
  const vistas = p.opcoes.filter(([v, t]) => !w || !v || normal(t).includes(w)).slice(0, 200);
  return (
    <div id="bib-pop" style={{ left: p.x + 'px', top: p.y + 'px' }}>
      <input
        className="pop-busca"
        ref={caixa}
        placeholder="procurar…"
        autoComplete="off"
        spellCheck={false}
        hidden={!comBusca}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={(e) => {
          if (e.code !== 'Enter') return;
          const o = vistas.find(([v]) => v) ?? vistas[0];
          if (o) p.escolher(o[0]);
        }}
      />
      <div className="pop-lista" ref={lista}>
        {vistas.map(([v, t, c]) => (
          <button key={v || '-'} className={v === p.atual ? 'ativo' : ''} data-v={v} onClick={() => p.escolher(v)}>
            <span>{t}</span>
            {c ? <small>{c.toLocaleString('pt-BR')}</small> : null}
          </button>
        ))}
        {!vistas.length && <p className="dica">nada com esse nome</p>}
      </div>
    </div>
  );
}

/** O que a base sabe do jogo selecionado, em botõezinhos: tocar num deles filtra a lista por ele. */
export function MetaDoJogo({ item }: { item: ItemBiblioteca | undefined }) {
  const m = item?.meta;
  if (!m) return <p id="info-meta" hidden></p>;
  const b = usarBiblioteca.getState();
  const chips: [FacetaId, string, string][] = [];
  m.generos.forEach((g) => chips.push(['genero', g, g]));
  if (m.ano) chips.push(['decada', decada(m.ano), String(m.ano)]);
  [...new Set([m.publicou, m.desenvolveu].filter(Boolean))].forEach((e) => chips.push(['empresa', e, e]));
  if (m.serie) chips.push(['serie', m.serie, 'série ' + m.serie]);
  if (m.jogadores > 1) chips.push(['jogadores', m.jogadores >= 4 ? '4' : '2', m.jogadores + ' jogadores']);
  return (
    <p id="info-meta">
      {chips.map(([id, v, t]) => (
        <button key={id + v} className="chip" title="mostrar só esses" onClick={() => b.mudarFiltro(id, v)}>
          {t}
        </button>
      ))}
    </p>
  );
}
