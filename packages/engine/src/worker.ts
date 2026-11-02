// Worker do núcleo: carrega o núcleo do kofstation-old, roda os quadros e manda imagem e som. O ritmo é o do SOM quando
// ele está tocando (mantém ~60 ms no anel; o AudioWorklet consome no relógio da placa de som); sem som, um relógio
// pelo fps do núcleo. No máximo 4 quadros de uma vez (igual ao antigo); turbo = 4 por passo.
import { criarAnel, escrever, ocupacao, type Anel } from './anel';
import { SessaoLibretro, type FabricaDeNucleo } from './libretro';
import { assinaturaDoQuadro } from './bug';
import type { DoWorker, ParaWorker, ReplayDoBug } from './mensagens';
import { Reamostrador } from './reamostrador';
import { Rebobinador } from './rebobinador';
import { criarRelogio, MAX_QUADROS_POR_PASSO, type Relogio } from './tempo';

const eu = self as unknown as {
  postMessage(m: DoWorker, t?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ParaWorker>) => void) | null;
  window?: unknown;
} & Record<string, unknown>;

let sessao: SessaoLibretro | null = null;
let anel: Anel | null = null;
let reamostrador: Reamostrador | null = null;
let relogio: Relogio | null = null;
let taxaSaida = 48000;
let pausado = false;
let turbo = false;
let somTocando = false;
let ultimoPasso = 0;
let parado = false;
const med = { quadros: 0, nucleo: 0, atrasos: 0, desde: 0, faltasAntes: 0 };
let sramAntes: Uint8Array | null = null;

// ---------- caçador de bugs (novoMarco/rodarQuadro do antigo): marco a cada 600 quadros + os botões de cada um ----------
let cacador = true;
let marco: { estado: Uint8Array; entradas: number[] } | null = null;
let marcoAnt: { estado: Uint8Array; entradas: number[] } | null = null;
function novoMarco(s: SessaoLibretro | null, zerar = false) {
  marcoAnt = zerar ? null : marco;
  try {
    marco = cacador && s ? { estado: s.salvarEstado(), entradas: [] } : null;
  } catch {
    marco = null; // o núcleo não deu o estado agora (N64 antes do 1º quadro): o próximo marco tenta de novo
  }
}
function anotarQuadro(s: SessaoLibretro) {
  if (!marco) return;
  marco.entradas.push(s.pad[0] ?? 0);
  if (marco.entradas.length >= 600) novoMarco(s);
}
const b64 = (u8: Uint8Array) => {
  let t = '';
  for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(t);
};
function pacoteDoBug(s: SessaoLibretro): Uint8Array {
  const base = marcoAnt ?? marco;
  const entradas = base ? (marcoAnt ? marcoAnt.entradas.concat(marco?.entradas ?? []) : base.entradas) : [];
  const r: ReplayDoBug = {
    estado: base ? b64(base.estado) : null,
    entradas: b64(new Uint8Array(Uint16Array.from(entradas).buffer)),
    quadros: entradas.length,
    agora: { estado: b64(s.salvarEstado()), assinatura: assinaturaDoQuadro(s.quadro, entradas.length) },
  };
  return new TextEncoder().encode(JSON.stringify(r));
}

// ---------- rebobinar (app.js 1845–1875 do antigo, agora junto do núcleo) ----------
const rb = {
  ligado: true,
  limite: 5,
  recargaX: 6,
  r: null as Rebobinador | null,
  querendo: false,
  rebobinou: 0,
  recarga: 0,
  recargaTotal: 1,
  desdeFoto: 0,
  acumulado: 0,
  avisado: '',
};
function novoRebob(s: SessaoLibretro | null) {
  // ~30 fotos por segundo, no máximo 48 MB (PS1 fica sem: o estado tem ~4 MB)
  rb.r = rb.ligado && rb.limite > 0 && s && !s.config.semRebob ? new Rebobinador(s, 48 << 20, rb.limite * 30) : null;
  rb.desdeFoto = 0;
  rb.recarga = 0;
  rb.rebobinou = 0;
  avisarRebob(true);
}
const prontoPraVoltar = () => !!rb.r && rb.recarga <= 0 && rb.r.quantas > 0;
function avisarRebob(forcar = false) {
  const r = {
    ligado: !!rb.r,
    rebobinando: rb.rebobinou > 0,
    segundos: rb.r ? Math.round((rb.r.quantas / 30) * 10) / 10 : 0,
    limite: rb.limite,
    recarga: rb.recarga,
    recargaTotal: rb.recargaTotal,
  };
  const chave = `${r.ligado}|${r.rebobinando}|${r.rebobinando ? r.segundos : ''}|${Math.ceil(r.recarga / 60)}`;
  if (!forcar && chave === rb.avisado) return;
  rb.avisado = chave;
  enviar({ tipo: 'rebob', r });
}
function terminarRebobinar() {
  novoMarco(sessao, true); // voltou no tempo: os botões gravados não levam mais até aqui
  if (rb.rebobinou && rb.r && rb.recargaX) {
    rb.r.limpar(); // usou: zera e recarrega (Só alegria: continua)
    rb.recargaTotal = rb.recarga = rb.limite * rb.recargaX * 60;
  }
  rb.rebobinou = 0;
  rb.desdeFoto = 0;
  relogio = sessao ? criarRelogio(sessao.info.fps) : null; // o tempo voltando não vira quadros atrasados
  avisarRebob();
}
/** Um passo pra trás (no ritmo de 60 por segundo). false = não deu (acabou o tempo). */
function passoPraTras(s: SessaoLibretro): boolean {
  if (!rb.r?.voltar()) return false;
  rb.rebobinou++;
  s.pad[0] = 0;
  s.rodar(); // um quadro pra ter a imagem daquele momento (o som desse quadro não sai)
  mandarQuadro(s);
  avisarRebob();
  return true;
}
function depoisDeRodar(vezes: number) {
  rb.desdeFoto += vezes;
  if (rb.r && rb.desdeFoto >= 2) {
    rb.r.gravar();
    rb.desdeFoto = 0;
  }
  if (rb.recarga > 0) {
    rb.recarga -= vezes;
    if (rb.recarga < 0) rb.recarga = 0;
    avisarRebob();
  }
}
let sramQuando = 0;

/** A bateria mudou desde a última vez? (1x por segundo, como o salvarSram do antigo) */
function conferirSram(s: SessaoLibretro, agora: number) {
  if (agora - sramQuando < 1000 || !s.tamanhoSram) return;
  sramQuando = agora;
  const b = s.lerSram();
  if (sramAntes && b.length === sramAntes.length && b.every((x, i) => x === sramAntes?.[i])) return;
  const primeira = !sramAntes;
  sramAntes = b;
  if (primeira) return; // o que acabou de carregar não é mudança
  const copia = b.slice();
  enviar({ tipo: 'sram', bytes: copia }, [copia.buffer]);
}

function responder(id: number, f: () => Uint8Array | undefined) {
  try {
    const bytes = f();
    if (bytes) enviar({ tipo: 'resposta', id, ok: true, bytes }, [bytes.buffer as ArrayBuffer]);
    else enviar({ tipo: 'resposta', id, ok: true });
  } catch (e) {
    enviar({ tipo: 'resposta', id, ok: false, erro: e instanceof Error ? e.message : String(e) });
  }
}

const enviar = (m: DoWorker, t?: Transferable[]) => eu.postMessage(m, t);

async function carregarNucleo(url: string, nucleo: string): Promise<FabricaDeNucleo> {
  const nome = `Nucleo_${nucleo}`;
  if (typeof eu[nome] !== 'function') {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`não achei o núcleo ${nucleo} (${url}: ${r.status})`);
    const codigo = await r.text();
    eu.window = self; // os núcleos foram compilados pra página (ENVIRONMENT=web,node): o Worker se passa por página
    (0, eval)(codigo); // eval indireto: o `var Nucleo_x` do arquivo vira global do Worker, como num <script>
  }
  const f = eu[nome];
  if (typeof f !== 'function') throw new Error(`o arquivo do núcleo ${nucleo} não criou ${nome}`);
  return f as FabricaDeNucleo;
}

/**
 * N64: o núcleo desenha com OpenGL ES. No antigo era um <canvas id="kof-gl"> escondido na página; aqui, dentro do Worker,
 * um OffscreenCanvas (o WebGL2 funciona igual). A ponte procura o canvas por '#kof-gl': um `document` mínimo responde.
 */
function doModulo(s: SessaoLibretro): Record<string, unknown> {
  if (!s.config.gl) return {};
  if (typeof OffscreenCanvas !== 'function') throw new Error('esse navegador não tem OffscreenCanvas (o N64 precisa)');
  const cv = new OffscreenCanvas(320, 240);
  const doc = {
    querySelector: (q: string) => (q === '#kof-gl' || q === '#canvas' ? cv : null),
    getElementById: (id: string) => (id === 'kof-gl' || id === 'canvas' ? cv : null),
  };
  eu.document = doc;
  return { canvas: cv };
}

function mandarQuadro(s: SessaoLibretro) {
  const copia = s.quadro.slice();
  enviar({ tipo: 'quadro', pixels: copia.buffer, largura: s.info.largura, altura: s.info.altura }, [copia.buffer]);
}

function umQuadro(s: SessaoLibretro, comSom: boolean) {
  const t0 = performance.now();
  const { audio } = s.rodar();
  med.nucleo += performance.now() - t0;
  med.quadros++;
  anotarQuadro(s);
  if (comSom && anel && reamostrador) escrever(anel, reamostrador.converter(audio));
}

function passo() {
  if (parado) return;
  setTimeout(passo, 4);
  const s = sessao;
  const agora = performance.now();
  const dt = Math.min(agora - ultimoPasso, 100);
  ultimoPasso = agora;
  if (!s || pausado) return;
  if (rb.querendo && rb.r && (rb.rebobinou || prontoPraVoltar())) {
    rb.acumulado += dt;
    for (let k = 0; rb.acumulado >= 1000 / 60 && k < 4; k++) {
      rb.acumulado -= 1000 / 60;
      if (!passoPraTras(s)) {
        terminarRebobinar();
        rb.querendo = false; // acabou o tempo: só volta a rebobinar soltando e apertando de novo
        break;
      }
    }
    return;
  }
  rb.acumulado = 0;
  if (rb.rebobinou) terminarRebobinar();
  let vezes = 0;
  if (turbo) {
    for (; vezes < MAX_QUADROS_POR_PASSO; vezes++) umQuadro(s, false);
  } else if (somTocando && anel) {
    const alvo = taxaSaida * 0.06;
    while (ocupacao(anel) < alvo && vezes < MAX_QUADROS_POR_PASSO) {
      umQuadro(s, true);
      vezes++;
    }
  } else if (relogio) {
    const n = relogio.passo(dt);
    for (; vezes < n; vezes++) umQuadro(s, true);
  }
  if (vezes) depoisDeRodar(vezes);
  if (vezes > 1) med.atrasos += vezes - 1;
  if (vezes) mandarQuadro(s);
  conferirSram(s, agora);
  if (agora - med.desde >= 1000) {
    const faltas = anel ? Atomics.load(anel.ctl, 2) : 0;
    enviar({
      tipo: 'medicao',
      m: {
        fps: Math.round((med.quadros * 1000) / (agora - med.desde)),
        nucleoMs: med.quadros ? +(med.nucleo / med.quadros).toFixed(2) : 0,
        atrasos: med.atrasos,
        faltasDeSom: faltas - med.faltasAntes,
        somNaFilaMs: anel ? Math.round((ocupacao(anel) * 1000) / taxaSaida) : 0,
      },
    });
    Object.assign(med, { quadros: 0, nucleo: 0, atrasos: 0, desde: agora, faltasAntes: faltas });
  }
}

eu.onmessage = async ({ data: m }) => {
  switch (m.tipo) {
    case 'iniciar':
      try {
        const s = new SessaoLibretro(m.sistema);
        await s.iniciar(await carregarNucleo(m.urlNucleo, s.config.nucleo), m.opcoes ?? {}, doModulo(s));
        const info = s.carregar(m.rom, m.extras ?? {});
        if (m.sram && s.tamanhoSram) {
          s.escreverSram(m.sram); // o save vai antes do 1º quadro, e o jogo recomeça com ele (como no antigo)
          s.reiniciar();
        }
        sramAntes = s.tamanhoSram ? s.lerSram() : null;
        novoRebob(s);
        novoMarco(s, true);
        sessao = s;
        taxaSaida = m.taxaSaida;
        anel = m.sab ? criarAnel((m.sab.byteLength - 16) / 8, m.sab) : null;
        reamostrador = new Reamostrador(info.taxaAudio, taxaSaida);
        relogio = criarRelogio(info.fps);
        ultimoPasso = med.desde = performance.now();
        enviar({ tipo: 'pronto', info });
        passo();
      } catch (e) {
        enviar({ tipo: 'erro', mensagem: e instanceof Error ? e.message : String(e), log: sessao?.log ?? [] });
      }
      break;
    case 'pad':
      if (sessao) sessao.pad[m.jogador] = m.bits;
      break;
    case 'eixos':
      if (sessao) sessao.eixos[m.jogador] = m.e.slice(0, 4);
      break;
    case 'pausar':
      pausado = m.sim;
      if (!pausado) relogio = sessao ? criarRelogio(sessao.info.fps) : null; // voltou: sem correr atrás do tempo parado
      break;
    case 'turbo':
      turbo = m.sim;
      break;
    case 'cacador':
      cacador = m.ligado;
      novoMarco(sessao, true);
      break;
    case 'som':
      somTocando = m.tocando;
      break;
    case 'reiniciar':
      sessao?.reiniciar();
      novoRebob(sessao);
      novoMarco(sessao, true);
      break;
    case 'opcoes':
      sessao?.mudarOpcoes(m.opcoes);
      break;
    case 'rebob-config':
      Object.assign(rb, { ligado: m.ligado, limite: m.limite, recargaX: m.recargaX });
      novoRebob(sessao);
      break;
    case 'rebob-zerar':
      novoRebob(sessao);
      break;
    case 'rebobinar':
      rb.querendo = m.sim;
      break;
    case 'sram-escrever':
      if (sessao?.tamanhoSram) {
        sessao.escreverSram(m.bytes);
        sramAntes = sessao.lerSram();
      }
      break;
    case 'pedido': {
      const s = sessao;
      if (!s) {
        enviar({ tipo: 'resposta', id: m.id, ok: false, erro: 'nenhum jogo aberto' });
        break;
      }
      if (m.pedido === 'estado-salvar') responder(m.id, () => s.salvarEstado());
      else if (m.pedido === 'sram-ler') responder(m.id, () => s.lerSram());
      else if (m.pedido === 'bug-pacote') responder(m.id, () => pacoteDoBug(s));
      else if (m.pedido === 'estado-carregar')
        responder(m.id, () => {
          s.carregarEstado(m.bytes ?? new Uint8Array(0));
          novoRebob(s);
          novoMarco(s, true);
          s.rodar(); // um quadro já com o estado, pra imagem certa na tela
          mandarQuadro(s);
          return undefined;
        });
      break;
    }
    case 'parar':
      parado = true;
      sessao = null;
      break;
  }
};
