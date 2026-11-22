// 🎲 A Mesa vista DESTE aparelho quando ele não é o núcleo (tarefa M): o que o núcleo contou no canal `mesa` (a vaga
// deste aparelho, o tipo de controle, as quatro vagas). Fica separado do stores/mesa pra o modo controle poder
// perguntar sem dar a volta (mesa → arranjo → modoControle).
import type { VistaDaMesa } from '@kof/domain';
import { create } from 'zustand';

export interface EstadoMinhaVaga {
  /** quem mandou (o núcleo, pelo id que este aparelho conhece) e quando */
  de: string;
  quando: number;
  vista: VistaDaMesa | null;
}

export const usarMinhaVaga = create<EstadoMinhaVaga>()(() => ({ de: '', quando: 0, vista: null }));

/** A vista do núcleo `de`, se ainda vale (o núcleo manda de novo a cada 3 s; 10 s calado = sem mesa). */
export function minhaVista(de?: string | null): VistaDaMesa | null {
  const s = usarMinhaVaga.getState();
  if (!s.vista || (de && s.de !== de) || performance.now() - s.quando > 10_000) return null;
  return s.vista;
}
