// Plano de organização da Kof Games: a mesma regra do `organizar` do antigo (app.js ≈3079), só que primeiro como um
// plano (lista de movimentos) que a pessoa vê, e depois aplicado pelo Rust. Arquivos soltos em Games e tudo em Novos
// vão pra Games/<console>; pasta com CD (.cue/.gdi/.m3u) anda inteira; os .bin de um .cue vão junto com ele; jogo na
// pasta de console errada (só pela extensão que não deixa dúvida) muda de pasta. O que não é jogo fica onde está.
import { pastaDoArquivo, PASTA_SIS, PASTAS_CONSOLE, type FatoDeArquivo } from './deteccao';
import { extensao, sistemaPorExtensao } from './sistemas';

export interface ItemDoInventario extends FatoDeArquivo {
  /** relativo à raiz: "Novos/Jogo.sfc" */
  path: string;
  /** arquivos citados (só nos .cue) */
  cue?: readonly string[];
}

export interface Inventario {
  files: readonly ItemDoInventario[];
  dirs: readonly string[];
}

export interface Movimento {
  from: string;
  to: string;
  reason: 'solto' | 'novo' | 'pasta-errada' | 'faixa-do-cd' | 'cd';
}

export interface Plano {
  moves: Movimento[];
  /** pastas que podem ficar vazias (o Rust apaga só se ficarem) */
  limpar: string[];
}

const pai = (p: string) => p.slice(0, p.lastIndexOf('/'));
const nomeDe = (p: string) => p.slice(p.lastIndexOf('/') + 1);

export function planejarOrganizacao(inv: Inventario): Plano {
  const moves: Movimento[] = [];
  const limpar: string[] = [];
  const consoles = new Set(PASTAS_CONSOLE);
  const filhosArq = new Map<string, ItemDoInventario[]>();
  const filhosDir = new Map<string, string[]>();
  for (const f of inv.files) (filhosArq.get(pai(f.path)) ?? filhosArq.set(pai(f.path), []).get(pai(f.path)))?.push(f);
  for (const d of inv.dirs) (filhosDir.get(pai(d)) ?? filhosDir.set(pai(d), []).get(pai(d)))?.push(d);
  const destino = (p: string) => `Games/${p}`;

  function arrumar(dir: string, ehRaizGames: boolean, motivo: 'solto' | 'novo') {
    const arqs = filhosArq.get(dir) ?? [];
    const presos = new Set(arqs.flatMap((f) => (f.cue ?? []).map((n) => n.toLowerCase())));
    for (const d of filhosDir.get(dir) ?? []) {
      if (ehRaizGames && consoles.has(nomeDe(d))) continue;
      const cd = (filhosArq.get(d) ?? []).find((x) => /\.(cue|gdi|m3u)$/i.test(x.nome));
      if (cd) {
        const p = pastaDoArquivo(cd);
        if (p) moves.push({ from: d, to: destino(p), reason: 'cd' });
        continue;
      }
      arrumar(d, false, motivo);
      limpar.push(d);
    }
    for (const f of arqs) {
      if (presos.has(f.nome.toLowerCase())) continue;
      const p = pastaDoArquivo(f);
      if (!p) continue;
      if (/\.cue$/i.test(f.nome))
        for (const n of f.cue ?? []) {
          const faixa = arqs.find((x) => x.nome.toLowerCase() === n.toLowerCase());
          if (faixa) moves.push({ from: faixa.path, to: destino(p), reason: 'faixa-do-cd' });
        }
      moves.push({ from: f.path, to: destino(p), reason: motivo });
    }
  }
  arrumar('Games', true, 'solto');
  arrumar('Novos', false, 'novo');
  // jogo na pasta de console errada (.sfc em gba/ etc.); zip e CD ficam (a extensão não diz o console)
  for (const c of consoles)
    for (const f of filhosArq.get(`Games/${c}`) ?? []) {
      if (/\.(zip|iso|img|bin|chd|cue|pbp|cso|isz)$/i.test(f.nome)) continue;
      const sis = sistemaPorExtensao(f.nome);
      if (!sis) continue;
      const p = sis === 'gb' && extensao(f.nome) === 'gbc' ? PASTA_SIS.gbc : PASTA_SIS[sis];
      if (p !== c && !(c === 'gbc' && p === 'gb')) moves.push({ from: f.path, to: destino(p), reason: 'pasta-errada' });
    }
  return { moves, limpar };
}
