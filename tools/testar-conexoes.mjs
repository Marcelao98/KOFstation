// O servidor local responde toda conexão, mesmo muitas chegando juntas (o bug da fila do tiny_http, corrigido em
// third_party/tiny_http: com 30 conexões keep-alive juntas, ~1 em 30 ficava sem resposta pra sempre — a página que às
// vezes não abria). 5 rodadas de 30 conexões; nenhuma pode ficar sem resposta.
// Uso: cargo build -p kof-app && node tools/testar-conexoes.mjs [executável]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const exe = process.argv[2] ?? join(import.meta.dirname, '../target/debug/kofstation');
const tmp = mkdtempSync(join(tmpdir(), 'kof-conexoes-'));
const app = spawn(exe, ['--sem-navegador'], {
  env: { ...process.env, XDG_DATA_HOME: tmp, KOF_SEM_REDE: '1' },
  stdio: ['ignore', 'pipe', 'ignore'],
});
let s = '';
const porta = await new Promise((ok) =>
  app.stdout.on('data', (d) => {
    s += d;
    const m = /127\.0\.0\.1:(\d+)\//.exec(s);
    if (m) ok(Number(m[1]));
  }),
);
let semResposta = 0;
for (let rodada = 0; rodada < 5; rodada++) {
  const socks = [];
  const r = await Promise.all(
    Array.from(
      { length: 30 },
      () =>
        new Promise((ok) => {
          const c = net.connect(porta, '127.0.0.1', () =>
            c.write('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n'),
          );
          socks.push(c);
          const t = setTimeout(() => ok(false), 5000);
          c.on('data', () => {
            clearTimeout(t);
            ok(true);
          });
          c.on('error', () => ok(false));
        }),
    ),
  );
  semResposta += r.filter((x) => !x).length;
  for (const c of socks) c.destroy();
  await new Promise((ok) => setTimeout(ok, 300));
}
app.kill();
rmSync(tmp, { recursive: true, force: true });
console.log(`${semResposta ? '✗' : '✓'} conexões sem resposta: ${semResposta} de 150`);
process.exit(semResposta ? 1 : 0);
