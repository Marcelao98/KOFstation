// ⏺ Gravar o jogo (G.1): as contas puras. O formato que o navegador sabe gravar, o nome do arquivo e o tamanho do
// vídeo (como o jogador vê: moldura + tela com filtro), sem DOM nem MediaRecorder.

export interface FormatoDeGravacao {
  /** o tipo pro MediaRecorder (com os codecs) */
  mime: string;
  /** a extensão do arquivo, sem ponto */
  ext: 'mp4' | 'webm';
}

/**
 * Em ordem de preferência: MP4 (H.264 + AAC) abre em qualquer lugar (celular, WhatsApp, editor de vídeo); o WebM é o
 * que todo navegador grava. Sem nenhum, o navegador não grava vídeo.
 */
export const FORMATOS_DE_GRAVACAO: readonly FormatoDeGravacao[] = [
  { mime: 'video/mp4;codecs=avc1.640028,mp4a.40.2', ext: 'mp4' },
  { mime: 'video/mp4;codecs=avc1,mp4a', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
];

export function formatoDeGravacao(suporta: (mime: string) => boolean): FormatoDeGravacao | null {
  return FORMATOS_DE_GRAVACAO.find((f) => suporta(f.mime)) ?? null;
}

const dois = (n: number) => String(n).padStart(2, '0');

/**
 * "Nome do jogo 2026-11-18 20-41-07.mp4": dá pra ordenar pela data e não repete. Tira o que não pode em nome de
 * arquivo no Windows e no Linux (e as barras, que viraria pasta).
 */
export function nomeDaGravacao(jogo: string, quando: Date, ext: string): string {
  const limpo =
    jogo
      // eslint-disable-next-line no-control-regex
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 80)
      .trim() || 'Gravação';
  const d = `${quando.getFullYear()}-${dois(quando.getMonth() + 1)}-${dois(quando.getDate())}`;
  const h = `${dois(quando.getHours())}-${dois(quando.getMinutes())}-${dois(quando.getSeconds())}`;
  return `${limpo} ${d} ${h}.${ext}`;
}

/** "0:07", "1:05", "1:02:09": o relógio do ⏺ enquanto grava. */
export function tempoGravando(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${dois(m)}:${dois(s % 60)}` : `${m}:${dois(s % 60)}`;
}

export interface CenaDaGravacao {
  /** o tamanho do vídeo (par, que o H.264 exige) */
  largura: number;
  altura: number;
  /** onde a tela do jogo fica dentro do vídeo (com moldura, no meio dela) */
  jogo: { x: number; y: number; w: number; h: number };
}

/**
 * O tamanho do vídeo a partir do que está na tela: a caixa toda (moldura incluída) e a tela do jogo dentro dela, em
 * pixels da página. Amplia até a altura `alvo` (o vídeo fica nítido mesmo com a janela pequena) sem passar de
 * `maximo`, e arredonda pra par.
 */
export function cenaDaGravacao(
  caixa: { w: number; h: number },
  jogo: { x: number; y: number; w: number; h: number },
  alvo = 1080,
  maximo = 1920,
): CenaDaGravacao {
  const w0 = Math.max(1, caixa.w);
  const h0 = Math.max(1, caixa.h);
  const k = Math.min(alvo / h0, maximo / w0);
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const largura = par(w0 * k);
  const altura = par(h0 * k);
  const kx = largura / w0;
  const ky = altura / h0;
  return {
    largura,
    altura,
    jogo: {
      x: Math.round(jogo.x * kx),
      y: Math.round(jogo.y * ky),
      w: Math.round(jogo.w * kx),
      h: Math.round(jogo.h * ky),
    },
  };
}

/** Bits por segundo do vídeo: ~0,1 bit por pixel a 60 quadros (8 Mb/s em 1080p), nunca menos de 2 Mb/s. */
export function bitsDoVideo(largura: number, altura: number): number {
  return Math.max(2_000_000, Math.round(largura * altura * 60 * 0.065));
}
