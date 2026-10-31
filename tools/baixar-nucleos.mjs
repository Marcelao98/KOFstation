// Baixa os núcleos do manifesto (third_party/cores/manifest.json) pra apps/desktop/public/nucleos/<núcleo>.js, conferindo
// o SHA-256. Quem já está certo não baixa de novo. Uso: pnpm nucleos   (KOF_NUCLEOS_DE=<pasta> copia de uma pasta local)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifesto = JSON.parse(readFileSync(join(raiz, 'third_party/cores/manifest.json'), 'utf8'));
const destino = join(raiz, 'apps/desktop/public/nucleos');
mkdirSync(destino, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
let falhas = 0;
for (const [nome, n] of Object.entries(manifesto.nucleos)) {
  const alvo = join(destino, `${nome}.js`);
  if (existsSync(alvo) && sha(readFileSync(alvo)) === n.sha256) continue;
  let dados;
  try {
    if (process.env.KOF_NUCLEOS_DE) dados = readFileSync(join(process.env.KOF_NUCLEOS_DE, n.arquivo));
    else {
      const r = await fetch(manifesto.origem + n.arquivo);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      dados = Buffer.from(await r.arrayBuffer());
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
process.exit(falhas ? 1 : 0);
