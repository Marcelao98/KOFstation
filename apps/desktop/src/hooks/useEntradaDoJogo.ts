// Botões do jogador 1 no jogo: teclado (teclas padrão do antigo) + todos os controles. Tab segurado = turbo.
// Select+Start = menu rápido (combinação do emulador: não chega no jogo). Jogadores 2–4 e teclas trocáveis: M8.
import { BOTAO, TECLAS_PADRAO, semOpostos } from '@kof/domain';
import { bitsDeTodos, controlesDoNavegador } from '@kof/engine';
import { useEffect } from 'react';
import { usarJogo } from '../stores/jogo';
import { usarModo } from '../stores/modo';
import { usarTelas } from '../stores/telas';

export function useEntradaDoJogo() {
  useEffect(() => {
    const apertadas = new Set<string>();
    let combo = false;
    const noJogo = () =>
      usarTelas.getState().atual === 'jogo' && !usarTelas.getState().temasAberto && !usarJogo.getState().rapidoAberto;
    const desce = (e: KeyboardEvent) => {
      if (!usarJogo.getState().jogo || !noJogo()) return;
      if ((e.target as Element | null)?.closest?.('input, textarea, select')) return;
      if (e.code === 'Tab') {
        e.preventDefault();
        if (usarModo.getState().regras.turbo) usarJogo.getState().jogo?.turbo(true);
        return;
      }
      if (TECLAS_PADRAO[e.code] !== undefined) {
        e.preventDefault();
        apertadas.add(e.code);
      }
    };
    const sobe = (e: KeyboardEvent) => {
      if (e.code === 'Tab') usarJogo.getState().jogo?.turbo(false);
      apertadas.delete(e.code);
    };
    const soltarTudo = () => {
      apertadas.clear();
      usarJogo.getState().jogo?.turbo(false);
    };
    const t = setInterval(() => {
      const jogo = usarJogo.getState().jogo;
      if (!jogo) return;
      if (!noJogo()) return jogo.botoesDo(0, 0);
      let b = bitsDeTodos(controlesDoNavegador());
      for (const k of apertadas) b |= TECLAS_PADRAO[k] ?? 0;
      b = semOpostos(b);
      const selStart = BOTAO.Select | BOTAO.Start;
      if ((b & selStart) === selStart) {
        if (!combo) usarJogo.getState().abrirRapido();
        combo = true;
        b &= ~selStart;
      } else if (!(b & selStart)) combo = false;
      jogo.botoesDo(0, b);
    }, 8);
    addEventListener('keydown', desce);
    addEventListener('keyup', sobe);
    addEventListener('blur', soltarTudo);
    return () => {
      clearInterval(t);
      removeEventListener('keydown', desce);
      removeEventListener('keyup', sobe);
      removeEventListener('blur', soltarTudo);
    };
  }, []);
}
