// Aparelhos com papéis (tarefa N / fase C): quem roda o jogo (🧠 Núcleo), onde aparece a imagem e sai o som (📺 Tela)
// e de onde vêm os botões (🎮 Controle). Até 3 aparelhos; um aparelho pode ter mais de um papel (o PC sozinho tem os
// três). Tudo aqui é puro: a tela e os stores só perguntam.

export type Papel = 'nucleo' | 'tela' | 'controle';
export type TipoAparelho = 'pc' | 'celular';

/** O que um aparelho conta de si pros outros (N.2). Campos que o aparelho não sabe ficam de fora. */
export interface Ficha {
  tipo: TipoAparelho;
  /** "Linux", "Windows", "Android 14"… */
  sistema?: string;
  /** núcleos do processador */
  cpus?: number;
  /** memória, em GB (aproximada: o navegador arredonda) */
  memoriaGb?: number;
  /** "1920×1080" */
  tela?: string;
  /** nomes dos controles ligados agora */
  controles?: string[];
  /** consoles que ele roda */
  consoles: string[];
}

/** Um aparelho visto pela rede (ou este aqui), com a ficha se ele mandou. */
export interface AparelhoComPapel {
  id: string;
  nome: string;
  tipo: string;
  online: boolean;
  ficha?: Ficha | null;
}

export interface Arranjo {
  nucleo: string;
  tela: string;
  controles: string[];
}

export const PAPEIS: readonly { p: Papel; i: string; t: string }[] = [
  { p: 'nucleo', i: '🧠', t: 'Núcleo' },
  { p: 'tela', i: '📺', t: 'Tela' },
  { p: 'controle', i: '🎮', t: 'Controle' },
];

/** No máximo 3 aparelhos distintos num arranjo (o pedido de 21/11). */
export const MAX_APARELHOS = 3;

/** Consoles que precisam do PC pra rodar (núcleo nativo pesado). */
export const SO_NO_PC: readonly string[] = ['ps2', 'wii', 'gc'];

/** Os consoles que um tipo de aparelho roda (quando ele não mandou a ficha). */
export function consolesDoTipo(tipo: string, todos: readonly string[]): string[] {
  return tipo === 'pc' ? [...todos] : todos.filter((s) => !SO_NO_PC.includes(s));
}

/** Quantos aparelhos distintos o arranjo usa. */
export function aparelhosDoArranjo(a: Arranjo): string[] {
  return [...new Set([a.nucleo, a.tela, ...a.controles])];
}

/** Os papéis de um aparelho no arranjo. */
export function papeisDe(a: Arranjo, id: string): Papel[] {
  const l: Papel[] = [];
  if (a.nucleo === id) l.push('nucleo');
  if (a.tela === id) l.push('tela');
  if (a.controles.includes(id)) l.push('controle');
  return l;
}

export type Validacao = { ok: true } | { ok: false; motivo: string };

/**
 * O arranjo serve? `eu` = este aparelho (o que tem o jogo aberto, quando há). `sistema` = o console do jogo (ou '').
 * O motivo vem em português, pra mostrar.
 */
export function validarArranjo(
  a: Arranjo,
  aparelhos: readonly AparelhoComPapel[],
  eu: string,
  sistema = '',
): Validacao {
  const achar = (id: string) => aparelhos.find((x) => x.id === id);
  const nome = (id: string) => achar(id)?.nome ?? 'um aparelho que não está na lista';
  const ids = aparelhosDoArranjo(a);
  if (ids.length > MAX_APARELHOS) return { ok: false, motivo: `no máximo ${MAX_APARELHOS} aparelhos de cada vez` };
  for (const id of ids) {
    const x = achar(id);
    if (!x) return { ok: false, motivo: `${nome(id)}: não conheço esse aparelho` };
    if (id !== eu && !x.online) return { ok: false, motivo: `${x.nome} não está na rede agora` };
  }
  if (!a.controles.length) return { ok: false, motivo: 'falta quem controla (escolha um aparelho de controle)' };
  // o núcleo é sempre este aparelho, por enquanto: o jogo aberto aqui é o que vai pros outros
  if (a.nucleo !== eu) return { ok: false, motivo: `o núcleo tem que ser este aparelho (o jogo está aberto aqui)` };
  const n = achar(a.nucleo);
  if (sistema && n) {
    const roda = n.ficha?.consoles ?? consolesDoTipo(n.tipo, [sistema]);
    if (!roda.includes(sistema)) return { ok: false, motivo: `${n.nome} não roda esse console (só no PC)` };
  }
  return { ok: true };
}

export interface ArranjoPronto {
  id: string;
  i: string;
  nome: string;
  dica: string;
}

/** Os arranjos prontos (os cenários da fase C), na ordem do menu. */
export const ARRANJOS: readonly ArranjoPronto[] = [
  { id: 'sozinho', i: '🖥', nome: 'PC sozinho', dica: 'núcleo, tela e controle neste aparelho' },
  { id: 'tv', i: '📺', nome: 'PC + celular de controle', dica: 'a imagem fica aqui; os botões vêm do celular' },
  { id: 'portatil', i: '📱', nome: 'Portátil', dica: 'roda aqui; imagem, som e botões no celular' },
  {
    id: 'tres',
    i: '🖥📺📱',
    nome: 'Três aparelhos',
    dica: 'roda aqui; a imagem vai pra outro aparelho; um terceiro controla',
  },
];

/**
 * Monta um arranjo pronto com os aparelhos que estão na rede agora (null = falta aparelho; o motivo diz qual).
 * `eu` é este aparelho (o núcleo).
 */
export function montarArranjo(
  id: string,
  aparelhos: readonly AparelhoComPapel[],
  eu: string,
): { arranjo: Arranjo } | { falta: string } {
  const on = aparelhos.filter((x) => x.online && x.id !== eu);
  const cel = on.filter((x) => x.tipo === 'celular');
  switch (id) {
    case 'sozinho':
      return { arranjo: { nucleo: eu, tela: eu, controles: [eu] } };
    case 'tv':
      return cel[0]
        ? { arranjo: { nucleo: eu, tela: eu, controles: [cel[0].id] } }
        : { falta: 'nenhum celular na rede agora' };
    case 'portatil':
      return cel[0]
        ? { arranjo: { nucleo: eu, tela: cel[0].id, controles: [cel[0].id] } }
        : { falta: 'nenhum celular na rede agora' };
    case 'tres': {
      // a tela: outro PC se tiver (notebook, PC da sala), senão um celular; o controle: um celular que não é a tela
      const tela = on.find((x) => x.tipo === 'pc') ?? cel[0];
      const ctl = on.find((x) => x.id !== tela?.id && x.tipo === 'celular') ?? on.find((x) => x.id !== tela?.id);
      if (!tela || !ctl) return { falta: 'precisa de mais dois aparelhos na rede (um pra tela e um pra controlar)' };
      return { arranjo: { nucleo: eu, tela: tela.id, controles: [ctl.id] } };
    }
    default:
      return { falta: 'arranjo desconhecido' };
  }
}

/** Qual arranjo pronto é este (pra acender o botão), ou ''. */
export function qualArranjo(a: Arranjo, aparelhos: readonly AparelhoComPapel[], eu: string): string {
  const tipo = (id: string) => (id === eu ? 'eu' : (aparelhos.find((x) => x.id === id)?.tipo ?? ''));
  const ids = aparelhosDoArranjo(a);
  if (ids.length === 1 && ids[0] === eu) return 'sozinho';
  if (ids.length === 3) return 'tres';
  if (a.tela === eu && a.controles.every((c) => tipo(c) === 'celular')) return 'tv';
  if (a.tela !== eu && a.controles.length === 1 && a.controles[0] === a.tela) return 'portatil';
  return '';
}

/**
 * Um aparelho caiu: volta pro arranjo possível (a tela volta pro núcleo; o controle que caiu sai, e se não sobrar
 * nenhum, o núcleo controla). Devolve o novo arranjo e o aviso, ou null se nada muda.
 */
export function semQuemCaiu(
  a: Arranjo,
  online: (id: string) => boolean,
  nome: (id: string) => string,
): { arranjo: Arranjo; aviso: string } | null {
  const avisos: string[] = [];
  let tela = a.tela;
  if (tela !== a.nucleo && !online(tela)) {
    avisos.push(`a tela (${nome(tela)}) saiu da rede: a imagem voltou pra cá`);
    tela = a.nucleo;
  }
  let controles = a.controles.filter((c) => c === a.nucleo || online(c));
  for (const c of a.controles) if (!controles.includes(c)) avisos.push(`${nome(c)} saiu da rede`);
  if (!controles.length) controles = [a.nucleo];
  if (!avisos.length) return null;
  return { arranjo: { nucleo: a.nucleo, tela, controles }, aviso: '📡 ' + avisos.join('; ') };
}

/** Troca um papel avulso (tocar no chip e escolher o aparelho). O controle liga/desliga; o núcleo não troca. */
export function trocarPapel(a: Arranjo, papel: Papel, id: string): Arranjo {
  if (papel === 'tela') return { ...a, tela: id };
  if (papel === 'controle') {
    const tem = a.controles.includes(id);
    const controles = tem ? a.controles.filter((c) => c !== id) : [...a.controles, id];
    return { ...a, controles: controles.length ? controles : [a.nucleo] };
  }
  return a;
}

/** N.5: o arranjo sugerido pro console (PS2/Wii/GameCube → o núcleo no PC; num PC, o PC sozinho). */
export function sugerirArranjo(sistema: string, tipoDeste: string): string {
  if (SO_NO_PC.includes(sistema)) return tipoDeste === 'pc' ? 'sozinho' : '';
  return 'sozinho';
}

/** A ficha que veio pela rede (o canal `ficha`), conferida; null se torta. */
export function lerFicha(dados: string): Ficha | null {
  let o: unknown;
  try {
    o = JSON.parse(dados);
  } catch {
    return null; // mensagem torta: o aparelho aparece como "ficha desconhecida"
  }
  if (!o || typeof o !== 'object') return null;
  const f = o as Record<string, unknown>;
  if ((f.tipo !== 'pc' && f.tipo !== 'celular') || !Array.isArray(f.consoles)) return null;
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : undefined);
  const txt = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 40) : undefined);
  const r: Ficha = {
    tipo: f.tipo,
    consoles: f.consoles.filter((c): c is string => typeof c === 'string').slice(0, 30),
  };
  const sistema = txt(f.sistema),
    cpus = num(f.cpus),
    memoriaGb = num(f.memoriaGb),
    tela = txt(f.tela);
  if (sistema) r.sistema = sistema;
  if (cpus) r.cpus = cpus;
  if (memoriaGb) r.memoriaGb = memoriaGb;
  if (tela) r.tela = tela;
  if (Array.isArray(f.controles))
    r.controles = f.controles
      .filter((c): c is string => typeof c === 'string')
      .map((c) => c.slice(0, 40))
      .slice(0, 8);
  return r;
}

/** A linha curta da ficha ("PC · Linux · 8 núcleos · 8 GB · 1920×1080 · 1 controle"). */
export function textoDaFicha(f: Ficha | null | undefined): string {
  if (!f) return 'ficha desconhecida';
  const l = [f.tipo === 'pc' ? 'PC' : 'Celular'];
  if (f.sistema) l.push(f.sistema);
  if (f.cpus) l.push(`${f.cpus} núcleos`);
  if (f.memoriaGb) l.push(`${f.memoriaGb} GB`);
  if (f.tela) l.push(f.tela);
  if (f.controles?.length) l.push(f.controles.length === 1 ? '1 controle' : `${f.controles.length} controles`);
  return l.join(' · ');
}

/** A ordem que o aparelho manda no canal `papel`: vire tela/controle do núcleo `de`, ou pare. */
export type OrdemPapel = { t: 'papel'; tela: boolean; controle: boolean };

export function lerOrdemPapel(dados: string): OrdemPapel | null {
  try {
    const o = JSON.parse(dados) as Partial<OrdemPapel>;
    if (o.t !== 'papel') return null;
    return { t: 'papel', tela: !!o.tela, controle: !!o.controle };
  } catch {
    return null; // mensagem torta: ignora, como os outros canais
  }
}
