// Os comandos do Rust, imitados em memória pro backend de teste. Cada etapa acrescenta os seus aqui (o mesmo nome,
// os mesmos argumentos e os mesmos códigos de erro de crates/kof-app/src/api.rs). Os testes de fluxo enchem a Kof
// Games falsa por `window.__kofTeste` (só existe com este backend, nunca no app de verdade).
import {
  cdPs1,
  crc32,
  crcRom,
  extensao,
  isoDePs2,
  itensDoZipInteiro,
  PASTAS_CONSOLE,
  type SistemaId,
} from '@kof/domain';

export type ComandoTeste = (args: Record<string, unknown>, dados: Uint8Array) => unknown;

const NIVEIS = ['error', 'warn', 'info', 'debug'];
const erro = (code: string, message: string) => ({ code, message });

const LOJAS = ['jogos', 'saves', 'estados', 'autos', 'stats', 'musicas', 'capas', 'visual', 'roms', 'bios'];

export interface KofTeste {
  /** arquivos da Kof Games falsa (caminho relativo à raiz → bytes) */
  arquivos: Map<string, Uint8Array>;
  raiz: string | null;
  log: unknown[];
  /** lojas: loja → chave → [meta, bytes] */
  lojas: Map<string, Map<string, [unknown, Uint8Array]>>;
  /** capas oficiais de mentira (nome do jogo → png) */
  capas: Map<string, Uint8Array>;
  /** modo diagnóstico: sessão → arquivo → texto */
  diag: Map<string, Map<string, string>>;
}

/** .zip sem compressão (o backend de teste não tem deflate; o Rust comprime). */
function zipGuardado(itens: [string, Uint8Array][]): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desl = 0;
  const cab = (sig: number, nome: Uint8Array, d: Uint8Array, ehCentral: boolean, ofs: number) => {
    const b = new Uint8Array((ehCentral ? 46 : 30) + nome.length);
    const v = new DataView(b.buffer);
    let i = 0;
    const u16 = (x: number) => (v.setUint16(i, x, true), (i += 2));
    const u32 = (x: number) => (v.setUint32(i, x >>> 0, true), (i += 4));
    u32(sig);
    if (ehCentral) u16(20);
    u16(20);
    u16(0x0800);
    u16(0);
    u16(0);
    u16(0x21);
    u32(crc32(d));
    u32(d.length);
    u32(d.length);
    u16(nome.length);
    u16(0);
    if (ehCentral) {
      u16(0);
      u16(0);
      u16(0);
      u32(0);
      u32(ofs);
    }
    b.set(nome, i);
    return b;
  };
  for (const [n, d] of itens) {
    const nome = new TextEncoder().encode(n);
    const l = cab(0x04034b50, nome, d, false, 0);
    central.push(cab(0x02014b50, nome, d, true, desl));
    partes.push(l, d);
    desl += l.length + d.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const v = new DataView(fim.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, itens.length, true);
  v.setUint16(10, itens.length, true);
  v.setUint32(12, tamCentral, true);
  v.setUint32(16, desl, true);
  const tudo = [...partes, ...central, fim];
  const r = new Uint8Array(tudo.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of tudo) {
    r.set(p, o);
    o += p.length;
  }
  return r;
}

export function criarComandosTeste(): Record<string, ComandoTeste> {
  const t: KofTeste = { arquivos: new Map(), raiz: null, log: [], lojas: new Map(), capas: new Map(), diag: new Map() };
  const sessaoDiag = (a: Record<string, unknown>) => {
    const s = t.diag.get(String(a.sessao));
    if (!s) throw erro('NOT_FOUND', `sessão de diagnóstico ${String(a.sessao)}`);
    return s;
  };
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
    'app.vivo': () => null,
    'app.atualizacao': () => ({
      versao: '',
      commit: '',
      ligado: false,
      motivo: 'rodando do código (sem versao.txt do pacote)',
      situacao: 'parado',
      baixados: 0,
      bytes: 0,
    }),
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
    'library.import.parte': (a, dados) => {
      precisaRaiz();
      const p = `Games/${String(a.pasta)}/${String(a.nome)}`;
      const offset = Number(a.offset);
      const total = Number(a.total);
      if (offset === 0 && t.arquivos.get(p)?.length === total) return { stored: p, ja: true };
      const antes = offset === 0 ? new Uint8Array(0) : (t.arquivos.get(p + '.kofparcial') ?? new Uint8Array(0));
      if (antes.length !== offset) throw erro('CONFLICT', `${String(a.nome)}: pedaço fora de ordem`);
      const junto = new Uint8Array(offset + dados.length);
      junto.set(antes);
      junto.set(dados, offset);
      if (junto.length < total) {
        t.arquivos.set(p + '.kofparcial', junto);
        return { stored: null, ja: false };
      }
      t.arquivos.delete(p + '.kofparcial');
      t.arquivos.set(p, junto);
      return { stored: p, ja: false };
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
    'diag.maquina': () => ({ sistema: 'navegador', arquitetura: 'teste', nucleos: navigator.hardwareConcurrency }),
    'diag.abrir': (a) => {
      const base = String(a.nome);
      if (!/^[\w-]{1,80}$/.test(base) || base.startsWith('-'))
        throw erro('INVALID_ARGS', `nome de sessão inválido: ${base}`);
      let nome = base;
      for (let i = 2; t.diag.has(nome); i++) nome = `${base}-${i}`;
      t.diag.set(nome, new Map([['sessao.json', JSON.stringify(a.sessao, null, 2)]]));
      return { sessao: nome };
    },
    'diag.anotar': (a, dados) => {
      const arq = String(a.arquivo);
      if (!['resumo.txt', 'quadros.csv', 'segundos.csv', 'engasgos.csv', 'log.txt'].includes(arq))
        throw erro('INVALID_ARGS', `arquivo de diagnóstico desconhecido: ${arq}`);
      const s = sessaoDiag(a);
      const txt = new TextDecoder().decode(dados);
      s.set(arq, a.trocar ? txt : (s.get(arq) ?? '') + txt);
      return { cheio: false };
    },
    'diag.listar': () =>
      [...t.diag].reverse().map(([sessao, s]) => ({
        sessao,
        bytes: [...s.values()].reduce((n, x) => n + x.length, 0),
        quando: Date.now(),
        resumo: s.get('resumo.txt')?.trimEnd() ?? null,
      })),
    'diag.exportar': (a) => {
      const sessoes = (a.sessoes as unknown[] | undefined) ?? [];
      if (!sessoes.length) throw erro('INVALID_ARGS', 'escolha pelo menos uma sessão');
      const itens: [string, Uint8Array][] = [];
      for (const n of sessoes)
        for (const [arq, txt] of sessaoDiag({ sessao: n }))
          itens.push([`${String(n)}/${arq}`, new TextEncoder().encode(txt)]);
      return zipGuardado(itens);
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
