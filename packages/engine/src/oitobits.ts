// A música própria do KOFstation em 8 bits (web/musica.js do antigo, `KofMusica`): um chip simples no estilo do NES
// (2 pulsos, triângulo e ruído) a 32 kHz tocando o Air (Bach, notas do Mutopia: air.json, que vem do antigo pelo
// manifesto) e "Se Essa Rua Fosse Minha" (cantiga popular, melodia abaixo). O antigo só tocava isso quando faltava o
// violino ou o núcleo FM; aqui é a mesma reserva. O código é o mesmo, conta por conta (o som sai igual).
import { TAM_ONDA, wavDeFonte, type FonteDeMusica } from './musica';

const TAXA = 32000;

/** Dados de uma música: tempos em batidas; cada voz é uma lista [início, duração, nota MIDI]. */
export interface DadosOitoBits {
  bpm: number;
  tempos: number;
  vozes: [number, number, number][][];
}

const RUA = {
  bpm: 66,
  anacruse: 1,
  melodia:
    'E5:.5 E5:.5 ' +
    'A5:.5 A5:.5 E5:.5 C5:.5 A4:.5 C5:.5 G5:.5 F5:.5 E5:1 B4:2 E5:.5 E5:.5 ' +
    'B5:.5 B5:.5 F5:.5 E5:.5 F5:.5 E5:.5 C6:.5 B5:.5 A5:3 E5:.5 E5:.5 ' +
    'A5:.5 A5:.5 C6:.5 B5:.5 A5:.5 G5:.5 F5:.5 E5:.5 G5:1 F5:2 E5:.5 D5:.5 ' +
    'E5:1 B5:.5 G#5:.5 E5:.5 D5:.5 C5:.5 B4:.5 A4:2',
  acordes: 'Am Am E E E E Am Am Am Am Dm Dm E E Am',
};
const ACORDE: Record<string, number[]> = {
  Am: [45, 52, 57, 60, 64],
  E: [40, 47, 56, 59, 64],
  Dm: [38, 45, 57, 62, 65],
};
const NOTA: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (t: string): number | null => {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(t);
  return m ? 12 * (+(m[3] ?? 0) + 1) + (NOTA[m[1] ?? 'C'] ?? 0) + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) : null;
};

export function dadosDaRua(): DadosOitoBits {
  const mel: [number, number, number][] = [];
  const baixo: [number, number, number][] = [];
  const arpejo: [number, number, number][] = [];
  let t = 0;
  for (const p of RUA.melodia.trim().split(/\s+/)) {
    const [n = '-', d = '0'] = p.split(':');
    const dur = +d;
    const nota = midi(n);
    if (n !== '-' && nota !== null) mel.push([t, dur, nota]);
    t += dur;
  }
  RUA.acordes.split(/\s+/).forEach((a, k) => {
    const ac = ACORDE[a] ?? [];
    const ini = RUA.anacruse + k * 2;
    baixo.push([ini, 0.9, ac[0] ?? 0], [ini + 1, 0.9, ac[1] ?? 0]);
    for (let i = 0; i < 4; i++) arpejo.push([ini + i * 0.5, 0.45, (ac[2 + (i % 3)] ?? 0) + 12]);
  });
  return { bpm: RUA.bpm, tempos: Math.ceil(t), vozes: [mel, arpejo, baixo] };
}

const NOMES = ['Pulso 1', 'Pulso 2', 'Triângulo', 'Ruído'];
const PAPEIS = ['melodia', 'harmonia', 'baixo', '—'];
/** timbre de cada canal: [forma, volume, pan (-1 esquerda .. 1 direita), vibrato] */
const P25: [string, number, number, number] = ['p25', 0.17, 0, 1];
const VOZ: [string, number, number, number][] = [
  P25,
  ['p12', 0.07, -0.35, 0],
  ['tri', 0.26, 0.1, 0],
  ['ruido', 0, 0, 0],
];
const BLOCO = 512;

interface Nota {
  ini: number;
  fim: number;
  f: number;
}

/** Arredonda pra Int16 como o `Int16Array` do antigo (atribuição trunca e satura em 16 bits). */
const i16 = (x: number) => (Math.trunc(x) << 16) >> 16;

export class MusicaOitoBits implements FonteDeMusica {
  canais = 4;
  nomes = NOMES;
  papeis = PAPEIS;
  escalas = [1 / 9000, 1 / 9000, 1 / 9000, 1 / 9000];
  taxa = TAXA;
  taxaOnda = TAXA;
  amostras = 0;
  readonly temOndas = true;
  readonly segundos: number;
  private vozes: Nota[][];
  private fase = [0, 0, 0, 0];
  private idx = [0, 0, 0];
  private onda = new Int16Array(4 * 4096);
  private saida = new Int16Array(BLOCO * 2);
  private t = 0;
  private pos = 0;
  private mudas = 0;
  private ruido = 1;

  constructor(d: DadosOitoBits) {
    const seg = 60 / d.bpm;
    this.segundos = d.tempos * seg;
    this.vozes = d.vozes.slice(0, 3).map((v) =>
      v
        .map(([ini, dur, n]) => ({
          ini: ini * seg,
          fim: (ini + dur) * seg * 0.97,
          f: 440 * Math.pow(2, (n - 69) / 12),
        }))
        .sort((a, b) => a.ini - b.ini),
    );
  }

  private amostraVoz(v: number, nota: Nota | null, tt: number): number {
    if (!nota) return 0;
    const voz = VOZ[v] ?? P25;
    const dt = tt - nota.ini;
    const falta = nota.fim - tt;
    let env = Math.min(1, dt / 0.008) * (falta < 0.04 ? Math.max(0, falta / 0.04) : 1);
    if (voz[0] !== 'tri') env *= 0.75 + 0.25 * Math.exp(-dt * 3);
    let f = nota.f;
    if (voz[3] && dt > 0.25) f *= 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * dt) * Math.min(1, (dt - 0.25) * 2);
    this.fase[v] = ((this.fase[v] ?? 0) + f / TAXA) % 1;
    const p = this.fase[v] ?? 0;
    let s;
    if (voz[0] === 'p25') s = p < 0.25 ? 1 : -1;
    else if (voz[0] === 'p12') s = p < 0.125 ? 1 : -1;
    else s = (Math.floor(p * 32) < 16 ? Math.floor(p * 32) : 31 - Math.floor(p * 32)) / 7.5 - 1;
    return s * env;
  }

  private notaAtual(v: number, tt: number): Nota | null {
    const l = this.vozes[v] ?? [];
    let i = this.idx[v] ?? 0;
    while (i < l.length && (l[i]?.fim ?? 0) < tt) i++;
    this.idx[v] = i;
    const n = l[i];
    return n && n.ini <= tt && tt < n.fim ? n : null;
  }

  mudar(m: number): void {
    this.mudas = m;
  }

  quadro(): Int16Array {
    for (let i = 0; i < BLOCO; i++) {
      let l = 0;
      let r = 0;
      for (let v = 0; v < 3; v++) {
        const voz = VOZ[v] ?? P25;
        const s = this.amostraVoz(v, this.notaAtual(v, this.t), this.t) * voz[1];
        this.onda[v * 4096 + (this.pos & 4095)] = i16(s * 32767);
        if (this.mudas & (1 << v)) continue;
        l += s * (1 - Math.max(0, voz[2]));
        r += s * (1 + Math.min(0, voz[2]));
      }
      this.ruido = (this.ruido >> 1) | (((this.ruido ^ (this.ruido >> 1)) & 1) << 14);
      this.onda[3 * 4096 + (this.pos & 4095)] = 0;
      this.saida[i * 2] = i16(Math.max(-1, Math.min(1, l)) * 32767);
      this.saida[i * 2 + 1] = i16(Math.max(-1, Math.min(1, r)) * 32767);
      this.pos++;
      this.t += 1 / TAXA;
      if (this.t >= this.segundos) {
        this.t = 0;
        this.idx.fill(0);
      }
    }
    this.amostras += BLOCO;
    return this.saida;
  }

  ondas(destino = new Int16Array(this.canais * TAM_ONDA)): Int16Array {
    for (let v = 0; v < this.canais; v++)
      for (let k = 0; k < TAM_ONDA; k++)
        destino[v * TAM_ONDA + k] = this.onda[v * 4096 + ((this.pos - TAM_ONDA + k) & 4095)] ?? 0;
    return destino;
  }

  niveis(ondas?: Int16Array): Float32Array {
    const r = new Float32Array(this.canais);
    if (!ondas) return r;
    for (let v = 0; v < this.canais; v++) {
      let mx = 0;
      for (let k = TAM_ONDA - 512; k < TAM_ONDA; k++) mx = Math.max(mx, Math.abs(ondas[v * TAM_ONDA + k] ?? 0));
      r[v] = Math.min(1, mx / 9000);
    }
    return r;
  }

  gerarWav(segundos: number, fadeMs: number, pausa?: () => Promise<void>): Promise<{ pcm: Int16Array; taxa: number }> {
    return wavDeFonte(this, segundos, fadeMs, pausa);
  }
}
