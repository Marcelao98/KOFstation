// Botões do jogador 1 no jogo: teclado (teclas padrão do antigo) + todos os controles. Tab segurado = turbo.
// Select+Start = menu rápido (combinação do emulador: não chega no jogo); Backspace ou Select+Y = rebobinar.
import { ANALOGICO, BOTAO, eixosDoTeclado, semOpostos, tecladoBits } from '@kof/domain';
import { bitsDeTodos, controlesDoNavegador } from '@kof/engine';
import { useEffect } from 'react';
import { usarEntrada } from '../stores/entrada';
import { usarJogo } from '../stores/jogo';
import { usarModo } from '../stores/modo';
import { conferirRebobinar, usarRebob } from '../stores/rebob';
import { usarTelas } from '../stores/telas';

/** Analógicos do 1º controle ligado (zona morta de 15%), como o eixoPad do antigo. */
function eixosDoControle(): number[] | null {
  for (const g of controlesDoNavegador()) {
    if (!g) continue;
    const e = [0, 1, 2, 3].map((i) => {
      const v = g.axes[i] ?? 0;
      return Math.abs(v) < 0.15 ? 0 : Math.round(Math.max(-1, Math.min(1, v)) * 32767);
    });
    if (e.some((x) => x)) return e;
  }
  return null;
}

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
      if (e.code === 'Backspace') {
        e.preventDefault();
        usarRebob.setState({ tecla: true });
        return;
      }
      if (usarEntrada.getState().capturando) return; // a tela Controles está esperando essa tecla
      const { teclas, teclasEixo } = usarEntrada.getState().entrada;
      if (teclas[e.code] !== undefined || teclasEixo[e.code] !== undefined) {
        e.preventDefault();
        apertadas.add(e.code);
      }
    };
    const sobe = (e: KeyboardEvent) => {
      if (e.code === 'Tab') usarJogo.getState().jogo?.turbo(false);
      if (e.code === 'Backspace') usarRebob.setState({ tecla: false });
      apertadas.delete(e.code);
    };
    const soltarTudo = () => {
      apertadas.clear();
      usarRebob.setState({ tecla: false, pad: false });
      usarJogo.getState().jogo?.turbo(false);
    };
    const t = setInterval(() => {
      const jogo = usarJogo.getState().jogo;
      if (!jogo) return;
      conferirRebobinar(noJogo());
      if (!noJogo()) return jogo.botoesDo(0, 0);
      const { teclas, teclasEixo, botoes } = usarEntrada.getState().entrada;
      const sis = usarJogo.getState().info?.sistema ?? 'snes';
      const analog = ANALOGICO[sis];
      let teclado = 0;
      for (const k of apertadas) teclado |= teclas[k] ?? 0;
      const eixos = eixosDoTeclado(apertadas, teclasEixo); // analógico no teclado (PS1/PS2/N64)
      let b = bitsDeTodos(controlesDoNavegador(), botoes, analog === 'puro') | tecladoBits(teclado, eixos, analog);
      jogo.eixosDo(0, eixos ?? eixosDoControle());
      b = semOpostos(b);
      const selY = BOTAO.Select | BOTAO.Y; // Select+Y segurado = rebobinar (como no antigo)
      const padVolta = (b & selY) === selY;
      if (padVolta !== usarRebob.getState().pad) usarRebob.setState({ pad: padVolta });
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
