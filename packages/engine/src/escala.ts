// Tamanho da imagem do jogo na tela, como o ajustarEscala() do antigo (sem moldura; molduras chegam no M7):
// proporção '43' = 4:3 nos consoles de TV ou a do aparelho nos portáteis; '87' = pixel perfeito; 'esticar' = ocupa tudo.
// Na janela a altura é um múltiplo inteiro da altura do jogo (escala 0 = o maior que couber); em tela cheia, o maior
// tamanho possível.
export type Proporcao = '43' | '87' | 'esticar';

export interface Medidas {
  /** área livre do palco, já sem as folgas */
  W: number;
  H: number;
  telaL: number;
  telaA: number;
  /** 4:3 se for de TV; senão a do aparelho (ex.: 10/9) */
  razaoDoAparelho: number;
  proporcao: Proporcao;
  escala: number;
  cheia: boolean;
}

export function tamanhoNaTela(m: Medidas): { w: number; h: number } {
  const W = Math.max(m.telaL, m.W);
  const H = Math.max(m.telaA, m.H);
  if (m.proporcao === 'esticar') return { w: Math.floor(W), h: Math.floor(H) };
  const r = m.proporcao === '43' ? m.razaoDoAparelho : m.telaL / m.telaA;
  const hMax = Math.min(H, W / r);
  let h: number;
  if (m.cheia) h = hMax;
  else {
    const maxE = Math.max(1, Math.floor(hMax / m.telaA));
    h = m.telaA * (m.escala ? Math.min(m.escala, maxE) : maxE);
  }
  return { w: Math.floor(h * r), h: Math.floor(h) };
}
