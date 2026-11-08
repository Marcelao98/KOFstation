// Paridade da rede (M13.1): o serviço novo (kof-rede, Rust + kofrede.c do antigo) contra ele mesmo e contra o do
// app antigo, nos dois papéis, e contra o lado do celular (Rede.java do APK + libkofrede.so).
//   node tools/testar-rede.mjs [kofstation-old]
// Sem o caminho do antigo, só novo × novo. Com ele (só leitura: compila numa pasta temporária), também:
//   novo × kofservico antigo (os dois sentidos) e o rede/teste/celular.cjs do antigo contra o novo
//   (precisa de gcc, javac e do org.json, baixado do Maven Central).
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const antigo = process.argv[2];
const tmp = mkdtempSync(join(tmpdir(), 'kof-rede-'));
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? '  ✓ ' : '  ✗ FALHOU: ') + m);
  if (!c) falhas++;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

execFileSync('cargo', ['build', '-q', '-p', 'kof-net', '--bin', 'kof-rede'], { cwd: RAIZ, stdio: 'inherit' });
const novo = join(RAIZ, 'target/debug/kof-rede');

function servico(bin, pasta, nome, base) {
  return spawn(
    bin,
    [
      '--pasta',
      join(tmp, pasta),
      '--nome',
      nome,
      '--porta',
      String(base),
      '--udp',
      String(base),
      '--ws',
      String(base - 6),
      '--achar',
      `127.0.0.1:${base === 18650 ? 18660 : 18650}`,
    ],
    { stdio: ['ignore', 'ignore', process.env.VERBOSO ? 'inherit' : 'ignore'] },
  );
}
async function pagina(porta) {
  for (let i = 0; i < 50; i++) {
    try {
      const ws = new WebSocket('ws://127.0.0.1:' + porta);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
      });
      const fila = [];
      let acorda = null;
      ws.onmessage = (e) => {
        fila.push(JSON.parse(e.data));
        if (acorda) acorda();
      };
      ws.pedir = (o) => ws.send(JSON.stringify(o));
      ws.esperar = async (t, cond = () => true, ms = 6000) => {
        const fim = Date.now() + ms;
        for (;;) {
          const i = fila.findIndex((m) => m.t === t && cond(m));
          if (i >= 0) return fila.splice(i, 1)[0];
          if (Date.now() > fim) return null;
          await new Promise((r) => {
            acorda = r;
            setTimeout(r, 100);
          });
        }
      };
      return ws;
    } catch {
      await esperar(100);
    }
  }
  throw new Error('o serviço não abriu na porta ' + porta);
}

/** O roteiro do rede/teste/servicos.cjs do antigo, com A e B podendo ser programas diferentes. */
async function par(binA, binB, rotulo) {
  console.log(`\n${rotulo}`);
  const pasta = rotulo.replace(/\W+/g, '-');
  let A = servico(binA, pasta + 'A', 'PC A', 18650);
  let B = servico(binB, pasta + 'B', 'PC B', 18660);
  try {
    let [pa, pb] = [await pagina(18644), await pagina(18654)];
    pa.pedir({ t: 'eu' });
    pb.pedir({ t: 'eu' });
    const [la, lb] = [await pa.esperar('lista'), await pb.esperar('lista')];
    ok(la?.eu.id.length === 16 && la.eu.nome === 'PC A', 'A responde quem é');
    pb.pedir({ t: 'achar' });
    const ach = await pb.esperar('achados');
    ok(
      ach?.lista.some((x) => x.id === la.eu.id && x.porta === 18650 && x.nome === 'PC A'),
      'B acha A na rede',
    );
    pb.pedir({ t: 'parear-com', ip: '127.0.0.1', porta: 18650, senha: '000000', modo: 'c' });
    let e = await pb.esperar('par-erro');
    ok(/aberto/.test(e?.texto), `sem a janela aberta, A recusa: ${e?.texto}`);
    pa.pedir({ t: 'parear' });
    const j = await pa.esperar('parear');
    ok(
      /^\d{6}$/.test(j?.codigo) && j.qr.startsWith('kofstation://parear?') && j.qr.includes('n=PC%20A'),
      'A abre o pareamento: código e QR',
    );
    pb.pedir({
      t: 'parear-com',
      ip: '127.0.0.1',
      porta: 18650,
      senha: String((+j.codigo + 1) % 1e6).padStart(6, '0'),
      modo: 'c',
    });
    e = await pb.esperar('par-erro');
    ok(e?.texto === 'código errado', 'código errado não pareia');
    pb.pedir({ t: 'parear-com', ip: '127.0.0.1', porta: 18650, senha: j.codigo, modo: 'c' });
    const [pA, pB] = [await pa.esperar('pareado'), await pb.esperar('pareado')];
    ok(pA?.aparelho.id === lb.eu.id && pA.aparelho.nome === 'PC B', 'A guardou B (código de 6 números)');
    ok(pB?.aparelho.id === la.eu.id && pB.aparelho.tipo === 'pc', 'B guardou A');
    pb.pedir({ t: 'conectar', id: la.eu.id });
    ok(
      !!(await pa.esperar('lista', (m) => m.aparelhos.some((x) => x.id === lb.eu.id && x.online))),
      'B conecta em A (cifrado)',
    );
    await pb.esperar('lista', (m) => m.aparelhos.some((x) => x.online));
    const texto = 'olá do B "aspas" \\ ✓ 🎮';
    pb.pedir({ t: 'enviar', para: la.eu.id, canal: 'teste', dados: texto });
    let m = await pa.esperar('msg');
    ok(m?.de === lb.eu.id && m.canal === 'teste' && m.dados === texto, 'mensagem B → A (acentos e emoji)');
    const grande = 'x'.repeat(300000);
    pa.pedir({ t: 'enviar', para: lb.eu.id, canal: 'sync', dados: grande });
    m = await pb.esperar('msg');
    ok(m?.dados.length === grande.length, 'mensagem grande A → B (300 KB)');
    A.kill();
    B.kill();
    await esperar(300);
    A = servico(binA, pasta + 'A', 'PC A', 18650);
    B = servico(binB, pasta + 'B', 'PC B', 18660);
    [pa, pb] = [await pagina(18644), await pagina(18654)];
    pb.pedir({ t: 'conectar', id: la.eu.id });
    ok(!!(await pa.esperar('lista', (x) => x.aparelhos.some((y) => y.online))), 'reconecta depois de reabrir os dois');
  } finally {
    A.kill();
    B.kill();
    await esperar(300);
  }
}

try {
  await par(novo, novo, 'novo × novo');
  if (antigo) {
    const t = join(tmp, 'antigo');
    mkdirSync(join(t, 'classes'), { recursive: true });
    const r = join(antigo, 'rede');
    execFileSync('gcc', [
      '-O2',
      '-w',
      '-I',
      r,
      join(r, 'kofservico.c'),
      join(r, 'kofrede.c'),
      join(r, 'terceiros/monocypher.c'),
      '-lpthread',
      '-o',
      join(t, 'kofservico'),
    ]);
    await par(novo, join(t, 'kofservico'), 'novo (PC A) × kofservico antigo (PC B)');
    await par(join(t, 'kofservico'), novo, 'kofservico antigo (PC A) × novo (PC B)');
    // o lado do celular: o Rede.java do APK com o kofrede.c pela JNI
    console.log('\ncelular (Rede.java do APK) × novo');
    const r2 = await fetch('https://repo1.maven.org/maven2/org/json/json/20240303/json-20240303.jar');
    writeFileSync(join(t, 'json.jar'), Buffer.from(await r2.arrayBuffer()));
    const java = join(antigo, 'android/src/dev/kofnes/android');
    execFileSync(
      'javac',
      [
        '-nowarn',
        '-d',
        join(t, 'classes'),
        '-cp',
        join(t, 'json.jar'),
        join(java, 'Rede.java'),
        join(java, 'RedeNucleo.java'),
      ],
      { stdio: 'ignore' },
    );
    const jdk = join(execFileSync('sh', ['-c', 'readlink -f "$(command -v javac)"']).toString().trim(), '../..');
    execFileSync('gcc', [
      '-O2',
      '-shared',
      '-fPIC',
      '-I',
      r,
      '-I',
      join(jdk, 'include'),
      '-I',
      join(jdk, 'include/linux'),
      join(r, 'jni.c'),
      join(r, 'kofrede.c'),
      join(r, 'terceiros/monocypher.c'),
      '-o',
      join(t, 'libkofrede.so'),
    ]);
    try {
      execFileSync('node', [join(r, 'teste/celular.cjs'), novo, join(t, 'classes'), join(t, 'json.jar'), t], {
        stdio: 'inherit',
      });
      ok(true, 'rede/teste/celular.cjs do antigo passou contra o novo');
    } catch {
      ok(false, 'rede/teste/celular.cjs do antigo contra o novo');
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(falhas ? `\n${falhas} FALHAS` : '\nrede: tudo certo');
process.exit(falhas ? 1 : 0);
