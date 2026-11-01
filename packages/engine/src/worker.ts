// Worker do núcleo: carrega o núcleo do kofstation-old, roda os quadros e manda imagem e som. O ritmo é o do SOM quando
// ele está tocando (mantém ~60 ms no anel; o AudioWorklet consome no relógio da placa de som); sem som, um relógio
// pelo fps do núcleo. No máximo 4 quadros de uma vez (igual ao antigo); turbo = 4 por passo.
import { criarAnel, escrever, ocupacao, type Anel } from './anel';
import { SessaoLibretro, type FabricaDeNucleo } from './libretro';
import type { DoWorker, ParaWorker } from './mensagens';
import { Reamostrador } from './reamostrador';
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

function mandarQuadro(s: SessaoLibretro) {
  const copia = s.quadro.slice();
  enviar({ tipo: 'quadro', pixels: copia.buffer, largura: s.info.largura, altura: s.info.altura }, [copia.buffer]);
}

function umQuadro(s: SessaoLibretro, comSom: boolean) {
  const t0 = performance.now();
  const { audio } = s.rodar();
  med.nucleo += performance.now() - t0;
  med.quadros++;
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
        await s.iniciar(await carregarNucleo(m.urlNucleo, s.config.nucleo), m.opcoes ?? {});
        const info = s.carregar(m.rom);
        if (m.sram && s.tamanhoSram) {
          s.escreverSram(m.sram); // o save vai antes do 1º quadro, e o jogo recomeça com ele (como no antigo)
          s.reiniciar();
        }
        sramAntes = s.tamanhoSram ? s.lerSram() : null;
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
    case 'pausar':
      pausado = m.sim;
      if (!pausado) relogio = sessao ? criarRelogio(sessao.info.fps) : null; // voltou: sem correr atrás do tempo parado
      break;
    case 'turbo':
      turbo = m.sim;
      break;
    case 'som':
      somTocando = m.tocando;
      break;
    case 'reiniciar':
      sessao?.reiniciar();
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
      else if (m.pedido === 'estado-carregar')
        responder(m.id, () => {
          s.carregarEstado(m.bytes ?? new Uint8Array(0));
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
