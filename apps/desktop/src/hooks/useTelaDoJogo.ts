// Liga o canvas #tela à engine: desenha o último quadro a cada quadro do monitor e acerta o tamanho (escala inteira na
// janela, o maior possível em tela cheia), como o ajustarEscala() do antigo.
import { ehDeTv, TelaDoJogo, tamanhoNaTela } from '@kof/engine';
import { useEffect, useRef } from 'react';
import { ultimoQuadro, usarJogo } from '../stores/jogo';

export function useTelaDoJogo(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const tela = useRef<TelaDoJogo | null>(null);
  const { info, proporcao, escala, jogo } = usarJogo();

  useEffect(() => {
    const c = canvas.current;
    if (!c || !jogo) return;
    try {
      tela.current = new TelaDoJogo(c);
    } catch {
      tela.current = null; // sem WebGL2: o aviso aparece pelo jogo (M7 traz o canvas 2D de reserva)
      return;
    }
    let pedido = 0;
    const laco = () => {
      pedido = requestAnimationFrame(laco);
      if (ultimoQuadro.novo && ultimoQuadro.pixels && tela.current) {
        ultimoQuadro.novo = false;
        tela.current.desenhar(ultimoQuadro.pixels, ultimoQuadro.largura, ultimoQuadro.altura);
      }
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
