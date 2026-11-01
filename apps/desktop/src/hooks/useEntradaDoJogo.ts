// Botões dos jogadores 1 a 4 no jogo: o teclado (pelo mapa da tela Controles) é o J1 e cada controle pega a sua vaga
// (escolha guardada pelo nome). Tab segurado = turbo.
// Select+Start = menu rápido (combinação do emulador: não chega no jogo); Backspace ou Select+Y = rebobinar.
import { ANALOGICO, BOTAO, eixosDoTeclado, juntarJogadores, semOpostos, tecladoBits } from '@kof/domain';
import { aparelhosDeControle } from '../app/aparelhos';
import { usarAvisos } from '../stores/avisos';
import { vagas, vistos } from '../stores/jogadores';
import { useEffect } from 'react';
import { usarEntrada } from '../stores/entrada';
import { usarJogo } from '../stores/jogo';
import { usarModo } from '../stores/modo';
import { conferirRebobinar, usarRebob } from '../stores/rebob';
import { usarTelas } from '../stores/telas';

let apertadasAgora: Set<string> = new Set();

/** Os aparelhos ligados agora, com o teclado pelo mapa (a tela Jogadores usa, com ou sem jogo). */
export function lerAparelhosAgora() {
  const { teclas, teclasEixo, botoes } = usarEntrada.getState().entrada;
  const analog = ANALOGICO[usarJogo.getState().info?.sistema ?? 'snes'];
  let teclado = 0;
  for (const k of apertadasAgora) teclado |= teclas[k] ?? 0;
  const eixos = eixosDoTeclado(apertadasAgora, teclasEixo);
  return aparelhosDeControle({ b: tecladoBits(teclado, eixos, analog), e: eixos }, botoes, analog === 'puro');
}

export function useEntradaDoJogo() {
  useEffect(() => {
    const apertadas = new Set<string>();
    apertadasAgora = apertadas;
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
      if (!noJogo()) {
        for (let n = 0; n < 4; n++) jogo.botoesDo(n, 0);
        return;
      }
      const { teclas, teclasEixo, botoes } = usarEntrada.getState().entrada;
      const sis = usarJogo.getState().info?.sistema ?? 'snes';
      const analog = ANALOGICO[sis];
      let teclado = 0;
      for (const k of apertadas) teclado |= teclas[k] ?? 0;
      const eixos = eixosDoTeclado(apertadas, teclasEixo); // analógico no teclado (PS1/PS2/N64)
      // cada aparelho vai pro seu jogador (o teclado é o J1); o que vale pros atalhos é tudo junto
      const aparelhos = aparelhosDeControle(
        { b: tecladoBits(teclado, eixos, analog), e: eixos },
        botoes,
        analog === 'puro',
      );
      const r = juntarJogadores(aparelhos, vagas);
      aparelhos.forEach((a, n) => {
        if (a.k === 'teclado' || vistos.has(a.k)) return;
        vistos.add(a.k);
        usarAvisos.getState().avisar(`🎮 ${a.nome} = Jogador ${(r.j[n] ?? 0) + 1}`, 2500);
      });
      const todos = semOpostos(r.b.reduce((x, y) => x | y, 0));
      const selY = BOTAO.Select | BOTAO.Y; // Select+Y segurado = rebobinar (como no antigo)
      const padVolta = (todos & selY) === selY;
      if (padVolta !== usarRebob.getState().pad) usarRebob.setState({ pad: padVolta });
      const selStart = BOTAO.Select | BOTAO.Start;
      if ((todos & selStart) === selStart) {
        if (!combo) usarJogo.getState().abrirRapido();
        combo = true;
      } else if (!(todos & selStart)) combo = false;
      for (let n = 0; n < 4; n++) {
        let b = semOpostos(r.b[n] ?? 0);
        if (combo) b &= ~selStart;
        jogo.botoesDo(n, b);
        jogo.eixosDo(n, r.e[n] ?? null);
      }
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
