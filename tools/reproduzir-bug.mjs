// pnpm bug <kofbug-....json.gz> <sua-rom>: reproduz o pacote do caçador de bugs quadro a quadro (o núcleo é o mesmo do
// app; a ROM é a sua: o SHA-1 diz se é a mesma do pacote). Roda o teste packages/engine/test/reproduzir-bug.test.ts.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const [pacote, rom] = process.argv.slice(2);
if (!pacote || !rom) {
  console.error('uso: pnpm bug <kofbug-....json.gz> <sua-rom>');
  process.exit(2);
}
const r = spawnSync('pnpm', ['--filter', '@kof/engine', 'exec', 'vitest', 'run', 'test/reproduzir-bug.test.ts'], {
  stdio: 'inherit',
  env: { ...process.env, KOF_BUG: resolve(pacote), KOF_ROM: resolve(rom) },
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
