// Caso de uso: observar o controle fora do jogo (menus e telas). Chama `quandoMudar(bits, novos)` a cada leitura em
// que algo está apertado ou acabou de soltar; `novos` = o que foi apertado agora (como o padAntes do antigo).
export interface FonteDeControle {
  ler(): number;
}

export function observarControle(
  fonte: FonteDeControle,
  quandoMudar: (bits: number, novos: number) => void,
  agendar: (f: () => void, ms: number) => () => void = (f, ms) => {
    const t = setInterval(f, ms);
    return () => clearInterval(t);
  },
  intervaloMs = 16,
): () => void {
  let antes = 0;
  return agendar(() => {
    const b = fonte.ler();
    const novos = b & ~antes;
    if (b || antes) quandoMudar(b, novos);
    antes = b;
  }, intervaloMs);
}
