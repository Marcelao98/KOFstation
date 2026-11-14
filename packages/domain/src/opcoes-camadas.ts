// Camadas das opções de emulação (D19/M4, M16.4): geral → console → jogo. Puro: recebe e devolve dados.
//
// - **geral**: o perfil de todos os consoles (Equilibrado, que é o que o app sempre usou);
// - **console**: o perfil do console (ou "igual ao geral") + ajustes opção por opção;
// - **jogo**: o mesmo, só pra aquele jogo (Shadow of the Colossus pode ter o dele).
// Cada camada vence a de cima. Tudo que não está no catálogo (chave ou valor desconhecido) é descartado ao ler.
import { OPCOES_DE_NUCLEO, PERFIS, valoresDoPerfil, type OpcaoDeNucleo, type Perfil } from './opcoes-nucleo';
import type { SistemaId } from './sistemas';

export interface AjustesDeCamada {
  /** ausente = herda a camada de cima */
  perfil?: Perfil;
  /** ajustes opção por opção (chave do núcleo → valor), por cima do perfil */
  opcoes?: Record<string, string>;
}

export interface EscolhasDeEmulacao {
  /** o perfil geral */
  geral: Perfil;
  consoles: Partial<Record<string, AjustesDeCamada>>;
  jogos: Record<string, Partial<Record<string, AjustesDeCamada>>>;
}

export const PERFIL_PADRAO: Perfil = 'equilibrado';

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  rapido: '⚡ Rápido',
  equilibrado: '⚖ Equilibrado',
  fiel: '🎯 Fiel',
};

export const DICA_DO_PERFIL: Record<Perfil, string> = {
  rapido: 'abre mão de fidelidade pra rodar liso em PC modesto',
  equilibrado: 'o que o KOFstation sempre usou: bom na maioria dos PCs',
  fiel: 'o mais parecido com o console de verdade, pesa mais',
};

export const escolhasVazias = (): EscolhasDeEmulacao => ({ geral: PERFIL_PADRAO, consoles: {}, jogos: {} });

const ehPerfil = (x: unknown): x is Perfil => typeof x === 'string' && (PERFIS as readonly string[]).includes(x);
const ehObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

function lerAjustes(sistema: string, x: unknown): AjustesDeCamada | undefined {
  if (!ehObjeto(x)) return undefined;
  const r: AjustesDeCamada = {};
  if (ehPerfil(x.perfil)) r.perfil = x.perfil;
  const cat = OPCOES_DE_NUCLEO[sistema as SistemaId] ?? [];
  if (ehObjeto(x.opcoes)) {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(x.opcoes)) {
      const def = cat.find((c) => c.chave === k);
      if (def && typeof v === 'string' && def.valores.some((a) => a.valor === v)) o[k] = v;
    }
    if (Object.keys(o).length) r.opcoes = o;
  }
  return r.perfil || r.opcoes ? r : undefined;
}

/** Lê o texto guardado na configuração. Texto estragado ou vazio: tudo no padrão (sem erro, o app abre igual). */
export function lerEscolhas(texto: string | null | undefined): EscolhasDeEmulacao {
  const r = escolhasVazias();
  if (!texto) return r;
  let x: unknown;
  try {
    x = JSON.parse(texto);
  } catch {
    return r; // configuração estragada à mão: volta ao padrão em vez de impedir o jogo de abrir
  }
  if (!ehObjeto(x)) return r;
  if (ehPerfil(x.geral)) r.geral = x.geral;
  if (ehObjeto(x.consoles))
    for (const [s, a] of Object.entries(x.consoles)) {
      const l = lerAjustes(s, a);
      if (l) r.consoles[s] = l;
    }
  if (ehObjeto(x.jogos))
    for (const [id, porConsole] of Object.entries(x.jogos)) {
      if (!ehObjeto(porConsole)) continue;
      for (const [s, a] of Object.entries(porConsole)) {
        const l = lerAjustes(s, a);
        if (l) (r.jogos[id] ??= {})[s] = l;
      }
    }
  return r;
}

export const textoDasEscolhas = (e: EscolhasDeEmulacao): string => JSON.stringify(e);

/** O perfil que vale pra esse console (e jogo): a camada mais de baixo que tem um. */
export function perfilEfetivo(e: EscolhasDeEmulacao, sistema: string, jogoId?: string): Perfil {
  return (jogoId ? e.jogos[jogoId]?.[sistema]?.perfil : undefined) ?? e.consoles[sistema]?.perfil ?? e.geral;
}

/** De onde vem o valor de cada opção. */
export type Origem = 'perfil' | 'console' | 'jogo';

export interface OpcaoResolvida {
  def: OpcaoDeNucleo;
  valor: string;
  origem: Origem;
}

/** Todas as opções do catálogo com o valor que vale e de que camada ele vem. Sistema sem catálogo: vazio. */
export function resolverOpcoes(e: EscolhasDeEmulacao, sistema: string, jogoId?: string): OpcaoResolvida[] {
  const cat = OPCOES_DE_NUCLEO[sistema as SistemaId];
  if (!cat) return [];
  const perfil = valoresDoPerfil(sistema as SistemaId, perfilEfetivo(e, sistema, jogoId));
  const doConsole = e.consoles[sistema]?.opcoes ?? {};
  const doJogo = (jogoId ? e.jogos[jogoId]?.[sistema]?.opcoes : undefined) ?? {};
  return cat.map((def) => {
    if (def.chave in doJogo) return { def, valor: doJogo[def.chave] as string, origem: 'jogo' };
    if (def.chave in doConsole) return { def, valor: doConsole[def.chave] as string, origem: 'console' };
    return { def, valor: perfil[def.chave] ?? def.padrao, origem: 'perfil' };
  });
}

/** O que mandar ao núcleo (chave → valor), todas as opções do catálogo. */
export function opcoesParaNucleo(e: EscolhasDeEmulacao, sistema: string, jogoId?: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const o of resolverOpcoes(e, sistema, jogoId)) r[o.def.chave] = o.valor;
  return r;
}

export interface Diferencas {
  /** o núcleo relê sem reabrir: pode ir já */
  naHora: Record<string, string>;
  /** só valem ao reabrir o jogo: nomes pra avisar */
  aoReabrir: string[];
}

/** O que mudou entre dois conjuntos de opções, separado entre "vale na hora" e "ao reabrir". */
export function compararOpcoes(
  sistema: string,
  antes: Record<string, string>,
  depois: Record<string, string>,
): Diferencas {
  const r: Diferencas = { naHora: {}, aoReabrir: [] };
  for (const def of OPCOES_DE_NUCLEO[sistema as SistemaId] ?? []) {
    const novo = depois[def.chave];
    if (novo === undefined || novo === antes[def.chave]) continue;
    if (def.naHora) r.naHora[def.chave] = novo;
    else r.aoReabrir.push(def.nome);
  }
  return r;
}

/** Cópia do objeto sem aquela chave. */
function sem<T>(o: Record<string, T>, chave: string): Record<string, T> {
  return Object.fromEntries(Object.entries(o).filter(([k]) => k !== chave));
}

type Solto = { perfil?: Perfil | undefined; opcoes?: Record<string, string> | undefined };

type Camada = 'geral' | 'console' | 'jogo';

/** Devolve novas escolhas com uma opção ajustada numa camada. `valor` = null tira o ajuste (volta a herdar). */
export function ajustarOpcao(
  e: EscolhasDeEmulacao,
  camada: Exclude<Camada, 'geral'>,
  sistema: string,
  jogoId: string | undefined,
  chave: string,
  valor: string | null,
): EscolhasDeEmulacao {
  return mudarCamada(e, camada, sistema, jogoId, (a) => {
    const o = valor === null ? sem(a.opcoes ?? {}, chave) : { ...a.opcoes, [chave]: valor };
    return { ...a, opcoes: Object.keys(o).length ? o : undefined };
  });
}

/** Devolve novas escolhas com o perfil de uma camada. `perfil` = null herda da camada de cima. */
export function ajustarPerfil(
  e: EscolhasDeEmulacao,
  camada: Camada,
  sistema: string,
  jogoId: string | undefined,
  perfil: Perfil | null,
): EscolhasDeEmulacao {
  if (camada === 'geral') return { ...e, geral: perfil ?? PERFIL_PADRAO };
  return mudarCamada(e, camada, sistema, jogoId, (a) => ({ ...a, perfil: perfil ?? undefined }));
}

/** Apaga todos os ajustes da camada (perfil e opções soltas). */
export function limparCamada(
  e: EscolhasDeEmulacao,
  camada: Exclude<Camada, 'geral'>,
  sistema: string,
  jogoId: string | undefined,
): EscolhasDeEmulacao {
  return mudarCamada(e, camada, sistema, jogoId, () => ({}));
}

function mudarCamada(
  e: EscolhasDeEmulacao,
  camada: Exclude<Camada, 'geral'>,
  sistema: string,
  jogoId: string | undefined,
  f: (a: AjustesDeCamada) => Solto,
): EscolhasDeEmulacao {
  const limpo = (a: Solto): AjustesDeCamada | undefined => {
    const r: AjustesDeCamada = {};
    if (a.perfil) r.perfil = a.perfil;
    if (a.opcoes && Object.keys(a.opcoes).length) r.opcoes = a.opcoes;
    return r.perfil || r.opcoes ? r : undefined;
  };
  const r: EscolhasDeEmulacao = { geral: e.geral, consoles: { ...e.consoles }, jogos: { ...e.jogos } };
  if (camada === 'console') {
    const n = limpo(f(e.consoles[sistema] ?? {}));
    return {
      ...r,
      consoles: n ? { ...e.consoles, [sistema]: n } : sem(e.consoles as Record<string, AjustesDeCamada>, sistema),
    };
  }
  if (!jogoId) return e;
  const atual = e.jogos[jogoId] ?? {};
  const n = limpo(f(atual[sistema] ?? {}));
  const porConsole = n ? { ...atual, [sistema]: n } : sem(atual as Record<string, AjustesDeCamada>, sistema);
  return { ...r, jogos: Object.keys(porConsole).length ? { ...e.jogos, [jogoId]: porConsole } : sem(e.jogos, jogoId) };
}
