// O estado automático como 1º cartão (chega no M5.3).
import type { RegistroJogo } from '@kof/domain';

export function CartaoAuto(p: { j: RegistroJogo }) {
  void p;
  return null;
}
