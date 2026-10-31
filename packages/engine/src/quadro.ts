// Copia o quadro do núcleo pro tamanho que o app usa, como o runFrame() do antigo: igual = cópia; maior = SNES em alta
// resolução (512 de largura / 448-478 de altura) reduz pela metade; algumas linhas a mais (NES 240, SNES 239) = corta
// igual em cima e embaixo, centralizando.
export function encaixarQuadro(fb: Uint32Array, w: number, h: number, L: number, A: number, saida: Uint32Array): void {
  if (w === L && h === A) {
    saida.set(fb.subarray(0, L * A));
    return;
  }
  const px = w >= L * 2 ? 2 : 1;
  const py = h >= A * 2 ? 2 : 1;
  const y0 = py === 1 && h > A ? Math.floor((h - A) / 2) : 0;
  for (let y = 0; y < A; y++) {
    const lin = Math.min(h - 1, y * py + y0) * w;
    for (let x = 0; x < L; x++) saida[y * L + x] = x * px < w ? (fb[lin + x * px] ?? 0) : 0xff000000;
  }
}
