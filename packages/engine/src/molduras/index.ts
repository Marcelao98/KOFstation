// Molduras em volta do jogo (web/molduras.js do antigo, sem mudança) e as contas da moldura (app.js bordasDe/svgMoldura).
import { KofMolduras, type CoresDoTema } from './kofmolduras.js';

export { KofMolduras };
export type { CoresDoTema, Moldura } from './kofmolduras.js';

/** Moldura PNG da pessoa: o buraco transparente do meio [x, y, w, h] e o tamanho do PNG. */
export interface MolduraPropria {
  url: string;
  buraco: [number, number, number, number];
  larg: number;
  alt: number;
}

/** Bordas (frações da altura da tela: cima, direita, baixo, esquerda) da moldura, pra uma tela de razão r. */
export function bordasDe(id: string, r: number, propria: MolduraPropria | null): [number, number, number, number] {
  if (id === 'propria' && propria) {
    const [x, y, w, h] = propria.buraco;
    const k = r / (w / h); // a largura do PNG estica pro jogo caber no buraco
    return [y / h, ((propria.larg - x - w) / h) * k, (propria.alt - y - h) / h, (x / h) * k];
  }
  return KofMolduras.LISTA.find((l) => l.id === id)?.b ?? [0, 0, 0, 0];
}

/** Desenha a moldura em volta de uma tela w × h: o fundo (CSS) e onde fica a tela. */
export function svgMoldura(id: string, w: number, h: number, anim: boolean, cores: CoresDoTema) {
  const m = KofMolduras.LISTA.find((l) => l.id === id);
  if (!m) return null;
  const [bc, bd, bb, be] = m.b;
  const W = Math.round(w + (bd + be) * h);
  const H = Math.round(h * (1 + bc + bb));
  const S = { x: be * h, y: bc * h, w, h };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${m.d(W, H, S, anim, cores)}</svg>`;
  return { url: 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")', raio: m.raio, S, W, H };
}

/** O buraco transparente do meio de um PNG (o alfa baixo, crescendo a partir do centro). */
export function buracoDoPng(
  alfa: (x: number, y: number) => number,
  larg: number,
  alt: number,
): [number, number, number, number] {
  const cx = larg >> 1;
  const cy = alt >> 1;
  if (alfa(cx, cy) > 40)
    throw new Error('o meio dessa imagem não é transparente: a moldura precisa de um buraco pra tela');
  let x0 = cx;
  let x1 = cx;
  let y0 = cy;
  let y1 = cy;
  while (x0 > 0 && alfa(x0 - 1, cy) <= 40) x0--;
  while (x1 < larg - 1 && alfa(x1 + 1, cy) <= 40) x1++;
  while (y0 > 0 && alfa(cx, y0 - 1) <= 40) y0--;
  while (y1 < alt - 1 && alfa(cx, y1 + 1) <= 40) y1++;
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
