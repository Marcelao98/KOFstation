// Gera packages/domain/src/opcoes-dolphin.ts: TODAS as opções que o Dolphin do libretro declara (Wii e GameCube,
// tarefa W.5), lidas do núcleo de verdade pelo teste Rust:
//
//   KOF_LISTA_OPCOES=<pasta> cargo test --release -p kof-nativo --test dolphin -- --nocapture
//   node tools/opcoes-dolphin.mjs <pasta>/wii.json
//
// O primeiro valor de cada opção é o padrão do núcleo (como o RetroArch lê o SET_VARIABLES).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arq = process.argv[2];
if (!arq) {
  console.error('uso: node tools/opcoes-dolphin.mjs <pasta>/wii.json');
  process.exit(2);
}
const lista = JSON.parse(readFileSync(arq, 'utf8'));
const CATEGORIA = (d) => {
  const c = d.split('>')[0].trim().toLowerCase();
  if (c.startsWith('graphics')) return d.includes('Hacks') ? 'hw_hacks' : 'video';
  if (c.startsWith('audio')) return 'audio';
  if (c.startsWith('wiimote') || c.startsWith('wii') || c.includes('microphone')) return 'input';
  if (c.startsWith('core')) return 'emulation';
  return 'system';
};
const opcoes = lista
  .filter((o) => o.valores.length)
  .map((o) => ({
    chave: o.chave,
    descricao: o.descricao,
    info: `Opção do Dolphin sem tradução ainda (${o.descricao}).`,
    categoria: CATEGORIA(o.descricao),
    valores: o.valores.map((v) => ({ valor: v, rotulo: null })),
    padrao: o.valores[0],
  }));
const saida = `// GERADO por tools/opcoes-dolphin.mjs a partir do que o Dolphin do libretro declara (dolphin-emu 2609.0.168+0863ee3700).
// Não edite à mão: rode o gerador de novo quando o núcleo mudar. As traduções e os perfis ficam em opcoes-dolphin-pt.ts
// e no catálogo curado (opcoes-nucleo.ts); aqui é o que o núcleo declara, em inglês.
import type { OpcaoDeclarada } from './opcoes-lrps2';

export const OPCOES_DOLPHIN: readonly OpcaoDeclarada[] = ${JSON.stringify(opcoes, null, 2)};
`;
const destino = join(import.meta.dirname, '../packages/domain/src/opcoes-dolphin.ts');
writeFileSync(destino, saida);
console.log(`${opcoes.length} opções em ${destino}`);
