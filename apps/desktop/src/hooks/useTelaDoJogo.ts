// Liga o canvas #tela à engine: desenha o último quadro a cada quadro do monitor e acerta o tamanho (escala inteira na
// janela, o maior possível em tela cheia), como o ajustarEscala() do antigo.
import { registrar } from '@kof/app-core';
import { ehDeTv, RenderizadorVisual, tamanhoNaTela } from '@kof/engine';
import { useEffect, useRef } from 'react';
import { usarAvisos } from '../stores/avisos';
import { ultimoQuadro, usarJogo } from '../stores/jogo';
import { usarRender } from '../stores/visual';

export function useTelaDoJogo(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const tela = useRef<RenderizadorVisual | null>(null);
  const { info, proporcao, escala, jogo } = usarJogo();

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    // um renderizador só por canvas (o WebGL não pode ser pedido duas vezes com outro tipo)
    tela.current ??= new RenderizadorVisual(c, {
      avisar: (t, ms) => usarAvisos.getState().avisar(t, ms),
      anotar: (t) => registrar('warn', 'imagem', t),
    });
    usarRender(tela.current);
    if (jogo) tela.current.ligaIni = performance.now();
    let pedido = 0;
    const laco = () => {
      pedido = requestAnimationFrame(laco);
      const t = tela.current;
      if (!t) return;
      if (ultimoQuadro.novo && ultimoQuadro.pixels) {
        ultimoQuadro.novo = false;
        t.desenhar(ultimoQuadro.pixels, ultimoQuadro.largura, ultimoQuadro.altura);
      } else if (t.animado()) t.pintar(false); // chiado/fita mexendo mesmo parado
    };
    pedido = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(pedido);
  }, [canvas, jogo]);

  useEffect(() => {
    if (!info) return;
    const ajustar = () => {
      const palco = document.getElementById('palco');
      const t = tela.current;
      if (!palco || !t) return;
      const cheia = document.body.classList.contains('cheia');
      const folga = cheia ? 0 : 16;
      const largura = ultimoQuadro.largura || info.largura;
      const altura = ultimoQuadro.altura || info.altura;
      const { w, h } = tamanhoNaTela({
        W: palco.clientWidth - folga,
        H: palco.clientHeight - folga,
        telaL: largura,
        telaA: altura,
        razaoDoAparelho: ehDeTv(info.sistema) ? 4 / 3 : info.proporcao,
        proporcao,
        escala,
        cheia,
      });
      t.tamanho(w, h);
    };
    ajustar();
    // a resolução muda no meio do jogo (Sega): confere de vez em quando
    let antes = `${ultimoQuadro.largura}x${ultimoQuadro.altura}`;
    const vigia = setInterval(() => {
      const agora = `${ultimoQuadro.largura}x${ultimoQuadro.altura}`;
      if (agora !== antes) {
        antes = agora;
        ajustar();
      }
    }, 250);
    addEventListener('resize', ajustar);
    document.addEventListener('fullscreenchange', ajustar);
    return () => {
      clearInterval(vigia);
      removeEventListener('resize', ajustar);
      document.removeEventListener('fullscreenchange', ajustar);
    };
  }, [info, proporcao, escala, jogo]);
}
