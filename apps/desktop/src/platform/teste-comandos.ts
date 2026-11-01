// Os comandos do Rust, imitados em memória pro backend de teste. Cada etapa acrescenta os seus aqui (o mesmo nome,
// os mesmos argumentos e os mesmos códigos de erro de crates/kof-app/src/api.rs). Os testes de fluxo enchem a Kof
// Games falsa por `window.__kofTeste` (só existe com este backend, nunca no app de verdade).
import { cdPs1, crcRom, extensao, isoDePs2, itensDoZipInteiro, PASTAS_CONSOLE, type SistemaId } from '@kof/domain';

export type ComandoTeste = (args: Record<string, unknown>, dados: Uint8Array) => unknown;

const NIVEIS = ['error', 'warn', 'info', 'debug'];
const erro = (code: string, message: string) => ({ code, message });

const LOJAS = ['jogos', 'saves', 'estados', 'autos', 'stats', 'musicas', 'capas', 'visual', 'roms'];

export interface KofTeste {
  /** arquivos da Kof Games falsa (caminho relativo à raiz → bytes) */
  arquivos: Map<string, Uint8Array>;
  raiz: string | null;
  log: unknown[];
  /** lojas: loja → chave → [meta, bytes] */
  lojas: Map<string, Map<string, [unknown, Uint8Array]>>;
  /** capas oficiais de mentira (nome do jogo → png) */
  capas: Map<string, Uint8Array>;
}

export function criarComandosTeste(): Record<string, ComandoTeste> {
  const t: KofTeste = { arquivos: new Map(), raiz: null, log: [], lojas: new Map(), capas: new Map() };
  const loja = (a: Record<string, unknown>) => {
    const n = String(a.store);
    if (!LOJAS.includes(n)) throw erro('INVALID_ARGS', `loja desconhecida: ${n}`);
    let m = t.lojas.get(n);
    if (!m) t.lojas.set(n, (m = new Map()));
    return m;
  };
  const registro = (a: Record<string, unknown>) => {
    const r = loja(a).get(String(a.key));
    if (!r) throw erro('NOT_FOUND', `${String(a.store)}/${String(a.key)}`);
    return r;
  };
  (globalThis as { __kofTeste?: KofTeste }).__kofTeste = t;
  const infoRaiz = () => ({
    path: t.raiz,
    ok: !!t.raiz,
    missing: t.raiz ? [] : ['Games', 'Novos', 'Config', 'Saves'],
    sugestao: '/home/teste/Kof Games',
  });
  const precisaRaiz = () => {
    if (!t.raiz) throw erro('ROOT_MISSING', 'a pasta Kof Games ainda não foi escolhida');
  };
  const pegar = (p: string) => {
    if (p.includes('..') || p.startsWith('/')) throw erro('PATH_OUTSIDE_SCOPE', p);
    const b = t.arquivos.get(p);
    if (!b) throw erro('NOT_FOUND', p);
    return b;
  };
  return {
    'log.write': (a) => {
      if (!NIVEIS.includes(a.level as string)) throw erro('INVALID_LEVEL', `nível de log inválido: ${String(a.level)}`);
      t.log.push(a);
      return null;
    },
    'library.root.get': () => infoRaiz(),
    'library.root.set': (a) => {
      const p = String(a.path ?? '');
      if (!p.startsWith('/')) throw erro('INVALID_ARGS', 'use o caminho completo da pasta');
      const nome = p.split('/').pop()?.toLowerCase() ?? '';
      if (['kofstation', 'games', 'novos', 'config', 'saves', ...PASTAS_CONSOLE].includes(nome))
        throw erro('INNER_FOLDER', p);
      t.raiz = p;
      return infoRaiz();
    },
    'library.scan': async (a) => {
      precisaRaiz();
      const exts = new Set((a.exts as string[]).map((e) => e.toLowerCase()));
      const files = [];
      for (const [path, b] of [...t.arquivos].sort((x, y) => x[0].toLowerCase().localeCompare(y[0].toLowerCase()))) {
        const partes = path.split('/');
        if (partes[0] !== 'Games' || partes.length > 4 || !exts.has(extensao(path))) continue;
        const f: Record<string, unknown> = { path, size: b.length, modified: 1 };
        const e = extensao(path);
        if (e === 'zip') f.zip = itensDoZipInteiro(b);
        else if (['bin', 'img', 'iso'].includes(e) && b.length > 0x9000) {
          const ps2 = e !== 'bin' && (await isoDePs2(async (o, n) => b.slice(o, o + n)));
          f.cd = ps2 ? 'ps2' : cdPs1(b.subarray(0, 0x9001)) ? 'ps1' : null;
        }
        files.push(f);
      }
      return { root: t.raiz, files };
    },
    'library.crc': (a) => {
      precisaRaiz();
      const crcs: Record<string, string> = {};
      for (const i of a.items as { path: string; sistema: SistemaId }[])
        crcs[i.path] = crcRom(i.sistema, pegar(i.path));
      return { crcs };
    },
    'library.inventory': async () => {
      precisaRaiz();
      const files = [];
      const dirs = new Set<string>();
      for (const [path, b] of t.arquivos) {
        if (!/^(Games|Novos)\//.test(path)) continue;
        const partes = path.split('/');
        for (let i = 2; i < partes.length; i++) dirs.add(partes.slice(0, i).join('/'));
        const f: Record<string, unknown> = { path, size: b.length, modified: 1 };
        if (extensao(path) === 'zip') f.zip = itensDoZipInteiro(b);
        if (extensao(path) === 'cue')
          f.cue = [...new TextDecoder().decode(b).matchAll(/FILE\s+"([^"]+)"/gi)].map((m) => m[1]);
        files.push(f);
      }
      return { files, dirs: [...dirs] };
    },
    'library.organize.apply': (a) => {
      precisaRaiz();
      const done = [];
      const failed = [];
      for (const m of a.moves as { from: string; to: string }[]) {
        const lista = [...t.arquivos.keys()].filter((k) => k === m.from || k.startsWith(m.from + '/'));
        if (!lista.length) {
          failed.push({ move: m, code: 'NOT_FOUND', message: m.from });
          continue;
        }
        const base = m.from.slice(0, m.from.lastIndexOf('/') + 1);
        for (const k of lista) {
          let novo = m.to + '/' + k.slice(base.length);
          for (let i = 2; t.arquivos.has(novo); i++) novo = novo.replace(/( \(\d+\))?(\.[^./]+)?$/, ` (${i})$2`);
          t.arquivos.set(novo, t.arquivos.get(k) as Uint8Array);
          t.arquivos.delete(k);
        }
        done.push(m);
      }
      return { done, failed, removed: [] };
    },
    'library.import': (a, dados) => {
      precisaRaiz();
      const p = `Games/${String(a.pasta)}/${String(a.nome)}`;
      if (t.arquivos.get(p)?.length === dados.length) return { stored: null };
      t.arquivos.set(p, dados.slice());
      return { stored: p };
    },
    // a configuração do backend de teste sobrevive ao recarregar a página (como o arquivo do Rust)
    'config.read': (a) => {
      if (a.doc !== 'config') throw erro('INVALID_ARGS', `documento desconhecido: ${String(a.doc)}`);
      try {
        return JSON.parse(sessionStorage.getItem('kofstation-teste.config') ?? 'null') ?? { versao: 1, valores: {} };
      } catch {
        return { versao: 1, valores: {} };
      }
    },
    'config.write': (a) => {
      const d = a.data as { versao?: number; valores?: Record<string, unknown> };
      if ((d.versao ?? 1) > 1) throw erro('SCHEMA_TOO_NEW', 'config');
      if (!d.valores || Object.values(d.valores).some((v) => typeof v !== 'string'))
        throw erro('INVALID_ARGS', 'valores têm que ser texto');
      try {
        sessionStorage.setItem('kofstation-teste.config', JSON.stringify({ versao: 1, valores: d.valores }));
      } catch {
        // sem sessionStorage: a configuração vale só até recarregar
      }
      return null;
    },
    'store.list': (a) =>
      [...loja(a)]
        .filter(([k]) => !a.prefix || k.startsWith(String(a.prefix)))
        .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
        .map(([key, [meta, b]]) => ({ key, meta: structuredClone(meta), size: b.length })),
    'store.get': (a) => registro(a)[1].slice(),
    'store.meta': (a) => structuredClone(registro(a)[0]),
    'store.put': (a, dados) => {
      loja(a).set(String(a.key), [structuredClone(a.meta ?? null), dados.slice()]);
      return null;
    },
    'store.delete': (a) => {
      loja(a).delete(String(a.key));
      return null;
    },
    'store.space': () =>
      LOJAS.map((store) => {
        const m = t.lojas.get(store) ?? new Map<string, [unknown, Uint8Array]>();
        let bytes = 0;
        for (const [, [meta, b]] of m) bytes += b.length + JSON.stringify(meta).length;
        return { store, bytes, items: m.size };
      }),
    'cover.get': (a) => {
      const png = t.capas.get(String(a.chave));
      if (!png) throw erro('NOT_FOUND', `capa ${String(a.chave)}`);
      return png.slice();
    },
    'file.read': (a) => {
      if (a.scope !== 'kof-games') throw erro('INVALID_ARGS', `escopo desconhecido: ${String(a.scope)}`);
      precisaRaiz();
      const b = pegar(String(a.path));
      const o = Number(a.offset ?? 0);
      return b.slice(o, a.length === undefined ? undefined : o + Number(a.length));
    },
  };
}
