// Gera packages/domain/src/opcoes-lrps2.ts: TODAS as opções que o núcleo do PS2 (LRPS2) declara, tiradas do cabeçalho
// de opções do próprio núcleo no commit que o app usa. A tela de opções mostra cada uma (em português quando o catálogo
// curado tem a tradução, com o nome original quando não tem): nada escondido. O teste Rust `opcoes.rs` confere o
// catálogo contra o que o núcleo declara de verdade.
//
//   gh api "repos/libretro/ps2/contents/libretro/libretro_core_options.h?ref=<commit>" --jq .content | base64 -d > opts.h
//   node tools/opcoes-lrps2.mjs opts.h <commit>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [arquivo, commit = '38d3a83f'] = process.argv.slice(2);
if (!arquivo) {
  console.error('uso: node tools/opcoes-lrps2.mjs <libretro_core_options.h> [commit]');
  process.exit(2);
}
// o app roda no PC (x86-64): dos `#ifdef ARCH_ARM64 … #else … #endif` fica o ramo do #else; os outros #if (guarda do
// cabeçalho, C++) ficam inteiros
const linhas = [];
const pilha = [];
for (const l of readFileSync(arquivo, 'utf8').split('\n')) {
  const t = l.trim();
  if (t.startsWith('#if')) {
    pilha.push(t === '#ifdef ARCH_ARM64' ? 'arm' : 'manter');
  } else if (t === '#else' && pilha.at(-1) === 'arm') pilha[pilha.length - 1] = 'x86';
  else if (t === '#endif' && pilha.length) pilha.pop();
  else if (!pilha.includes('arm')) linhas.push(l);
}
// as listas de valores repetidas vêm por #define (ex.: PERCENT_0_50): expande o nome pelo corpo
const macros = new Map();
const semMacros = linhas
  .join('\n')
  .replace(/^#define\s+([A-Z0-9_]+)((?:[^\n]*\\\n)*[^\n]*)$/gm, (_, nome, corpo) => {
    macros.set(nome, corpo.replace(/\\\n/g, '\n'));
    return '';
  });
const texto = semMacros.replace(/\b([A-Z][A-Z0-9_]+)\b/g, (m) => macros.get(m) ?? m);

const str = (s) => (s === 'NULL' ? null : JSON.parse(s));
const STR = String.raw`(NULL|"(?:[^"\\]|\\.)*")`;

// categorias: { "chave", "Nome", "Dica" }
const cats = texto.slice(texto.indexOf('option_cats_us[]'), texto.indexOf('option_defs_us[]'));
const categorias = [...cats.matchAll(new RegExp(String.raw`\{\s*${STR},\s*${STR},\s*${STR}\s*\}`, 'g'))]
  .map((m) => ({ chave: str(m[1]), nome: str(m[2]) }))
  .filter((c) => c.chave);

// opções: { "chave", "Desc", "Desc curta", "Info", "Info curta", "categoria", { valores }, "padrão" }
const defs = texto.slice(texto.indexOf('option_defs_us[]'));
const re = new RegExp(
  String.raw`\{\s*"(pcsx2_[a-z0-9_]+)",\s*${STR},\s*${STR},\s*${STR},\s*${STR},\s*${STR},\s*\{((?:\s*\{[^{}]*\},?|\s*\/\/[^\n]*)*)\s*\},\s*${STR}\s*\}`,
  'g',
);
const opcoes = [...defs.matchAll(re)].map((m) => {
  const valores = [...m[7].matchAll(new RegExp(String.raw`\{\s*${STR},\s*${STR}\s*\}`, 'g'))]
    .map((x) => ({ valor: str(x[1]), rotulo: str(x[2]) }))
    .filter((x) => x.valor !== null); // o { NULL, NULL } que fecha a lista
  const padrao = str(m[8]) ?? valores[0]?.valor ?? '';
  return {
    chave: m[1],
    descricao: str(m[2]) ?? m[1],
    curta: str(m[3]),
    info: str(m[4]) ?? '',
    categoria: str(m[6]),
    valores,
    padrao,
  };
});
const chaves = new Set(opcoes.map((o) => o.chave));
const todas = new Set([...defs.matchAll(/^\s*"(pcsx2_[a-z0-9_]+)",\s*$/gm)].map((m) => m[1]));
const faltou = [...todas].filter((k) => !chaves.has(k));
if (faltou.length) {
  console.error(`o gerador não entendeu ${faltou.length} opção(ões): ${faltou.join(', ')}`);
  process.exit(1);
}

const saida = `// GERADO por tools/opcoes-lrps2.mjs a partir de libretro/libretro_core_options.h do LRPS2 (commit ${commit}).
// Não edite à mão: rode o gerador de novo quando o núcleo mudar. As traduções e os perfis ficam no catálogo curado
// (opcoes-nucleo.ts); aqui é o que o núcleo declara, em inglês, com a categoria dele.

export interface OpcaoDeclarada {
  chave: string;
  /** "Categoria > Nome" como o núcleo escreve (o "(Restart)" diz que só vale ao reabrir) */
  descricao: string;
  info: string;
  /** system | video | emulation | hw_hacks | input (null = sem categoria) */
  categoria: string | null;
  valores: { valor: string; rotulo: string | null }[];
  padrao: string;
}

export const CATEGORIAS_LRPS2: readonly { chave: string; nome: string }[] = ${JSON.stringify(categorias, null, 2)};

export const OPCOES_LRPS2: readonly OpcaoDeclarada[] = ${JSON.stringify(
  opcoes.map(({ curta: _curta, ...o }) => o),
  null,
  2,
)};
`;
const destino = join(import.meta.dirname, '../packages/domain/src/opcoes-lrps2.ts');
writeFileSync(destino, saida);
console.log(`${opcoes.length} opções em ${categorias.length} categorias → ${destino}`);
