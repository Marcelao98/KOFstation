// Ponta a ponta do atualizador (M15.1), com o kofstation de verdade: uma chave gerada aqui, a "versão 1" numa pasta
// temporária, a "versão 2" publicada por um servidor HTTP local (o fonte.txt aponta pra ele, como no antigo), com os
// núcleos de verdade (tamanho e nome com hash iguais aos do tools/empacotar.sh). Confere: procura e baixa; na abertura
// seguinte troca o executável e os núcleos, apaga o núcleo que saiu e o app diz a versão nova; depois diz "em dia";
// e um arquivo trocado no servidor (versão 3) é recusado sem estragar a pasta.
// Uso: node tools/testar-atualizacao.mjs   (compila o kof-app com a chave de teste; precisa do pnpm nucleos)
import { execFileSync, spawn } from 'node:child_process';
import { createHash, createPublicKey, generateKeyPairSync } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'kof-atualiza-'));
const ok = (cond, msg) => {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`✓ ${msg}`);
};

// 1. chave de teste e o executável compilado com ela
const { privateKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pub = Buffer.from(createPublicKey(privateKey).export({ format: 'jwk' }).x, 'base64url').toString('hex');
console.log('compilando o kof-app com a chave de teste…');
execFileSync('cargo', ['build', '-q', '-p', 'kof-app'], {
  cwd: RAIZ,
  stdio: 'inherit',
  env: { ...process.env, KOF_CHAVE_PUBLICA_TESTE: pub },
});
const exe = join(RAIZ, 'target/debug/kofstation');

// 2. as pastas: v1 (instalada) e v2 (publicada), com os núcleos de verdade
const sha = (b) => createHash('sha256').update(b).digest('hex');
function pasta(dir, versao, { exeExtra, nucleos }) {
  mkdirSync(join(dir, 'nucleos'), { recursive: true });
  mkdirSync(join(dir, 'nativo'), { recursive: true });
  copyFileSync(exe, join(dir, 'kofstation'));
  if (exeExtra) appendFileSync(join(dir, 'kofstation'), exeExtra); // outro executável (os bytes a mais não mudam nada)
  execFileSync('chmod', ['755', join(dir, 'kofstation')]);
  const lista = {};
  for (const [nome, dados] of nucleos) {
    const arq = `${nome.replace(/\.[^.]+$/, '')}-${sha(dados).slice(0, 8)}.${nome.split('.').pop()}`;
    writeFileSync(join(dir, 'nucleos', arq), dados);
    lista[nome] = arq;
  }
  writeFileSync(join(dir, 'nucleos/lista.json'), JSON.stringify(lista));
  writeFileSync(join(dir, 'versao.txt'), `versao=${versao}\ncommit=teste\nplataforma=linux-x64\n`);
}
const pub_nucleos = join(RAIZ, 'apps/desktop/public/nucleos');
const reais = readdirSync(pub_nucleos)
  .filter((n) => n !== 'manifest.json' && !n.startsWith('.'))
  .map((n) => [n, readFileSync(join(pub_nucleos, n))]);
ok(
  reais.length > 5,
  `${reais.length} núcleos de verdade (${(reais.reduce((s, [, d]) => s + d.length, 0) / 1e6).toFixed(1)} MB)`,
);
const v1 = join(tmp, 'KOFstation');
const v2 = join(tmp, 'v2');
pasta(v1, '1', { nucleos: [...reais.slice(1), ['velho.js', Buffer.from('núcleo que saiu da lista')]] });
pasta(v2, '2', { exeExtra: '\n#versao 2\n', nucleos: reais });

// 3. o servidor da "Release"
const site = join(tmp, 'site');
mkdirSync(site);
const srv = createServer((req, res) => {
  const p = join(site, decodeURIComponent(req.url.slice(1)));
  if (!p.startsWith(site) || !existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200).end(readFileSync(p));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
writeFileSync(join(v1, 'fonte.txt'), `${base}/manifesto.json\n`);
function publicar(pastaVersao, versao) {
  const saida = join(tmp, `pub-${versao}`);
  execFileSync(
    'node',
    [
      join(RAIZ, 'tools/manifesto.mjs'),
      'montar',
      '--versao',
      versao,
      '--commit',
      'teste',
      '--base',
      base,
      '--publica',
      pub,
      ...(existsSync(join(site, 'manifesto.json')) ? ['--anterior', join(site, 'manifesto.json')] : []),
      '--saida',
      saida,
      `linux-x64=${pastaVersao}`,
    ],
    { stdio: 'inherit', env: { ...process.env, KOF_CHAVE_ATUALIZACAO: pem } },
  );
  for (const n of readdirSync(join(saida, 'subir'))) copyFileSync(join(saida, 'subir', n), join(site, n));
  copyFileSync(join(saida, 'manifesto.json'), join(site, 'manifesto.json'));
  copyFileSync(join(saida, 'manifesto.json.sig'), join(site, 'manifesto.json.sig'));
}
publicar(v2, '2');

// 4. abrir o app (sem navegador) e falar com a API como a página fala
const dados = join(tmp, 'dados');
async function abrir() {
  const p = spawn(join(v1, 'kofstation'), ['--sem-navegador'], {
    env: { ...process.env, XDG_DATA_HOME: dados },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let saida = '';
  p.stdout.on('data', (d) => (saida += d));
  for (let i = 0; i < 200 && !/\?t=([0-9a-f]+)/.test(saida); i++) await new Promise((r) => setTimeout(r, 100));
  const [, porta, token] = saida.match(/127\.0\.0\.1:(\d+)\/\?t=([0-9a-f]+)/) ?? [];
  if (!token) throw new Error(`o app não abriu: ${saida}`);
  const api = async (cmd, args = {}) => {
    const r = await fetch(`http://127.0.0.1:${porta}/api/${cmd}`, {
      method: 'POST',
      headers: { 'X-Kof-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    return r.json();
  };
  return { p, api };
}
const fechar = () => {
  try {
    execFileSync('pkill', ['-f', join(v1, 'kofstation')]);
  } catch {
    // nenhum rodando: já fechou
  }
};
async function procurarAte(api) {
  let s = await api('app.atualizacao', { procurar: true });
  for (let i = 0; i < 600 && s.situacao === 'procurando'; i++) {
    await new Promise((r) => setTimeout(r, 200));
    s = await api('app.atualizacao');
  }
  return s;
}

try {
  let { api } = await abrir();
  ok((await api('app.info')).version === '1', 'o app na versão 1 diz "1" no app.info');
  let s = await procurarAte(api);
  ok(
    s.situacao === 'pronta' && s.nova === '2',
    `baixou a versão 2 (${s.baixados} arquivos, ${(s.bytes / 1e6).toFixed(1)} MB)`,
  );
  ok(existsSync(join(v1, '.atualizacao/pronto.json')), 'ficou esperando em .atualizacao/');
  ok(readFileSync(join(v1, 'kofstation')).length === readFileSync(exe).length, 'o executável rodando não mudou ainda');
  fechar();

  ({ api } = await abrir());
  ok((await api('app.info')).version === '2', 'na abertura seguinte: executável novo aberto, app.info diz "2"');
  ok(readFileSync(join(v1, 'kofstation')).toString('latin1').endsWith('#versao 2\n'), 'o executável é o da versão 2');
  ok(!existsSync(join(v1, '.atualizacao')), '.atualizacao/ sumiu');
  const nucleos = readdirSync(join(v1, 'nucleos'));
  ok(!nucleos.some((n) => n.startsWith('velho')), 'o núcleo que saiu da lista foi apagado');
  ok(nucleos.length === reais.length + 1, `${nucleos.length - 1} núcleos + lista.json, iguais aos da versão 2`);
  ok(readFileSync(join(v1, 'versao.txt'), 'utf8').includes('plataforma=linux-x64'), 'versao.txt manteve a plataforma');
  s = await procurarAte(api);
  ok(s.situacao === 'emDia', 'procurar de novo: em dia');
  fechar();

  // 5. versão 3 com um arquivo trocado no caminho: recusada
  appendFileSync(join(v2, 'kofstation'), '#versao 3\n');
  publicar(v2, '3');
  const m = JSON.parse(readFileSync(join(site, 'manifesto.json'), 'utf8'));
  const exe3 = new URL(m.plataformas['linux-x64'].kofstation.url).pathname.slice(1);
  const bom = readFileSync(join(site, exe3));
  bom[bom.length - 3] ^= 1; // mesmo tamanho, um bit diferente
  writeFileSync(join(site, exe3), bom);
  ({ api } = await abrir());
  s = await procurarAte(api);
  ok(
    s.situacao === 'erro' && /veio diferente/.test(s.erro?.message ?? ''),
    `arquivo alterado recusado: "${s.erro?.message}"`,
  );
  ok(!existsSync(join(v1, '.atualizacao')), 'nada pela metade em .atualizacao/');
  // assinatura de outra chave
  writeFileSync(join(site, 'manifesto.json.sig'), '00'.repeat(64));
  s = await procurarAte(api);
  ok(
    s.situacao === 'erro' && /assinatura/.test(s.erro?.message ?? ''),
    `assinatura falsa recusada: "${s.erro?.message}"`,
  );
  ok(
    readFileSync(join(v1, 'atualizacao.log'), 'utf8').includes('atualizado pra versão 2'),
    'tudo anotado no atualizacao.log',
  );
  fechar();
  console.log('\natualizador: tudo certo');
} finally {
  fechar();
  srv.close();
  rmSync(tmp, { recursive: true, force: true });
}
