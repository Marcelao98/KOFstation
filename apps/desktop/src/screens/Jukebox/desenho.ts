// Desenho da jukebox (app.js 1438–1690 do antigo): osciloscópio de cada canal (gatilho na subida, estilo do tema) e o
// piano das notas (cada canal vira retângulos; a nota sai da onda pelo método YIN, o dos afinadores).

export const TAM_ONDA = 2048;
export interface Ondas {
  ondas: Int16Array;
  ouvido: number;
}

const ESTILO_TEMA: Record<string, string> = {
  portatil: 'pixel',
  terminal: 'neon',
  neon: 'neon',
  vapor: 'neon',
  cinza32: 'pixel',
  zsnes: 'pixel',
  super16: 'pixel',
  latte: 'preenchido',
  claro: 'preenchido',
  branco: 'preenchido',
  cappuccino: 'preenchido',
  cafe: 'fio',
  espresso: 'fio',
};

export function hslDe(cor: string): [number, number, number] {
  const m = /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(cor) ?? /#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(cor);
  if (!m) return [0, 0, 50];
  const [r, g, b] = [1, 2, 3].map((k) => {
    const x = m[k] ?? '0';
    return parseInt(x.length === 1 ? x + x : x, 16) / 255;
  }) as [number, number, number];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  let h = 0;
  let sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [(h + 360) % 360, sat * 100, l * 100];
}

const css = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

export function estiloOndas(escolhido: string): string {
  if (escolhido) return escolhido;
  const t = document.documentElement.dataset.tema ?? '';
  if (ESTILO_TEMA[t]) return ESTILO_TEMA[t];
  return hslDe(css('--fundo'))[2] > 55 ? 'preenchido' : 'fio'; // tema claro: área preenchida; escuro: fio
}

export interface Cores {
  canal: string[];
  fraca: string;
  borda: string;
}

export function coresDosCanais(n: number, estilo: string): Cores {
  const [h, sat, l] = hslDe(css('--destaque'));
  const mono = sat < 25 || estilo === 'pixel';
  const canal = Array.from({ length: n }, (_, i) =>
    mono
      ? css('--destaque')
      : `hsl(${(h + (i - n / 2) * (n > 4 ? 22 : 40) + 360) % 360} ${Math.max(45, sat)}% ${Math.min(Math.max(l, 45), 70)}%)`,
  );
  return { canal, fraca: css('--fraco') || '#888', borda: css('--borda') || '#444' };
}

function prepararCanvas(cv: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(cv.clientWidth * dpr);
  const H = Math.round(cv.clientHeight * dpr);
  if (!W || !H) return null;
  if (cv.width !== W || cv.height !== H) {
    cv.width = W;
    cv.height = H;
  }
  return cv.getContext('2d');
}

/** Uma faixa do osciloscópio (canal v), com 18 ms de tela. */
export function desenharOnda(
  cv: HTMLCanvasElement,
  o: Ondas | null,
  v: number,
  taxa: number,
  escala: number,
  cor: string,
  cores: Cores,
  est: string,
) {
  const g = prepararCanvas(cv);
  if (!g) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width;
  const H = cv.height;
  const meio = H * 0.56;
  const alt = H * 0.38;
  g.clearRect(0, 0, W, H);
  g.globalAlpha = 0.3;
  g.strokeStyle = cores.borda;
  g.lineWidth = dpr;
  g.beginPath();
  g.moveTo(0, meio);
  g.lineTo(W, meio);
  g.stroke();
  g.globalAlpha = 1;
  if (!o) return;
  const N = Math.min(Math.round(taxa * 0.018), TAM_ONDA / 3);
  const base = v * TAM_ONDA;
  const at = (k: number) => o.ondas[base + TAM_ONDA - 1 - Math.min(TAM_ONDA - 1, k)] ?? 0; // k amostras atrás da mais nova
  let media = 0;
  for (let k = 0; k < N * 2; k++) media += at(k);
  media /= N * 2;
  let ini = N;
  for (let k = N; k < Math.min(TAM_ONDA - 2, N * 3); k++)
    if (at(k + 1) < media && at(k) >= media) {
      ini = k;
      break;
    }
  const cols = est === 'pixel' ? 96 : Math.min(W, 480);
  const ys = new Float32Array(cols + 1);
  for (let i = 0; i <= cols; i++) {
    let y = (at(Math.max(0, ini - Math.round((i / cols) * (N - 1)))) - media) * escala;
    y = Math.max(-1.2, Math.min(1.2, y));
    if (est === 'pixel') y = Math.round(y * 7) / 7;
    ys[i] = meio - y * alt;
  }
  g.lineJoin = 'round';
  if (est === 'preenchido') {
    g.beginPath();
    g.moveTo(0, meio);
    for (let i = 0; i <= cols; i++) g.lineTo((i / cols) * W, ys[i] ?? meio);
    g.lineTo(W, meio);
    g.closePath();
    g.globalAlpha = 0.3;
    g.fillStyle = cor;
    g.fill();
    g.globalAlpha = 1;
  }
  if (est === 'neon') {
    g.shadowColor = cor;
    g.shadowBlur = 12 * dpr;
  }
  g.strokeStyle = cor;
  g.lineWidth = (est === 'fio' ? 1.6 : est === 'pixel' ? 3 : 2.2) * dpr;
  g.beginPath();
  if (est === 'pixel') {
    const bl = Math.max(2, Math.round(3 * dpr));
    const q = (y: number) => Math.round(y / bl) * bl;
    g.moveTo(0, q(ys[0] ?? meio));
    for (let i = 1; i <= cols; i++) {
      const x = q((i / cols) * W);
      g.lineTo(x, q(ys[i - 1] ?? meio));
      g.lineTo(x, q(ys[i] ?? meio));
    }
  } else
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * W;
      if (i) g.lineTo(x, ys[i] ?? meio);
      else g.moveTo(x, ys[i] ?? meio);
    }
  g.stroke();
  g.shadowBlur = 0;
}

// ---------- piano das notas ----------
interface Segmento {
  tipo: number | 'r';
  nota: number;
  ini: number;
  fim: number;
  vol: number;
}
export interface Piano {
  canais: { seg: Segmento[]; ultimo: Segmento | null }[];
  t: number;
  faixa: [number, number];
}
export const novoPiano = (n: number): Piano => ({
  canais: Array.from({ length: n }, () => ({ seg: [], ultimo: null })),
  t: -1,
  faixa: [48, 84],
});
const NOTAS_SEG = 6;

/** A nota do canal (YIN: diferença da onda com ela mesma atrasada; o 1º vale abaixo de 0,15 é o período). */
export function notaDoCanal(
  o: Int16Array,
  v: number,
  taxa: number,
  escala: number,
): { nota: number; vol: number; meio: number; ruido?: boolean } | null {
  const D = Math.max(1, Math.round(taxa / 11025));
  const N = Math.min(512, Math.floor((TAM_ONDA - 8) / D));
  const x = new Float32Array(N);
  let media = 0;
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = 0; k < D; k++) s += o[v * TAM_ONDA + TAM_ONDA - 1 - i * D - k] ?? 0;
    x[i] = (s / D) * escala;
    media += x[i] ?? 0;
  }
  media /= N;
  let rms = 0;
  for (let i = 0; i < N; i++) {
    x[i] = (x[i] ?? 0) - media;
    rms += (x[i] ?? 0) ** 2;
  }
  rms = Math.sqrt(rms / N);
  if (rms < 0.01) return null; // silêncio
  const W = N >> 1;
  const dd = new Float32Array(W);
  let soma = 0;
  let tau = -1;
  for (let t = 1; t < W; t++) {
    let d = 0;
    for (let j = 0; j < W; j++) {
      const e = (x[j] ?? 0) - (x[j + t] ?? 0);
      d += e * e;
    }
    soma += d;
    dd[t] = soma ? (d * t) / soma : 1;
    if (tau < 0 && t > 2 && (dd[t - 1] ?? 1) < 0.15 && (dd[t] ?? 1) > (dd[t - 1] ?? 1)) tau = t - 1;
  }
  if (tau < 0) return { ruido: true, nota: 0, vol: rms, meio: (N * D) / 2 / taxa };
  const a = dd[tau - 1] ?? 1;
  const b = dd[tau] ?? 1;
  const c = dd[tau + 1] ?? b;
  const den = a - 2 * b + c;
  const f = taxa / D / (tau + (den ? (a - c) / (2 * den) : 0));
  return { nota: 69 + 12 * Math.log2(f / 440), vol: rms, meio: (N * D) / 2 / taxa };
}

/** Junta as notas do momento na história de cada canal. */
export function analisarNotas(p: Piano, o: Int16Array, t: number, mudas: number, taxa: number, escalas: number[]) {
  if (t < p.t || t - p.t > 2) p.canais.forEach((n) => ((n.seg = []), (n.ultimo = null))); // música nova ou pulo
  if (t === p.t) return;
  p.t = t;
  p.canais.forEach((n, v) => {
    const r = mudas & (1 << v) ? null : notaDoCanal(o, v, taxa, escalas[v] ?? 1 / 7680);
    const u = n.ultimo;
    if (!r) {
      n.ultimo = null;
      return;
    }
    const tipo = r.ruido ? 'r' : Math.round(r.nota);
    const tc = t - r.meio;
    if (u && u.tipo === tipo && tc - u.fim < 0.1) {
      u.fim = tc;
      u.vol = Math.max(u.vol * 0.97, r.vol);
    } else {
      n.ultimo = { tipo, nota: r.ruido ? 0 : r.nota, ini: tc, fim: tc + 1 / 60, vol: r.vol };
      n.seg.push(n.ultimo);
    }
    while (n.seg.length && (n.seg[0]?.fim ?? 0) < t - NOTAS_SEG - 1) n.seg.shift();
  });
}

export function desenharNotas(
  cv: HTMLCanvasElement,
  p: Piano,
  agoraT: number,
  mudas: number,
  cores: Cores,
  est: string,
) {
  const g = prepararCanvas(cv);
  if (!g) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.width;
  const H = cv.height;
  g.clearRect(0, 0, W, H);
  const t = agoraT;
  let mn = 1e9;
  let mx = -1e9;
  p.canais.forEach((n) =>
    n.seg.forEach((s) => {
      if (s.tipo !== 'r') {
        mn = Math.min(mn, s.nota);
        mx = Math.max(mx, s.nota);
      }
    }),
  );
  if (mn < 1e9) {
    const meio = (mn + mx) / 2;
    const alc = Math.max(24, mx - mn + 6);
    p.faixa[0] += (meio - alc / 2 - p.faixa[0]) * 0.05;
    p.faixa[1] += (meio + alc / 2 - p.faixa[1]) * 0.05;
  }
  const TEC = Math.round(34 * dpr);
  const BAT = Math.round(H * 0.12);
  const alto = H - BAT;
  const [n0, n1] = p.faixa;
  const px = alto / (n1 - n0);
  const yDe = (nota: number) => alto - (nota - n0) * px;
  const agora = W - Math.round(W * 0.12);
  const xDe = (s: number) => agora - ((t - s) * (agora - TEC)) / NOTAS_SEG;
  const preta = (k: number) => [1, 3, 6, 8, 10].includes(((k % 12) + 12) % 12);
  const tocando: Record<number, string> = {};
  p.canais.forEach((n, v) => {
    for (const s of n.seg)
      if (s.tipo !== 'r' && s.ini <= t && t <= s.fim + 0.02) tocando[s.tipo] = cores.canal[v] ?? cores.fraca;
  });
  for (let k = Math.floor(n0); k <= Math.ceil(n1); k++) {
    const y = yDe(k + 0.5);
    const h = px;
    if (preta(k)) {
      g.globalAlpha = 0.06;
      g.fillStyle = cores.fraca;
      g.fillRect(TEC, y, W - TEC, h);
    }
    g.globalAlpha = 1;
    g.fillStyle = tocando[k] ?? (preta(k) ? '#222' : '#eee');
    g.fillRect(0, y, preta(k) ? TEC * 0.62 : TEC, h - (preta(k) ? 0 : 1));
    if (((k % 12) + 12) % 12 === 0 && px > 5 * dpr) {
      g.fillStyle = '#666';
      g.font = `${Math.round(Math.min(px, 10 * dpr))}px sans-serif`;
      g.fillText('C' + (Math.floor(k / 12) - 1), TEC * 0.66, y + h * 0.8);
    }
  }
  g.globalAlpha = 0.5;
  g.fillStyle = cores.borda;
  g.fillRect(TEC, alto, W - TEC, 1);
  g.fillRect(agora, 0, Math.max(1, dpr), H);
  g.globalAlpha = 1;
  const bl = Math.max(2, Math.round(4 * dpr));
  p.canais.forEach((n, v) => {
    const cor = mudas & (1 << v) ? cores.fraca : (cores.canal[v] ?? cores.fraca);
    for (const s of n.seg) {
      let x0 = Math.max(TEC, xDe(s.ini));
      let x1 = Math.min(W, xDe(s.fim));
      if (x1 < TEC || x0 > W) continue;
      const viva = s.ini <= t && t <= s.fim + 0.02;
      const a = Math.min(1, 0.35 + s.vol * 2.2);
      let y: number;
      let h: number;
      if (s.tipo === 'r') {
        h = Math.max(3 * dpr, BAT * Math.min(1, s.vol * 4));
        y = alto + (BAT - h) / 2;
      } else {
        h = Math.max(3 * dpr, px * 0.8);
        y = yDe(s.nota + 0.4);
      }
      if (est === 'pixel') {
        x0 = Math.floor(x0 / bl) * bl;
        x1 = Math.ceil(x1 / bl) * bl;
        y = Math.round(y / bl) * bl;
        h = Math.max(bl, Math.round(h / bl) * bl);
      }
      g.globalAlpha = viva ? 1 : a * 0.85;
      if (viva && est !== 'pixel') {
        g.shadowColor = cor;
        g.shadowBlur = (est === 'neon' ? 18 : 8) * dpr;
      }
      g.fillStyle = cor;
      if (est === 'fio') {
        g.strokeStyle = cor;
        g.lineWidth = 1.4 * dpr;
        g.globalAlpha *= 0.45;
        g.fillRect(x0, y, Math.max(2, x1 - x0), h);
        g.globalAlpha = viva ? 1 : a;
        g.strokeRect(x0, y, Math.max(2, x1 - x0), h);
      } else g.fillRect(x0, y, Math.max(2, x1 - x0), h);
      g.shadowBlur = 0;
    }
  });
  g.globalAlpha = 1;
}
