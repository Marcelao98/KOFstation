// Os comandos do Rust, imitados em memória pro backend de teste. Cada etapa acrescenta os seus aqui (o mesmo nome,
// os mesmos argumentos e os mesmos códigos de erro de crates/kof-app/src/api.rs). Os testes de fluxo enchem a Kof
// Games falsa por `window.__kofTeste` (só existe com este backend, nunca no app de verdade).
import { cdPs1, crcRom, extensao, isoDePs2, itensDoZipInteiro, PASTAS_CONSOLE, type SistemaId } from '@kof/domain';

export type ComandoTeste = (args: Record<string, unknown>, dados: Uint8Array) => unknown;

const NIVEIS = ['error', 'warn', 'info', 'debug'];
const erro = (code: string, message: string) => ({ code, message });

export interface KofTeste {
  /** arquivos da Kof Games falsa (caminho relativo à raiz → bytes) */
  arquivos: Map<string, Uint8Array>;
  raiz: string | null;
  log: unknown[];
}

export function criarComandosTeste(): Record<string, ComandoTeste> {
  const t: KofTeste = { arquivos: new Map(), raiz: null, log: [] };
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
    'file.read': (a) => {
      if (a.scope !== 'kof-games') throw erro('INVALID_ARGS', `escopo desconhecido: ${String(a.scope)}`);
      precisaRaiz();
      const b = pegar(String(a.path));
      const o = Number(a.offset ?? 0);
      return b.slice(o, a.length === undefined ? undefined : o + Number(a.length));
    },
  };
}
