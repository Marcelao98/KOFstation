// O jeito da imagem (painel de imagem do antigo): a predefinição escolhida (ou "meu", "meu:<nome>") e os valores de cada
// ajuste, guardados em `visual` (mesmo formato do antigo: {pre, v}). Quem desenha é o RenderizadorVisual (engine).
import { KofVisual, type RenderizadorVisual, type Valores } from '@kof/engine';
import { create } from 'zustand';
import { config } from './config';

export const FILTROS: [string, string][] = KofVisual.PREDEF.map(([k, n]) => [k, n]);

let render: RenderizadorVisual | null = null;
export const renderAtual = (): RenderizadorVisual | null => render;
export function usarRender(r: RenderizadorVisual | null) {
  render = r;
  if (r) r.aplicar(usarVisual.getState().v);
}

function lerGuardado(): { pre: string; v: Valores } {
  try {
    const d = JSON.parse(config().ler('visual') ?? 'null') as { pre?: string; v?: Valores } | null;
    if (d?.v) return { pre: d.pre ?? 'meu', v: { ...KofVisual.PADRAO, ...d.v } };
  } catch {
    // sem ajuste salvo (ou estragado): cai no filtro antigo ou no original
  }
  const antigo = config().ler('filtro') ?? '';
  const pre = KofVisual.ANTIGO[antigo] ?? (FILTROS.some(([k]) => k === antigo) ? antigo : 'original');
  return { pre, v: KofVisual.valores(pre) };
}

export interface EstadoVisual {
  pre: string;
  v: Valores;
  aplicar: (v: Valores, pre?: string) => void;
  filtro: (nome: string) => void;
}

export const usarVisual = create<EstadoVisual>()((set) => ({
  ...lerGuardado(),
  aplicar: (v, pre) => {
    const novo = { pre: pre || 'meu', v: { ...KofVisual.PADRAO, ...v } };
    config().guardar('visual', JSON.stringify(novo));
    set(novo);
    render?.aplicar(novo.v);
  },
  filtro: (nome) => {
    const pre = KofVisual.ANTIGO[nome] ?? (FILTROS.some(([k]) => k === nome) ? nome : 'original');
    usarVisual.getState().aplicar(KofVisual.valores(pre), pre);
  },
}));
