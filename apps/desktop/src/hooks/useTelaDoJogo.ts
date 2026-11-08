// Liga o canvas #tela à engine: desenha o último quadro a cada quadro do monitor e acerta o tamanho (escala inteira na
// janela, o maior possível em tela cheia), como o ajustarEscala() do antigo.
import { registrar } from '@kof/app-core';
import { bordasDe, ehDeTv, RenderizadorVisual, svgMoldura, tamanhoNaTela } from '@kof/engine';
import { usarMoldura } from '../stores/moldura';
import { useEffect, useRef } from 'react';
import { usarAvisos } from '../stores/avisos';
import { medidorDoJogo, ultimoQuadro, usarJogo } from '../stores/jogo';
import { usarRender } from '../stores/visual';

export function useTelaDoJogo(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const tela = useRef<RenderizadorVisual | null>(null);
  const { info, proporcao, escala, jogo } = usarJogo();
  const { moldura, anim, propria } = usarMoldura();

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
        const t0 = performance.now();
        t.desenhar(ultimoQuadro.pixels, ultimoQuadro.largura, ultimoQuadro.altura);
        medidorDoJogo()?.desenhou(performance.now() - t0);
      } else if (t.animado()) t.pintar(false); // chiado/fita mexendo mesmo parado
    };
    pedido = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(pedido);
  }, [canvas, jogo]);

  useEffect(() => {
    const ajustar = () => {
      const palco = document.getElementById('palco');
      const t = tela.current;
      if (!palco || !t) return;
      const cheia = document.body.classList.contains('cheia');
      const folga = cheia ? 0 : 16;
      const largura = ultimoQuadro.largura || info?.largura || t.telaL;
      const altura = ultimoQuadro.altura || info?.altura || t.telaA;
      const naTv = !info || ehDeTv(info.sistema);
      const razao = naTv ? 4 / 3 : info.proporcao;
      const r = proporcao === '87' ? largura / altura : razao;
      const comMoldura = moldura !== 'nenhuma' && (moldura !== 'propria' || !!propria);
      const bordas = comMoldura ? bordasDe(moldura, r, propria) : undefined;
      const medidas = {
        W: palco.clientWidth - folga,
        H: palco.clientHeight - folga,
        telaL: largura,
        telaA: altura,
        razaoDoAparelho: razao,
        proporcao,
        escala,
        cheia,
      };
      const { w, h } = tamanhoNaTela(bordas ? { ...medidas, bordas } : medidas);
      // a moldura: borda em volta (padding do #moldura) com o desenho dela de fundo (o ajustarEscala do antigo)
      const m = document.getElementById('moldura');
      document.body.dataset.moldura = comMoldura ? moldura : 'nenhuma';
      if (m) {
        const [bc, bd, bb, be] = bordas ?? [0, 0, 0, 0];
        m.style.padding = [bc, bd, bb, be].map((f) => Math.round(f * h) + 'px').join(' ');
        m.style.setProperty('--h', h + 'px');
        const cs = getComputedStyle(document.documentElement);
        const cor = (n: string, p: string) => cs.getPropertyValue(n).trim() || p;
        const sv =
          comMoldura && moldura !== 'propria'
            ? svgMoldura(moldura, w, h, anim, {
                fundo: cor('--fundo', '#222'),
                painel: cor('--painel', '#333'),
                destaque: cor('--destaque', '#e2b85c'),
                texto: cor('--texto', '#eee'),
                borda: cor('--borda', '#555'),
              })
            : null;
        m.style.backgroundImage = sv ? sv.url : moldura === 'propria' && propria ? `url("${propria.url}")` : '';
        m.style.backgroundSize = '100% 100%';
        t.canvas.style.borderRadius = sv ? Math.round(sv.raio * h) + 'px' : '';
      }
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
  }, [info, proporcao, escala, jogo, moldura, anim, propria]);
}
