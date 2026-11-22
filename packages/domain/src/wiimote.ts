// 📱 O celular como Wiimote (W.6): o que os sensores do celular viram no Wiimote do Dolphin.
//
// Segura o celular em pé na mão, a ponta de cima apontando pra TV e a tela pra cima (como um Wiimote).
// Eixos do celular (Android e o `devicemotion` da página): X pra direita da tela, Y pra ponta de cima, Z saindo da tela.
// Eixos do Wiimote (como o Dolphin do libretro lê): X pra esquerda, Y pra trás (pro jogador), Z pra cima.
// Então: X do Wiimote = −X do celular, Y = −Y, Z = Z (é só uma meia-volta em torno de Z; o giroscópio vira igual).
// Unidades no fio: aceleração em g (o celular dá m/s²) e giroscópio em rad/s (a página dá °/s).

export const GRAVIDADE = 9.80665;

/** O que vai pro núcleo: aceleração (g) e giroscópio (rad/s) nos eixos do Wiimote, e a mira na tela (-1..1). */
export interface MovimentoWii {
  acel: [number, number, number];
  giro: [number, number, number];
  /** onde o Wiimote aponta: -1 esquerda/cima, 1 direita/baixo */
  x: number;
  y: number;
}

export const PARADO: MovimentoWii = { acel: [0, 0, 1], giro: [0, 0, 0], x: 0, y: 0 };

/** Aceleração do celular (m/s², com a gravidade) → do Wiimote (g). */
export const acelDoCelular = (x: number, y: number, z: number): [number, number, number] => [
  -x / GRAVIDADE,
  -y / GRAVIDADE,
  z / GRAVIDADE,
];

/** Giro da página (`rotationRate`: beta em torno de X, gamma de Y, alpha de Z, em °/s) → do Wiimote (rad/s). */
export const giroDoCelular = (alfa: number, beta: number, gama: number): [number, number, number] => {
  const r = Math.PI / 180;
  return [-beta * r, -gama * r, alfa * r];
};

/** Quanto mexer o celular pra mira ir do meio até a borda da tela (sem calibrar). */
export const ARCO_PADRAO = {
  giro: { x: (25 * Math.PI) / 180, y: (18 * Math.PI) / 180 }, // girar 25° pra um lado = borda da tela
  inclinacao: { x: (30 * Math.PI) / 180, y: (25 * Math.PI) / 180 }, // sem giroscópio: deitar 30° pro lado = borda
};
const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/** Diferença de dois ângulos, sempre entre −π e π. */
const delta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** O jeito da mira (vem da calibração, M.4; sem calibrar, o padrão). */
export interface AjusteDaMira {
  /** quanto girar (rad) do meio até a borda; sem, o padrão do modo (giroscópio ou inclinação) */
  arcoX?: number;
  arcoY?: number;
  /** zona morta em volta do meio (0..0.5 da tela): a mira não treme parada */
  zonaMorta?: number;
  /** suavização (0 = nenhuma, 0.9 = muita): menos tremida, um pouco mais de atraso */
  suavizar?: number;
}

/**
 * A mira: com giroscópio, soma o quanto o celular girou (apontar de verdade; passar da borda arrasta o centro junto,
 * então não precisa recentrar); sem giroscópio, a inclinação em relação a como ele estava ao começar: deitar pro lado
 * = esquerda/direita, inclinar a ponta pra frente/trás = cima/baixo. As duas contas valem com o celular deitado
 * (apontando pra TV) ou em pé (tela virada pra quem joga, no notebook). Chacoalhando, a mira fica parada.
 * Os ângulos crus (`angulos()`) servem pro assistente de calibração medir o meio e os cantos.
 */
export class Mira {
  private ax = 0;
  private ay = 0;
  private sx = 0;
  private sy = 0;
  private neutro: { lado: number; frente: number } | null = null;
  private filtro: { lado: number; frente: number } | null = null;

  constructor(private ajuste: AjusteDaMira = {}) {}

  ajustar(a: AjusteDaMira): void {
    this.ajuste = a;
  }

  recentrar(): void {
    this.ax = 0;
    this.ay = 0;
    this.sx = 0;
    this.sy = 0;
    this.neutro = null;
    this.filtro = null;
  }

  /** O quanto o celular girou desde o meio (rad), sem borda nem zona morta. */
  angulos(): { x: number; y: number } {
    return { x: this.ax, y: this.ay };
  }

  /** acel e giro já nos eixos do Wiimote; giro null = celular sem giroscópio; dt em segundos. */
  atualizar(acel: readonly number[], giro: readonly number[] | null, dt: number): { x: number; y: number } {
    const padrao = giro ? ARCO_PADRAO.giro : ARCO_PADRAO.inclinacao;
    const arcoX = this.ajuste.arcoX ?? padrao.x;
    const arcoY = this.ajuste.arcoY ?? padrao.y;
    if (giro) {
      const d = Math.min(Math.max(dt, 0), 0.1);
      // +Z gira o nariz pra esquerda (mira pra esquerda); +X abaixa o nariz (mira pra baixo). Passou da borda: o
      // ângulo para nela (arrasta o centro junto)
      this.ax = lim(this.ax - (giro[2] ?? 0) * d, arcoX);
      this.ay = lim(this.ay + (giro[0] ?? 0) * d, arcoY);
      return this.saida(arcoX, arcoY);
    }
    const [ax = 0, ay = 0, az = 1] = acel;
    const forca = Math.hypot(ax, ay, az);
    // longe de 1 g é o celular sendo chacoalhado: a "gravidade" medida é mentira, a mira não mexe
    if (forca < 0.75 || forca > 1.25) return { x: this.sx, y: this.sy };
    // lado: quanto da gravidade foi pro X (deitar o lado direito = +X); frente: o giro em torno do X (levantar a
    // ponta deitado, ou incliná-la pra trás em pé), que não trava em nenhuma das duas posições
    const lado = Math.asin(lim(ax / forca, 1));
    const frente = Math.atan2(-ay, az);
    const f = this.filtro
      ? {
          lado: this.filtro.lado + (lado - this.filtro.lado) * 0.2,
          frente: this.filtro.frente + delta(frente, this.filtro.frente) * 0.2,
        }
      : { lado, frente };
    this.filtro = f;
    this.neutro ??= f;
    this.ax = f.lado - this.neutro.lado;
    this.ay = -delta(f.frente, this.neutro.frente);
    return this.saida(arcoX, arcoY);
  }

  private saida(arcoX: number, arcoY: number): { x: number; y: number } {
    const z = lim(this.ajuste.zonaMorta ?? 0, 0.5);
    const morta = (v: number) => (Math.abs(v) <= z ? 0 : (Math.sign(v) * (Math.abs(v) - z)) / (1 - z));
    const x = morta(lim(this.ax / arcoX, 1));
    const y = morta(lim(this.ay / arcoY, 1));
    const k = 1 - lim(this.ajuste.suavizar ?? 0, 0.95);
    this.sx += (x - this.sx) * k;
    this.sy += (y - this.sy) * k;
    return { x: this.sx, y: this.sy };
  }
}

const n3 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);

/**
 * O 3º campo do canal `pad` ("botões,eixos,movimento"): 8 números separados por `;` (W.6), mais o número de
 * sequência e a hora do celular em ms (M.3), pra o PC descartar o atrasado e o fora de ordem. PC velho lê os 8.
 */
export function movPraRede(m: MovimentoWii, seq?: number, ms?: number): string {
  const l = [...m.acel, ...m.giro, m.x, m.y].map(n3);
  if (seq !== undefined && ms !== undefined) l.push(Math.trunc(seq) % 1_000_000, Math.round(ms) % 1_000_000_000);
  return l.join(';');
}

export type MovimentoDaRede = MovimentoWii & { seq?: number; ms?: number };

export function movDaRede(t: string | undefined): MovimentoDaRede | null {
  if (!t) return null;
  const v = t.split(';').map(Number);
  if ((v.length !== 8 && v.length !== 10) || v.some((x) => !Number.isFinite(x))) return null;
  const [ax, ay, az, gx, gy, gz, x, y] = v as [number, number, number, number, number, number, number, number];
  const r: MovimentoDaRede = { acel: [ax, ay, az], giro: [gx, gy, gz], x: lim(x, 1), y: lim(y, 1) };
  if (v.length === 10) {
    r.seq = v[8] as number;
    r.ms = v[9] as number;
  }
  return r;
}

/**
 * M.3: o movimento que chega pela rede, em ordem. Descarta o fora de ordem (número de sequência menor que o último)
 * e o atrasado (chegou mais de `tolerancia` ms depois do que o mais rápido já chegou, comparando a hora do celular
 * com a daqui). Mede a variação da chegada (o "jitter", média do desvio) pro WII-LISO.md.
 */
export class OrdemDoMovimento {
  private ultimo = -1;
  private menorDif = Infinity;
  private desvios: number[] = [];
  descartados = 0;
  recebidos = 0;

  constructor(private tolerancia = 120) {}

  /** `agora` = a hora daqui (ms). Devolve se o movimento vale. Sem seq/hora (celular velho): vale sempre. */
  aceitar(m: { seq?: number; ms?: number }, agora: number): boolean {
    this.recebidos++;
    if (m.seq === undefined || m.ms === undefined) return true;
    // o celular reiniciou (a sequência voltou muito): começa de novo
    if (this.ultimo >= 0 && m.seq < this.ultimo && this.ultimo - m.seq > 1000) this.zerar();
    if (m.seq <= this.ultimo) {
      this.descartados++;
      return false;
    }
    const dif = agora - m.ms; // relógios diferentes: só a diferença entre um e outro importa
    if (dif < this.menorDif) this.menorDif = dif;
    const atraso = dif - this.menorDif;
    this.desvios.push(atraso);
    if (this.desvios.length > 200) this.desvios.shift();
    this.ultimo = m.seq;
    if (atraso > this.tolerancia) {
      this.descartados++;
      return false;
    }
    return true;
  }

  /** Atraso médio a mais que o mais rápido (ms): a variação da chegada. */
  variacao(): number {
    if (!this.desvios.length) return 0;
    return this.desvios.reduce((a, b) => a + b, 0) / this.desvios.length;
  }

  zerar(): void {
    this.ultimo = -1;
    this.menorDif = Infinity;
    this.desvios = [];
  }
}
