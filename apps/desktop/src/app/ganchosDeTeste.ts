// Ganchos SÓ pros testes (existem quando o app usa o backend de teste, nunca no executável): mostrar uma imagem de
// teste no lugar do jogo e aplicar um jeito de imagem, pra comparar os pixels com o app antigo (KOFnes.imagemTeste e
// KOFnes.aplicarVisual dele).
import { ehDeTv, KofVisual, tamanhoNaTela, type Valores } from '@kof/engine';
import { usarJogo } from '../stores/jogo';
import { usarTelas } from '../stores/telas';
import { toque } from '../stores/toque';
import { renderAtual, usarVisual } from '../stores/visual';

export function ligarGanchosDeTeste() {
  const t = (globalThis as { __kofTeste?: Record<string, unknown> }).__kofTeste;
  if (!t) return;
  t.somTocado = () => (usarJogo.getState().jogo as { amostrasTocadas?: number } | null)?.amostrasTocadas ?? -1;
  t.toque = toque; // o que os dedos seguram no controle de toque (e2e do celular)
  t.visual = {
    /** a imagem (RGBA, l × a) no lugar do jogo, no tamanho que a janela der (múltiplo inteiro, 4:3) */
    imagemTeste: (rgba: number[], l: number, a: number) => {
      document.body.classList.remove('vazio');
      usarTelas.setState({ atual: 'jogo' });
      const r = renderAtual();
      if (!r) return null;
      const px = new Uint32Array(Uint8Array.from(rgba).buffer);
      r.desenhar(px, l, a);
      r.desenhar(px, l, a);
      const palco = document.getElementById('palco');
      const { w, h } = tamanhoNaTela({
        W: (palco?.clientWidth ?? 800) - 16,
        H: (palco?.clientHeight ?? 600) - 16,
        telaL: l,
        telaA: a,
        razaoDoAparelho: ehDeTv('snes') ? 4 / 3 : l / a,
        proporcao: usarJogo.getState().proporcao,
        escala: usarJogo.getState().escala,
        cheia: false,
      });
      r.tamanho(w, h);
      return [r.canvas.width, r.canvas.height];
    },
    aplicarVisual: (v: Valores, pre: string) => usarVisual.getState().aplicar(v, pre),
    aplicarPre: (pre: string) => usarVisual.getState().aplicar(KofVisual.valores(pre), pre),
    ids: () => KofVisual.PREDEF.map(([k]) => k),
    lerTela: () => {
      const px = renderAtual()?.lerTela();
      return px ? Array.from(px) : null;
    },
  };
}
