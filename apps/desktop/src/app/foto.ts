// Print do quadro atual sem filtro (o `foto` do antigo): webp quando dá (bem menor), senão png.
import { ultimoQuadro } from '../stores/jogo';

export function fotoDoQuadro(largura: number): string {
  const { pixels, largura: L, altura: A } = ultimoQuadro;
  if (!pixels || !L || !A) return '';
  const cru = document.createElement('canvas');
  cru.width = L;
  cru.height = A;
  const g0 = cru.getContext('2d');
  if (!g0) return '';
  const dados = new Uint8ClampedArray(L * A * 4);
  dados.set(new Uint8Array(pixels.buffer, pixels.byteOffset, L * A * 4));
  g0.putImageData(new ImageData(dados, L, A), 0, 0);
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = Math.round((largura * A) / L);
  const g = c.getContext('2d');
  if (!g) return '';
  g.imageSmoothingEnabled = false;
  g.drawImage(cru, 0, 0, c.width, c.height);
  const w = c.toDataURL('image/webp', 0.85);
  return w.startsWith('data:image/webp') ? w : c.toDataURL('image/png');
}
