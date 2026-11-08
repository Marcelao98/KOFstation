// Baixa os núcleos do manifesto (third_party/cores/manifest.json) pra apps/desktop/public/nucleos/<núcleo>.js, conferindo
// o SHA-256. Quem já está certo não baixa de novo. Uso: pnpm nucleos   (KOF_NUCLEOS_DE=<pasta> copia de uma pasta local)
// Entrada com `url` baixa daquele endereço (fixado num commit do antigo); com `trecho: [início, fim]`, guarda só o pedaço
// do arquivo entre as duas marcas (o núcleo só de som, que o antigo embute no KOFstation.html).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifesto = JSON.parse(readFileSync(join(raiz, 'third_party/cores/manifest.json'), 'utf8'));
/** fetch com 3 tentativas (o GitHub às vezes responde 5xx ou cai a conexão): espera 2 s, depois 6 s. */
async function baixar(url) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status < 500 || t >= 3) return r;
      console.warn(`… ${url}: HTTP ${r.status}, tentando de novo (${t}/3)`);
    } catch (e) {
      if (t >= 3) throw e;
      console.warn(`… ${url}: ${e.message}, tentando de novo (${t}/3)`);
    }
    await new Promise((ok) => setTimeout(ok, t * 2000 + (t - 1) * 2000));
  }
}

const destino = join(raiz, 'apps/desktop/public/nucleos');
mkdirSync(destino, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
let falhas = 0;
for (const [nome, n] of Object.entries(manifesto.nucleos)) {
  const alvo = join(destino, n.destino ?? `${nome}.js`);
  if (existsSync(alvo) && sha(readFileSync(alvo)) === n.sha256) continue;
  let dados;
  try {
    if (process.env.KOF_NUCLEOS_DE && existsSync(join(process.env.KOF_NUCLEOS_DE, n.destino ?? `${nome}.js`)))
      dados = readFileSync(join(process.env.KOF_NUCLEOS_DE, n.destino ?? `${nome}.js`));
    else if (process.env.KOF_NUCLEOS_DE && n.arquivo) dados = readFileSync(join(process.env.KOF_NUCLEOS_DE, n.arquivo));
    else {
      const r = await baixar(n.url ?? manifesto.origem + n.arquivo);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      dados = Buffer.from(await r.arrayBuffer());
      if (n.trecho) {
        const ini = dados.indexOf(n.trecho[0]);
        const fim = dados.indexOf(n.trecho[1], ini);
        if (ini < 0 || fim < 0) throw new Error('não achei o trecho no arquivo baixado');
        dados = dados.subarray(ini, fim);
      }
    }
  } catch (e) {
    console.error(`✗ ${nome}: não consegui baixar (${e.message})`);
    falhas++;
    continue;
  }
  if (sha(dados) !== n.sha256) {
    console.error(`✗ ${nome}: o arquivo baixado não confere com o manifesto (SHA-256 diferente)`);
    falhas++;
    continue;
  }
  writeFileSync(alvo, dados);
  console.log(`✓ ${nome} (${Math.round(dados.length / 1024)} KB)`);
}

// Núcleos nativos (M11b): anexos da Release do KOFstation, por plataforma, em third_party/cores/nativos/<plataforma>/.
// Só os da plataforma atual; KOF_NATIVOS=todas (ou "linux-x64,windows-x64") baixa outros (pra montar pacotes).
const plataformaAtual = { 'linux-x64': 'linux-x64', 'win32-x64': 'windows-x64', 'linux-arm64': 'linux-arm64' }[
  `${process.platform}-${process.arch}`
];
const querer = (process.env.KOF_NATIVOS ?? plataformaAtual ?? '').split(',').filter(Boolean);
for (const [nome, n] of Object.entries(manifesto.nativos ?? {})) {
  for (const [plat, a] of Object.entries(n.plataformas)) {
    if (!querer.includes('todas') && !querer.includes(plat)) continue;
    const pasta = join(raiz, 'third_party/cores/nativos', plat);
    const alvo = join(pasta, a.arquivo);
    if (existsSync(alvo) && sha(readFileSync(alvo)) === a.sha256) continue;
    let dados;
    try {
      const r = await baixar(a.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      dados = Buffer.from(await r.arrayBuffer());
      if (a.gzip) dados = gunzipSync(dados); // o do antigo publicado gzipado: o SHA-256 conferido é o do arquivo aberto
    } catch (e) {
      console.error(`✗ ${nome} nativo (${plat}): não consegui baixar (${e.message})`);
      falhas++;
      continue;
    }
    if (sha(dados) !== a.sha256) {
      console.error(`✗ ${nome} nativo (${plat}): o arquivo baixado não confere com o manifesto (SHA-256 diferente)`);
      falhas++;
      continue;
    }
    mkdirSync(pasta, { recursive: true });
    writeFileSync(alvo, dados, { mode: 0o755 });
    console.log(`✓ ${nome} nativo ${plat} (${Math.round(dados.length / 1024)} KB)`);
  }
}
process.exit(falhas ? 1 : 0);
