// Manifesto assinado do atualizador (M15.1). Dois usos:
//
//   node tools/manifesto.mjs chave <onde-guardar-a-privada.pem>
//     Gera o par Ed25519: a privada vai pro arquivo (e depois pro secret KOF_CHAVE_ATUALIZACAO do GitHub; nunca pro
//     repositório) e a pública (hex) pra crates/kof-app/chave-atualizacao.txt, que entra no executável.
//
//   KOF_CHAVE_ATUALIZACAO="$(cat privada.pem)" node tools/manifesto.mjs montar \
//       --versao 202611071200 --commit abc1234 --base https://github.com/O/R/releases/download/v202611071200 \
//       [--anterior manifesto-anterior.json] --saida dir linux-x64=pasta windows-x64=pasta
//     Lista cada arquivo das pastas do tools/empacotar.sh (menos o versao.txt, que o atualizador escreve), com tamanho e
//     SHA-256. Arquivo igual a um do manifesto anterior (mesmo SHA-256) aponta pra onde já está (núcleo com o hash no
//     nome sobe uma vez só); os novos vão pra <saida>/subir/ com o nome <sha8>-<nome> (iguais entre plataformas sobem
//     uma vez). Grava <saida>/manifesto.json e <saida>/manifesto.json.sig (assinatura em hex), conferida com a chave
//     pública do repositório antes de terminar.
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const ARQ_PUBLICA = join(RAIZ, 'crates/kof-app/chave-atualizacao.txt');

const falhar = (m) => {
  console.error(`manifesto: ${m}`);
  process.exit(1);
};

/** A chave pública crua (32 bytes, hex) de uma chave Ed25519 do node. */
const publicaHex = (k) => Buffer.from(createPublicKey(k).export({ format: 'jwk' }).x, 'base64url').toString('hex');

/** A chave pública a partir dos 32 bytes em hex (o formato do chave-atualizacao.txt). */
const publicaDeHex = (hex) =>
  createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(hex, 'hex').toString('base64url') },
    format: 'jwk',
  });

function gerarChave(destino) {
  if (!destino) falhar('diga onde guardar a chave privada (fora do repositório), ex.: ~/kofstation-chave.pem');
  if (destino.startsWith(RAIZ)) falhar('a chave privada não pode ficar dentro do repositório');
  const { privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(destino, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
  const pub = publicaHex(privateKey);
  writeFileSync(ARQ_PUBLICA, pub + '\n');
  console.log(`chave privada: ${destino} (guarde bem; vai pro secret KOF_CHAVE_ATUALIZACAO)`);
  console.log(`chave pública: ${pub} (gravada em crates/kof-app/chave-atualizacao.txt)`);
}

function arquivosDe(pasta) {
  const lista = [];
  const andar = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = join(d, e.name);
      if (e.isDirectory()) andar(p);
      else lista.push(p);
    }
  };
  andar(pasta);
  return lista;
}

/** Monta o manifesto (sem assinar). Puro o bastante pra testar: devolve o objeto e o que precisa subir. */
export function montar({ versao, commit, base, anterior, plataformas }) {
  const conhecidos = new Map(); // sha256 → url que já existe
  for (const arqs of Object.values(anterior?.plataformas ?? {}))
    for (const a of Object.values(arqs)) conhecidos.set(a.sha256, a.url);
  const subir = new Map(); // nome na Release → caminho local
  const man = { versao, commit, plataformas: {} };
  for (const [plat, pasta] of Object.entries(plataformas)) {
    const lista = {};
    for (const p of arquivosDe(pasta)) {
      const rel = relative(pasta, p).split('\\').join('/');
      if (rel === 'versao.txt' || rel.startsWith('.atualizacao/') || rel.endsWith('.log')) continue;
      const dados = readFileSync(p);
      const sha256 = createHash('sha256').update(dados).digest('hex');
      let url = conhecidos.get(sha256);
      if (!url) {
        const nome = `${sha256.slice(0, 8)}-${basename(rel)}`;
        url = `${base}/${encodeURIComponent(nome)}`;
        subir.set(nome, p);
        conhecidos.set(sha256, url);
      }
      lista[rel] = { tamanho: statSync(p).size, sha256, url };
    }
    if (!Object.keys(lista).length) falhar(`a pasta de ${plat} está vazia: ${pasta}`);
    man.plataformas[plat] = lista;
  }
  return { man, subir };
}

function montarEAssinar(args) {
  const opc = {};
  const plataformas = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) opc[a.slice(2)] = args[++i];
    else {
      const [plat, pasta] = a.split('=');
      if (!plat || !pasta) falhar(`plataforma=pasta, veio: ${a}`);
      plataformas[plat] = pasta;
    }
  }
  for (const k of ['versao', 'commit', 'base', 'saida']) if (!opc[k]) falhar(`faltou --${k}`);
  const pem = process.env.KOF_CHAVE_ATUALIZACAO;
  if (!pem?.includes('PRIVATE KEY')) falhar('faltou a chave privada em KOF_CHAVE_ATUALIZACAO (o secret do GitHub)');
  const privada = createPrivateKey(pem);
  // --publica: só pro teste de ponta a ponta (tools/testar-atualizacao.mjs), que gera a própria chave
  const pubRepo = opc.publica ?? readFileSync(ARQ_PUBLICA, 'utf8').trim();
  if (publicaHex(privada) !== pubRepo)
    falhar('a chave privada não é a par da pública de crates/kof-app/chave-atualizacao.txt: o app recusaria');
  const anterior = opc.anterior ? JSON.parse(readFileSync(opc.anterior, 'utf8')) : null;
  const { man, subir } = montar({ versao: opc.versao, commit: opc.commit, base: opc.base, anterior, plataformas });
  const corpo = Buffer.from(JSON.stringify(man, null, 1) + '\n');
  const assinatura = sign(null, corpo, privada);
  if (!verify(null, corpo, publicaDeHex(pubRepo), assinatura)) falhar('a assinatura não confere com a chave pública');
  mkdirSync(join(opc.saida, 'subir'), { recursive: true });
  writeFileSync(join(opc.saida, 'manifesto.json'), corpo);
  writeFileSync(join(opc.saida, 'manifesto.json.sig'), assinatura.toString('hex') + '\n');
  for (const [nome, p] of subir) copyFileSync(p, join(opc.saida, 'subir', nome));
  const n = Object.values(man.plataformas).reduce((s, l) => s + Object.keys(l).length, 0);
  console.log(`manifesto ${opc.versao}: ${n} arquivos, ${subir.size} novos pra subir; assinatura conferida`);
}

const [cmd, ...resto] = process.argv.slice(2);
if (cmd === 'chave') gerarChave(resto[0]);
else if (cmd === 'montar') montarEAssinar(resto);
else if (import.meta.url === `file://${process.argv[1]}`) falhar('uso: chave <arquivo.pem> | montar ...');
