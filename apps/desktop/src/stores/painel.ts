// 🎛 Painel de imagem (gaveta #visual do antigo): Simples (cartões com a prévia do jogo em cada estilo, intensidade,
// nitidez e brilho) e Avançado (todos os ajustes por grupo, busca, ↺), comparar antes|depois, ⭐ meus jeitos, .kofvisual,
// e lembrar o jeito por console e por jogo. O jogo continua rodando atrás.
import { cartelaTeste, KofVisual, type Valores } from '@kof/engine';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { depoisDeAbrirJogo, usarJogo } from './jogo';
import { renderAtual, usarVisual } from './visual';

export interface MeuJeito {
  nome: string;
  v: Valores;
}

export const meusJeitos = (): MeuJeito[] => {
  try {
    const l = JSON.parse(config().ler('visualMeus') ?? '[]') as MeuJeito[];
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
};

/** Intensidade: aproxima ou afasta tudo do padrão (100% = o estilo como veio); nitidez e brilho têm barra própria. */
export function escalarVisual(base: Valores, k: number): Valores {
  const v = { ...base };
  for (const a of KofVisual.AJUSTES) {
    if (a[7] || a[0] === 'brilho' || a[0] === 'nitidez') continue;
    v[a[0]] = Math.min(a[4], Math.max(a[3], a[6] + ((base[a[0]] ?? a[6]) - a[6]) * k));
  }
  return v;
}

export interface Painel {
  aberto: boolean;
  modo: 'simples' | 'avancado';
  cat: string;
  grupo: string;
  busca: string;
  comparar: 0 | 1 | 2;
  /** intensidade (Simples) e o estilo de onde ela parte */
  k: number;
  base: Valores | null;
  /** sem jogo: mostrando a imagem de teste */
  vazio: boolean;
  alternar: () => void;
  abrir: () => void;
  fechar: () => void;
  set: (p: Partial<Painel>) => void;
  mexeu: (v: Valores, pre?: string) => void;
  usarPre: (id: string) => void;
  usarMeu: (m: MeuJeito) => void;
  salvarMeu: () => void;
  apagarMeu: (nome: string) => void;
  zerar: () => void;
  exportar: () => void;
  importar: () => void;
  mudarComparar: (m: 0 | 1 | 2) => void;
}

const jogoId = () => usarJogo.getState().registro?.id ?? null;
const sistema = () => usarJogo.getState().info?.sistema ?? null;

export function guardarPorJogo() {
  const id = jogoId();
  if (id && config().ler('visual.jogo.' + id))
    config().guardar(
      'visual.jogo.' + id,
      JSON.stringify({ pre: usarVisual.getState().pre, v: usarVisual.getState().v }),
    );
}
export function guardarPorSis() {
  const s = sistema();
  if (s && config().ler('visualPorSis') === '1')
    config().guardar('visual.' + s, JSON.stringify({ pre: usarVisual.getState().pre, v: usarVisual.getState().v }));
  guardarPorJogo();
}

/** Ao abrir um jogo: o jeito dele (se tem) ou o do console (se a opção está ligada). */
export function visualDoSistema() {
  const id = jogoId();
  const s = sistema();
  try {
    const j = JSON.parse((id && config().ler('visual.jogo.' + id)) || 'null') as { pre: string; v: Valores } | null;
    if (j?.v) return usarVisual.getState().aplicar(j.v, j.pre);
  } catch {
    // esse jogo não tem jeito próprio
  }
  if (config().ler('visualPorSis') !== '1' || !s) return;
  try {
    const v = JSON.parse(config().ler('visual.' + s) ?? 'null') as { pre: string; v: Valores } | null;
    if (v?.v) usarVisual.getState().aplicar(v.v, v.pre);
  } catch {
    // nada guardado pra esse console
  }
}

let piscar: ReturnType<typeof setInterval> | undefined;

function baixar(nome: string, u8: Uint8Array) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u8 as Uint8Array<ArrayBuffer>], { type: 'application/json' }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export const usarPainel = create<Painel>()((set, get) => ({
  aberto: false,
  modo: config().ler('visModo') === 'avancado' ? 'avancado' : 'simples',
  cat: 'Todos',
  grupo: 'Pixels',
  busca: '',
  comparar: 0,
  k: 1,
  base: null,
  vazio: false,
  set: (p) => {
    if (p.modo) config().guardar('visModo', p.modo);
    set(p);
  },
  alternar: () => (get().aberto ? get().fechar() : get().abrir()),
  abrir: () => {
    if (get().aberto) return;
    usarJogo.getState().fecharRapido();
    const vazio = !usarJogo.getState().jogo;
    if (vazio) {
      document.body.classList.remove('vazio');
      const r = renderAtual();
      const c = cartelaTeste();
      r?.desenhar(c, 256, 224);
      r?.desenhar(c, 256, 224);
    }
    document.body.classList.add('com-visual');
    set({ aberto: true, vazio });
    dispatchEvent(new Event('resize')); // a tela do jogo encolhe pro painel caber
  },
  fechar: () => {
    if (!get().aberto) return;
    clearInterval(piscar);
    const r = renderAtual();
    if (r) {
      r.divisao = 0;
      r.pintar(false);
    }
    document.body.classList.remove('com-visual');
    if (get().vazio && !usarJogo.getState().jogo) document.body.classList.add('vazio');
    set({ aberto: false, comparar: 0 });
    dispatchEvent(new Event('resize'));
  },
  mexeu: (v, pre) => {
    const atual = usarVisual.getState().pre;
    usarVisual.getState().aplicar(v, pre ?? (atual.startsWith('meu') ? 'meu' : atual));
    guardarPorSis();
  },
  usarPre: (id) => {
    usarVisual.getState().filtro(id);
    set({ base: null, k: 1 });
    guardarPorSis();
  },
  usarMeu: (m) => {
    usarVisual.getState().aplicar(m.v, 'meu:' + m.nome);
    set({ base: null, k: 1 });
    guardarPorSis();
  },
  salvarMeu: () => {
    const nome = (prompt('Nome do seu jeito (ex.: "Minha TV"):', '') ?? '').trim().slice(0, 24);
    if (!nome) return;
    const v = usarVisual.getState().v;
    const l = meusJeitos().filter((m) => m.nome !== nome);
    l.push({ nome, v });
    config().guardar('visualMeus', JSON.stringify(l));
    usarVisual.getState().aplicar(v, 'meu:' + nome);
    usarAvisos.getState().avisar('⭐ "' + nome + '" guardado nas predefinições');
  },
  apagarMeu: (nome) => {
    if (!confirm('Apagar "' + nome + '"?')) return;
    config().guardar('visualMeus', JSON.stringify(meusJeitos().filter((m) => m.nome !== nome)));
    set({});
  },
  zerar: () => get().usarPre('original'),
  exportar: () => {
    const { pre, v } = usarVisual.getState();
    const nome = pre.startsWith('meu:') ? pre.slice(4) : pre === 'meu' ? 'meu-jeito' : pre;
    const dados = new TextEncoder().encode(JSON.stringify({ kofvisual: 1, nome, v }, null, 1));
    baixar(nome.replace(/[^\w-]+/g, '-') + '.kofvisual', dados);
  },
  importar: () => {
    const e = document.createElement('input');
    e.type = 'file';
    e.accept = '.kofvisual,.json';
    e.onchange = async () => {
      try {
        const f = e.files?.[0];
        if (!f) return;
        await importarKofvisual(await f.text());
      } catch (x) {
        usarAvisos
          .getState()
          .avisar('📥 não deu pra ler esse arquivo: ' + (x instanceof Error ? x.message : String(x)), 5000);
      }
    };
    e.click();
  },
  mudarComparar: (m) => {
    clearInterval(piscar);
    const r = renderAtual();
    if (!r) return set({ comparar: m });
    r.divisao = m === 1 ? 0.5 : 0;
    if (m === 2)
      piscar = setInterval(() => {
        r.divisao = r.divisao ? 0 : 1.01;
        r.pintar(false);
      }, 700);
    r.pintar(false);
    set({ comparar: m });
  },
}));

/** Um estilo .kofvisual (o mesmo formato do antigo: {kofvisual: 1, nome, v}) vira um ⭐ meu e já é aplicado. */
export async function importarKofvisual(texto: string): Promise<void> {
  const o = JSON.parse(texto) as { nome?: string; v?: Valores } | null;
  if (!o?.v) throw new Error('não é um estilo do KOFstation');
  const nome = String(o.nome || 'importado').slice(0, 24);
  const l = meusJeitos().filter((m) => m.nome !== nome);
  l.push({ nome, v: o.v });
  config().guardar('visualMeus', JSON.stringify(l));
  usarVisual.getState().aplicar(o.v, 'meu:' + nome);
  guardarPorSis();
  usarPainel.getState().set({ modo: 'simples', cat: '⭐ Meus' });
  usarAvisos.getState().avisar('📥 estilo "' + nome + '" importado', 3000);
}

depoisDeAbrirJogo.add(() => {
  visualDoSistema();
  const r = renderAtual();
  if (r) r.ligaIni = performance.now();
});
