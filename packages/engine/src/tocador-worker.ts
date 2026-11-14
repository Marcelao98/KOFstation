// Worker do tocador da jukebox: uma instância do núcleo só pra música (o jogo aberto continua no Worker dele). Mantém
// ~100 ms de som no anel do AudioWorklet, aplica o fade do fim da faixa e manda as ondas pra tela ~30 vezes por segundo.
import { criarAnel, criarAnelLocal, drenar, escrever, ocupacao, type Anel } from './anel';
import type { FabricaDeNucleo } from './libretro';
import type { DoTocador, ParaTocador } from './mensagens';
import { ganhoDoFade, Musica, MusicaFm, type FonteDeMusica, type ModuloSomFm } from './musica';
import { MusicaOitoBits } from './oitobits';
import { Reamostrador } from './reamostrador';
import { montarWav } from './spc';

const eu = self as unknown as {
  postMessage(m: DoTocador, t?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ParaTocador>) => void) | null;
  window?: unknown;
} & Record<string, unknown>;

let musica: FonteDeMusica | null = null;
let anel: Anel | null = null;
/** sem SharedArrayBuffer: o anel é só do Worker; o som vai por mensagem e o quanto "já tocou" vem de um relógio virtual */
let pcmPorMensagem = false;
let produzidas = 0;
let tempoTocadoMs = 0;
let ultimoPasso = 0;
let ream: Reamostrador | null = null;
let taxaSaida = 48000;
let tocando = false;
let parado = false;
let fimAvisado = false;
const cfg = { segundos: 0, fadeMs: 8000, repetir: false };
let ultimaOnda = 0;
let pcm = new Int16Array(4096);

const enviar = (m: DoTocador, t?: Transferable[]) => eu.postMessage(m, t);

async function carregarNucleo(url: string, nucleo: string): Promise<FabricaDeNucleo> {
  const nome = `Nucleo_${nucleo}`;
  if (typeof eu[nome] !== 'function') {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`não achei o núcleo ${nucleo} (${url}: ${r.status})`);
    const codigo = await r.text();
    eu.window = self;
    (0, eval)(codigo);
  }
  const f = eu[nome];
  if (typeof f !== 'function') throw new Error(`o arquivo do núcleo ${nucleo} não criou ${nome}`);
  return f as FabricaDeNucleo;
}

function umQuadro(m: FonteDeMusica) {
  const t0 = m.amostras / m.taxa;
  const a = m.quadro();
  const seg = cfg.repetir ? 0 : cfg.segundos;
  if (pcm.length < a.length) pcm = new Int16Array(a.length * 2);
  const v = pcm.subarray(0, a.length);
  for (let i = 0; i + 1 < a.length; i += 2) {
    const k = ganhoDoFade(t0 + i / 2 / m.taxa, seg, cfg.fadeMs);
    v[i] = (a[i] ?? 0) * k;
    v[i + 1] = (a[i + 1] ?? 0) * k;
  }
  if (anel && ream) escrever(anel, ream.converter(v));
  if (pcmPorMensagem && anel) {
    const d = drenar(anel);
    if (d) {
      produzidas += d.length / 2;
      enviar({ tipo: 'pcm', dados: d }, [d.buffer]);
    }
  }
  if (seg && m.amostras / m.taxa > seg + cfg.fadeMs / 1000 && !fimAvisado) {
    fimAvisado = true;
    enviar({ tipo: 'fim' });
  }
}

/** Quanto som está esperando pra tocar (quadros estéreo): o anel de verdade, ou o relógio virtual sem memória compartilhada. */
function fila(): number {
  if (!anel) return 0;
  return pcmPorMensagem ? Math.max(0, produzidas - (tempoTocadoMs / 1000) * taxaSaida) : ocupacao(anel);
}

function passo() {
  if (parado) return;
  setTimeout(passo, 8);
  const m = musica;
  if (!m || !anel) return;
  const agora = performance.now();
  if (tocando) tempoTocadoMs += agora - (ultimoPasso || agora);
  ultimoPasso = agora;
  if (tocando && !fimAvisado) {
    for (let k = 0; fila() < taxaSaida * 0.1 && k < 8; k++) umQuadro(m);
  }
  if (agora - ultimaOnda >= 33) {
    ultimaOnda = agora;
    const ondas = m.ondas();
    const niveis = tocando ? m.niveis(ondas) : new Float32Array(m.canais);
    enviar({ tipo: 'ondas', amostras: m.amostras, filaMs: (fila() * 1000) / taxaSaida, ondas, niveis }, [
      ondas.buffer,
      niveis.buffer,
    ]);
  }
}

eu.onmessage = async ({ data: d }) => {
  try {
    switch (d.tipo) {
      case 'iniciar': {
        const nucleo = d.urlNucleo.split('/').pop()?.replace(/\.js$/, '') ?? '';
        let m: FonteDeMusica;
        if (d.faixa.oito) m = new MusicaOitoBits(d.faixa.oito);
        else {
          const fab = await carregarNucleo(d.urlNucleo, nucleo);
          m = d.faixa.fm
            ? await MusicaFm.abrir(d.faixa.fm, fab as unknown as () => Promise<ModuloSomFm>)
            : await Musica.abrir(d.faixa, fab);
        }
        m.mudar(d.mudas);
        Object.assign(cfg, { segundos: d.segundos, fadeMs: d.fadeMs, repetir: d.repetir });
        musica = m;
        taxaSaida = d.taxaSaida;
        pcmPorMensagem = !d.sab && !!d.pcm;
        anel = d.sab
          ? criarAnel((d.sab.byteLength - 16) / 8, d.sab)
          : pcmPorMensagem
            ? criarAnelLocal(Math.round(taxaSaida * 0.5))
            : null;
        ream = new Reamostrador(m.taxa, taxaSaida);
        enviar({
          tipo: 'pronto',
          canais: m.canais,
          nomes: [...m.nomes.slice(0, m.canais)],
          papeis: [...m.papeis.slice(0, m.canais)],
          escalas: [...m.escalas.slice(0, m.canais)],
          taxa: m.taxa,
          taxaOnda: m.taxaOnda,
          temOndas: m.temOndas,
        });
        if (anel) passo();
        break;
      }
      case 'mudas':
        musica?.mudar(d.m);
        break;
      case 'config':
        Object.assign(cfg, { segundos: d.segundos, fadeMs: d.fadeMs, repetir: d.repetir });
        if (musica && (cfg.repetir || musica.amostras / musica.taxa < cfg.segundos)) fimAvisado = false;
        break;
      case 'tocar':
        tocando = d.sim;
        break;
      case 'wav': {
        if (!musica) throw new Error('nenhuma faixa carregada');
        const { pcm: p, taxa } = await musica.gerarWav(
          d.segundos,
          d.fadeMs,
          () => new Promise((ok) => setTimeout(ok, 0)),
        );
        const bytes = montarWav(p, taxa);
        enviar({ tipo: 'wav', bytes }, [bytes.buffer]);
        break;
      }
      case 'parar':
        parado = true;
        musica = null;
        break;
    }
  } catch (e) {
    enviar({ tipo: 'erro', mensagem: e instanceof Error ? e.message : String(e) });
  }
};
