// Quando o jogo para: pausa pedida (P/Esc), menu rápido, qualquer tela por cima, ou a janela sem foco ("Pausar ao sair
// da janela", ligado como no antigo). `usePausado` só calcula; `usePausa` (uma vez, no App) aplica na engine.
import { useEffect, useState } from 'react';
import { usarJogo } from '../stores/jogo';
import { jogoPausadoPorTela, usarTelas } from '../stores/telas';

function useFoco(): boolean {
  const [focada, setFocada] = useState(() => document.hasFocus());
  useEffect(() => {
    const f = () => setFocada(true);
    const b = () => setFocada(false);
    addEventListener('focus', f);
    addEventListener('blur', b);
    return () => {
      removeEventListener('focus', f);
      removeEventListener('blur', b);
    };
  }, []);
  return focada;
}

export function usePausado(): boolean {
  const { pausaManual, rapidoAberto } = usarJogo();
  const telas = usarTelas();
  const focada = useFoco();
  return pausaManual || rapidoAberto || jogoPausadoPorTela(telas) || !focada;
}

export function usePausa(): void {
  const jogo = usarJogo((j) => j.jogo);
  const pausado = usePausado();
  useEffect(() => {
    jogo?.pausar(pausado);
  }, [jogo, pausado]);
}
