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

/** Quanto mexer o celular pra mira ir de um lado ao outro da tela. */
const GIRO_X = (25 * Math.PI) / 180; // girar 25° pra um lado = borda da tela
const GIRO_Y = (18 * Math.PI) / 180;
const INCLINA_X = (30 * Math.PI) / 180; // sem giroscópio: deitar o celular 30° pro lado = borda
const INCLINA_Y = (25 * Math.PI) / 180;
const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/** Diferença de dois ângulos, sempre entre −π e π. */
const delta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * A mira: com giroscópio, soma o quanto o celular girou (apontar de verdade; passar da borda arrasta o centro junto,
 * então não precisa recentrar); sem giroscópio, a inclinação em relação a como ele estava ao começar: deitar pro lado
 * = esquerda/direita, inclinar a ponta pra frente/trás = cima/baixo. As duas contas valem com o celular deitado
 * (apontando pra TV) ou em pé (tela virada pra quem joga, no notebook). Chacoalhando, a mira fica parada.
 */
export class Mira {
  private x = 0;
  private y = 0;
  private neutro: { lado: number; frente: number } | null = null;
  private filtro: { lado: number; frente: number } | null = null;

  recentrar(): void {
    this.x = 0;
    this.y = 0;
    this.neutro = null;
    this.filtro = null;
  }

  /** acel e giro já nos eixos do Wiimote; giro null = celular sem giroscópio; dt em segundos. */
  atualizar(acel: readonly number[], giro: readonly number[] | null, dt: number): { x: number; y: number } {
    if (giro) {
      const d = Math.min(Math.max(dt, 0), 0.1);
      // +Z gira o nariz pra esquerda (mira pra esquerda); +X abaixa o nariz (mira pra baixo)
      this.x = lim(this.x - ((giro[2] ?? 0) * d) / GIRO_X, 1);
      this.y = lim(this.y + ((giro[0] ?? 0) * d) / GIRO_Y, 1);
      return { x: this.x, y: this.y };
    }
    const [ax = 0, ay = 0, az = 1] = acel;
    const forca = Math.hypot(ax, ay, az);
    // longe de 1 g é o celular sendo chacoalhado: a "gravidade" medida é mentira, a mira não mexe
    if (forca < 0.75 || forca > 1.25) return { x: this.x, y: this.y };
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
    this.x = lim((f.lado - this.neutro.lado) / INCLINA_X, 1);
    this.y = lim(-delta(f.frente, this.neutro.frente) / INCLINA_Y, 1);
    return { x: this.x, y: this.y };
  }
}

const n3 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);

/** O 3º campo do canal `pad` ("botões,eixos,movimento"): 8 números separados por `;`. */
export function movPraRede(m: MovimentoWii): string {
  return [...m.acel, ...m.giro, m.x, m.y].map(n3).join(';');
}

export function movDaRede(t: string | undefined): MovimentoWii | null {
  if (!t) return null;
  const v = t.split(';').map(Number);
  if (v.length !== 8 || v.some((x) => !Number.isFinite(x))) return null;
  const [ax, ay, az, gx, gy, gz, x, y] = v as [number, number, number, number, number, number, number, number];
  return { acel: [ax, ay, az], giro: [gx, gy, gz], x: lim(x, 1), y: lim(y, 1) };
}
