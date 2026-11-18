// Gera packages/domain/src/opcoes-<sistema>-declaradas.ts a partir da lista que o núcleo nativo declarou DE VERDADE
// (o teste Rust grava: `KOF_LISTA_OPCOES=<pasta> cargo test -p kof-nativo --test opcoes -- --nocapture`). Serve pro
// núcleo cujo cabeçalho de opções depende de como foi compilado (o PS1, PCSX-ReARMed, tem #ifdef de GPU/ARM/3DS e só o
// binário sabe o que entrou). Mesmo formato do opcoes-lrps2.ts: a tela mostra tudo, traduzido quando houver tradução.
//
//   node tools/opcoes-do-nucleo.mjs ps1 <pasta>/ps1.json "PCSX-ReARMed c8816799"
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [sistema, arquivo, origem = '?'] = process.argv.slice(2);
if (!sistema || !arquivo || !/^[a-z0-9]+$/.test(sistema)) {
  console.error('uso: node tools/opcoes-do-nucleo.mjs <sistema> <lista.json> [origem]');
  process.exit(2);
}
const lista = JSON.parse(readFileSync(arquivo, 'utf8'));
if (!Array.isArray(lista) || !lista.length) {
  console.error('a lista está vazia ou não é uma lista');
  process.exit(1);
}
// no SET_VARIABLES (v0) o núcleo escreve "Categoria > Nome" quando tem categoria; o primeiro valor é o padrão
const CATEGORIA = { system: 'system', video: 'video', audio: 'audio', input: 'input', emulation: 'emulation' };
const opcoes = lista.map((o) => {
  const m = /^([^>]+?)\s*>\s*/.exec(o.descricao);
  const cat = m ? (CATEGORIA[m[1].trim().toLowerCase()] ?? m[1].trim().toLowerCase()) : null;
  return {
    chave: o.chave,
    descricao: o.descricao,
    info: '',
    categoria: cat,
    valores: o.valores.map((valor) => ({ valor, rotulo: null })),
    padrao: o.valores[0] ?? '',
  };
});
const nome = `OPCOES_${sistema.toUpperCase()}_DECLARADAS`;
const saida = `// GERADO por tools/opcoes-do-nucleo.mjs a partir do que o núcleo declarou rodando (${origem}).
// Não edite à mão: rode o teste Rust com KOF_LISTA_OPCOES e o gerador de novo quando o núcleo mudar.
import type { OpcaoDeclarada } from './opcoes-lrps2';

export const ${nome}: readonly OpcaoDeclarada[] = ${JSON.stringify(opcoes, null, 2)};
`;
const destino = join(import.meta.dirname, `../packages/domain/src/opcoes-${sistema}-declaradas.ts`);
writeFileSync(destino, saida);
console.log(`${opcoes.length} opções → ${destino}`);
