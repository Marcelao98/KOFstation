// Biblioteca com cara de console (B.1): o jogo (a obra) separado dos arquivos (as versões). "Super Mario World (USA)",
// "Super Mario World (Europe) (Rev 1)" e "Super Mario World (USA) [T+Por]" são um jogo só com três versões. Puro: entende
// os rótulos do nome (padrão No-Intro e GoodTools) e escolhe a versão principal.
import { chaveDoTitulo, tituloDoNome } from './basejogos';
import type { ItemBiblioteca } from './biblioteca';
import { sistemaDoItem } from './biblioteca';

const REGIOES: Record<string, [string, number]> = {
  brazil: ['Brasil', 40],
  usa: ['EUA', 30],
  world: ['Mundo', 28],
  europe: ['Europa', 20],
  australia: ['Austrália', 15],
  japan: ['Japão', 10],
  korea: ['Coreia', 8],
  asia: ['Ásia', 8],
  spain: ['Espanha', 12],
  france: ['França', 12],
  germany: ['Alemanha', 12],
  italy: ['Itália', 12],
  canada: ['Canadá', 18],
  china: ['China', 6],
  taiwan: ['Taiwan', 6],
  // GoodTools: (U) (E) (J) (B) (W) (UE) (JU)...
  u: ['EUA', 30],
  e: ['Europa', 20],
  j: ['Japão', 10],
  b: ['Brasil', 40],
  w: ['Mundo', 28],
};

export interface SobreAVersao {
  /** "EUA · Rev 1", "EUA · Tradução PT-BR", "Original" */
  rotulo: string;
  /** maior = melhor pra ser a principal */
  peso: number;
  /** tradução pro português (o selo 🇧🇷) */
  pt: boolean;
}

/** Os rótulos de um nome: o que está entre parênteses e colchetes, sem o título. */
export function rotulosDoNome(nome: string): string[] {
  return [...nome.matchAll(/[([]([^)\]]*)[)\]]/g)].map((m) => (m[1] ?? '').trim()).filter(Boolean);
}

/** Rótulo legível e peso de uma versão pelo nome do arquivo. */
export function sobreAVersao(nome: string): SobreAVersao {
  const partes: string[] = [];
  let peso = 0;
  let pt = false;
  let regiao = false;
  for (const r of rotulosDoNome(nome)) {
    const b = r.toLowerCase();
    // tradução: [T+Por], [T-Por by Fulano], [T-PT-BR], (PT-BR), (Traduzido)
    const t = /^t[+-]?\s*([a-z-]+)(?:.*?\bby\s+(.+))?/i.exec(r);
    if (t && /^t[+-]/i.test(r)) {
      const lingua = (t[1] ?? '').toLowerCase();
      const ehPt = /^(por|pt|pt-br|br|bra)/.test(lingua);
      pt ||= ehPt;
      const nomeL = ehPt ? 'PT-BR' : lingua === 'eng' || lingua === 'en' ? 'inglês' : lingua.toUpperCase();
      partes.push(`Tradução ${nomeL}${t[2] ? ' por ' + t[2].trim() : ''}`);
      peso += ehPt ? 50 : 5;
      continue;
    }
    if (/^(pt-?br|traduzido|tradu[cç][aã]o)$/i.test(r)) {
      pt = true;
      partes.push('Tradução PT-BR');
      peso += 50;
      continue;
    }
    // regiões (podem vir juntas: "USA, Europe")
    const regs = b.split(/\s*,\s*/).map((x) => REGIOES[x]);
    if (regs.length && regs.every((x) => x)) {
      const ok = regs as [string, number][];
      partes.push(ok.map((x) => x[0]).join(', '));
      if (!regiao) peso += Math.max(...ok.map((x) => x[1]));
      regiao = true;
      continue;
    }
    const rev = /^(?:rev\s*([0-9a-z.]+)|v\s*([0-9][0-9a-z.]*))$/i.exec(r);
    if (rev) {
      partes.push(rev[1] ? `Rev ${rev[1].toUpperCase()}` : `v${rev[2] ?? ''}`);
      peso += Math.min(4, parseFloat(rev[1] ?? rev[2] ?? '0') || 1);
      continue;
    }
    if (/^(beta|proto|prototype|demo|sample|kiosk)\b/i.test(r)) {
      partes.push(r[0]?.toUpperCase() + r.slice(1));
      peso -= 40;
      continue;
    }
    if (/^(hack|h\d*)\b/i.test(r) || /^h\d*\s/i.test(r)) {
      partes.push('Hack');
      peso -= 30;
      continue;
    }
    const good: Record<string, [string, number]> = {
      b: ['cópia ruim', -100],
      o: ['cópia com sobra', -80],
      t: ['trainer', -60],
      p: ['pirata', -50],
      a: ['alternativa', -5],
      f: ['corrigida', -3],
      '!': ['', 3],
    };
    const g = /^(?:([boptaf])\d*\b|(!)$)/i.exec(r);
    if (g) {
      const [txt, p] = good[(g[1] ?? g[2] ?? '').toLowerCase()] ?? ['', 0];
      if (txt) partes.push(txt);
      peso += p;
      continue;
    }
    if (/^(unl|unlicensed)$/i.test(r)) {
      partes.push('não licenciado');
      continue;
    }
    // idiomas (En,Fr,De), "Disc 1", edições: mostra como veio
    if (!/^(en|fr|de|es|it|nl|pt|sv|no|da|fi|ja|ko|zh)(,|$)/i.test(r)) partes.push(r);
  }
  return { rotulo: partes.join(' · ') || 'Original', peso, pt };
}

/** A chave da obra: o console + o título sem rótulos ("Legend of Zelda, The" = "The Legend of Zelda"). */
export function chaveDaObra(r: ItemBiblioteca): string {
  return sistemaDoItem(r) + ':' + chaveDoTitulo(tituloDoNome(r.nome));
}

/** Chave de uma versão (o mesmo arquivo jogado ou não, e a ROM de dentro de um zip). */
export const chaveDaVersao = (r: ItemBiblioteca): string =>
  (r.jogo?.path ?? r.pasta?.path ?? r.jogo?.id ?? r.nome) + '#' + (r.pasta?.entrada ?? r.jogo?.arquivo ?? '');

/**
 * Junta as versões de cada obra. A linha da lista é a versão principal (a escolhida da última vez, senão a jogada mais
 * recente, senão a de maior peso) com `versoes` (todas, a principal primeiro) e o nome da obra (o título sem rótulos).
 * Uma versão só: o item fica como está.
 */
export function agruparEmObras(
  itens: readonly ItemBiblioteca[],
  escolhida: (obra: string) => string | null = () => null,
): ItemBiblioteca[] {
  const grupos = new Map<string, ItemBiblioteca[]>();
  for (const r of itens) {
    const k = chaveDaObra(r);
    const g = grupos.get(k);
    if (g) g.push(r);
    else grupos.set(k, [r]);
  }
  const fora: ItemBiblioteca[] = [];
  for (const [k, g] of grupos) {
    if (g.length === 1) {
      fora.push(g[0] as ItemBiblioteca);
      continue;
    }
    const lembrada = escolhida(k);
    const peso = (r: ItemBiblioteca) => sobreAVersao(r.nome).peso;
    const ordem = [...g].sort(
      (a, b) =>
        Number(chaveDaVersao(b) === lembrada) - Number(chaveDaVersao(a) === lembrada) ||
        (b.jogo?.ultimo ?? 0) - (a.jogo?.ultimo ?? 0) ||
        peso(b) - peso(a) ||
        a.nome.localeCompare(b.nome),
    );
    const principal = ordem[0] as ItemBiblioteca;
    fora.push({ ...principal, obra: { chave: k, titulo: tituloDoNome(principal.nome), versoes: ordem } });
  }
  return fora;
}
