// Quando o jogo para: pausa pedida (P/Esc), menu rápido, qualquer tela por cima, ou a janela sem foco ("Pausar ao sair
// da janela", ligado como no antigo). `usePausado` só calcula; `usePausa` (uma vez, no App) aplica na engine.
import { useEffect, useState } from 'react';
import { config } from '../stores/config';
import { usarJogo } from '../stores/jogo';
import { usarModo } from '../stores/modo';
import { jogoPausadoPorTela, usarTelas } from '../stores/telas';
import { usarTransmissao } from '../stores/transmissao';

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
  const perguntando = usarModo((m) => m.perguntando);
  // transmitindo pro celular (Jogar no PC), sair da janela do PC não pausa: quem joga está no celular
  const transmitindo = usarTransmissao((t) => t.ligada);
  const pausaAuto = config().ler('pausaAuto') !== '0' && !transmitindo;
  return pausaManual || rapidoAberto || perguntando || jogoPausadoPorTela(telas) || (!focada && pausaAuto);
}

/** O jogo está rodando agora? (as estatísticas só contam o tempo jogando de verdade) */
export const pausaAtual = { pausado: true };

export function usePausa(): void {
  const jogo = usarJogo((j) => j.jogo);
  const pausado = usePausado();
  useEffect(() => {
    jogo?.pausar(pausado);
    pausaAtual.pausado = !jogo || pausado;
  }, [jogo, pausado]);
}
