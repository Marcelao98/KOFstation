// A imagem de teste do painel quando não tem jogo aberto (cartelaTeste do antigo): céu, morros, sol, barras de cor,
// xadrez fino, degradê, estrela, losango, as letras KOF e a xícara de café, em 256×224.
export function cartelaTeste(): Uint32Array {
  const px = new Uint32Array(256 * 224);
  const cor = (r: number, g: number, b: number) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  for (let y = 0; y < 224; y++)
    for (let x = 0; x < 256; x++) {
      let c = y < 140 ? cor(40 + y, 90 + y, 200) : cor(60, 150 - (y - 140), 60);
      if (y >= 100 && y < 140 && Math.sin(x / 18) * 12 + 118 < y) c = cor(50, 130, 70);
      const dx = x - 200;
      const dy = y - 40;
      if (dx * dx + dy * dy < 280) c = cor(255, 220, 90);
      if (y >= 150 && y < 190 && x >= 16 && x < 240) {
        const b = Math.floor((x - 16) / 28);
        c =
          [
            cor(255, 255, 255),
            cor(255, 255, 0),
            cor(0, 255, 255),
            cor(0, 255, 0),
            cor(255, 0, 255),
            cor(255, 0, 0),
            cor(0, 0, 255),
            cor(20, 20, 20),
          ][b] ?? c;
      }
      if (y >= 196 && y < 210 && x >= 16 && x < 240) c = ((x >> 1) + (y >> 1)) & 1 ? cor(255, 255, 255) : cor(0, 0, 0);
      if (y >= 212 && y < 220 && x >= 16 && x < 240) {
        const v = Math.round(((x - 16) / 224) * 255);
        c = cor(v, v, v);
      }
      px[y * 256 + x] = c;
    }
  for (let y = 0; y < 60; y++)
    for (let x = 0; x < 60; x++) {
      const dx = Math.abs(x - 30);
      const dy = Math.abs(y - 30);
      const ang = Math.atan2(y - 30, x - 30);
      const r = Math.hypot(x - 30, y - 30);
      if (r < 12 + 12 * Math.abs(Math.cos(ang * 2.5)))
        px[(30 + y) * 256 + 110 + x] = r < 8 ? cor(255, 140, 0) : cor(255, 210, 40);
      if (dx + dy < 18) px[(80 + y) * 256 + 150 + x] = dx + dy < 12 ? cor(230, 40, 120) : cor(120, 20, 160);
    }
  const LETRAS = [
    '1...1.01110.11111',
    '1..1..10001.1....',
    '1.1...10001.1....',
    '11....10001.1111.',
    '1.1...10001.1....',
    '1..1..10001.1....',
    '1...1.01110.1....',
  ];
  LETRAS.forEach((l, j) =>
    [...l].forEach((ch, i) => {
      if (ch === '1')
        for (let a = 0; a < 2; a++)
          for (let b2 = 0; b2 < 2; b2++) px[(52 + j * 2 + a) * 256 + 178 + i * 2 + b2] = cor(255, 255, 255);
    }),
  );
  const X = [
    '....s..s..s.....',
    '.....s..s..s....',
    '................',
    '.bbbbbbbbbbbb...',
    '.bwwwwwwwwwwbbb.',
    '.bwccccccccwb.b.',
    '.bwccccccccwb.b.',
    '.bwwwwwwwwwwbbb.',
    '.bwwwwwwwwwwb...',
    '..bwwwwwwwwb....',
    '...bbbbbbbb.....',
    'pppppppppppppp..',
  ];
  const P: Record<string, number> = {
    s: cor(230, 230, 230),
    b: cor(40, 20, 10),
    w: cor(250, 245, 235),
    c: cor(120, 60, 20),
    p: cor(200, 180, 160),
  };
  X.forEach((l, j) =>
    [...l].forEach((ch, i) => {
      const c = P[ch];
      if (c !== undefined)
        for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) px[(70 + j * 3 + a) * 256 + 40 + i * 3 + b2] = c;
    }),
  );
  return px;
}
