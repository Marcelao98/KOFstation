// Os aparelhos de controle ligados agora (aparelhosDeControle do antigo): o teclado sempre e cada controle da
// Gamepad API. Celulares pela rede chegam no M13.
import { bitsDoControle, nomeDoPad, semOpostos, type Aparelho } from '@kof/domain';
import { controlesDoNavegador } from '@kof/engine';

export interface LeituraDoTeclado {
  b: number;
  e: number[] | null;
}

const eixoPad = (v: number) => (Math.abs(v) < 0.15 ? 0 : Math.round(Math.max(-1, Math.min(1, v)) * 32767));

export function aparelhosDeControle(
  teclado: LeituraDoTeclado,
  botoes: readonly (readonly [number, number])[],
  puro: boolean,
): Aparelho[] {
  const l: Aparelho[] = [{ k: 'teclado', nome: 'Teclado', b: teclado.b, e: teclado.e }];
  for (const g of controlesDoNavegador()) {
    if (!g || !(g as Gamepad).connected) continue;
    const gp = g as Gamepad;
    l.push({
      k: 'pad:' + gp.id + '#' + gp.index,
      nome: nomeDoPad(gp.id),
      b: semOpostos(bitsDoControle(gp, botoes, puro)),
      e: [0, 1, 2, 3].map((i) => eixoPad(gp.axes[i] ?? 0)),
    });
  }
  return l;
}
