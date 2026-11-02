// Carrega um núcleo do kofstation-old no Node, num contexto isolado igual ao do teste antigo (testes/libretro/nucleo.cjs):
// o arquivo cria a variável Nucleo_<núcleo>, como no navegador.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import type { FabricaDeNucleo } from '../src/libretro';

export const PASTA_NUCLEOS = fileURLToPath(new URL('../../../apps/desktop/public/nucleos/', import.meta.url));
const ctx = vm.createContext({
  console,
  setTimeout,
  atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
  module: { exports: {} },
});
export function fabricaNode(nucleo: string): FabricaDeNucleo {
  const nome = `Nucleo_${nucleo}`;
  if (!vm.runInContext(`typeof ${nome} === 'function'`, ctx))
    vm.runInContext(readFileSync(`${PASTA_NUCLEOS}${nucleo}.js`, 'utf8'), ctx, { filename: `${nucleo}.js` });
  return vm.runInContext(nome, ctx) as FabricaDeNucleo;
}

/** Um núcleo de um arquivo qualquer, num contexto só dele (dois Snes9x diferentes no mesmo teste). */
export function fabricaDoArquivo(arquivo: string, nucleo: string): FabricaDeNucleo {
  const c = vm.createContext({
    console,
    setTimeout,
    atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s: string) => Buffer.from(s, 'binary').toString('base64'),
    module: { exports: {} },
  });
  vm.runInContext(readFileSync(arquivo, 'utf8'), c, { filename: arquivo });
  return vm.runInContext(`Nucleo_${nucleo}`, c) as FabricaDeNucleo;
}
