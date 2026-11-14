// Lê as opções que cada núcleo WebAssembly declara (tabelas retro_core_option_v2/v1 na memória estática do módulo)
// e imprime JSON: { núcleo: [{chave, valores, padrao}] }. Os núcleos do antigo não expõem isso em tempo de execução
// (a ponte ignora o SET_VARIABLES), então a gente varre a memória: acha o texto da chave, depois o ponteiro pra ele
// na definição, e anda pela lista de valores. Uso: node tools/opcoes-wasm.mjs [nucleo...] > saida.json
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const PASTA = new URL('../apps/desktop/public/nucleos/', import.meta.url);
const PREFIXO = {
  mupen64: 'mupen64plus-',
  snes9x: 'snes9x_',
  gambatte: 'gambatte_',
  mgba: 'mgba_',
  fceumm: 'fceumm_',
  genplus: 'genesis_plus_gx_',
  pcsx: 'pcsx_rearmed_',
};

async function carregar(nucleo) {
  const ctx = vm.createContext({
    console,
    setTimeout,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    module: { exports: {} },
  });
  vm.runInContext(readFileSync(new URL(nucleo + '.js', PASTA), 'utf8'), ctx, { filename: nucleo + '.js' });
  const fab = vm.runInContext('Nucleo_' + nucleo, ctx);
  return fab({ print: () => {}, printErr: () => {} });
}

function lerTexto(h, p) {
  let e = p;
  while (h[e] !== 0 && e - p < 200) e++;
  return Buffer.from(h.subarray(p, e)).toString('latin1');
}

function varrer(mod, prefixo) {
  const h = mod.HEAPU8;
  const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
  const alvo = Buffer.from(prefixo);
  const buf = Buffer.from(h.buffer, h.byteOffset, h.byteLength);
  const chaves = new Map(); // endereço do texto -> texto
  for (let i = buf.indexOf(alvo); i >= 0; i = buf.indexOf(alvo, i + 1)) {
    if (i > 0 && buf[i - 1] !== 0) continue; // tem que começar uma string
    const t = lerTexto(h, i);
    if (/^[A-Za-z0-9_-]+$/.test(t)) chaves.set(i, t);
  }
  const ehPonteiroDeTexto = (p) => p > 0 && p < h.length - 1 && h[p] >= 0x20 && h[p] < 0x7f;
  const saida = new Map();
  for (let i = 0; i + 4 <= h.length; i += 4) {
    const k = v.getUint32(i, true);
    const chave = chaves.get(k);
    if (!chave || saida.has(chave)) continue;
    // v2: key, desc, desc_cat, info, info_cat, category_key, valores[128]{valor,rótulo}, padrão; v1: key, desc, info, valores...
    for (const inicio of [24, 12]) {
      const valores = [];
      let p = i + inicio;
      while (valores.length < 128) {
        const pv = v.getUint32(p, true);
        if (!pv) break;
        if (!ehPonteiroDeTexto(pv)) {
          valores.length = 0;
          break;
        }
        valores.push(lerTexto(h, pv));
        p += 8;
      }
      if (!valores.length) continue;
      const pad = v.getUint32(i + inicio + 128 * 8, true);
      const padrao = ehPonteiroDeTexto(pad) ? lerTexto(h, pad) : valores[0];
      if (!valores.includes(padrao)) continue;
      saida.set(chave, { chave, valores, padrao });
      break;
    }
  }
  return [...saida.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}

const nucleos = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PREFIXO);
const r = {};
for (const n of nucleos) r[n] = varrer(await carregar(n), PREFIXO[n]);
console.log(JSON.stringify(r, null, 1));
