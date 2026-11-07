// O CD de PS1 que vai pro núcleo nativo não passa inteiro pela página: só a cabeça (o .cue ou 64 KB da imagem).
import { describe, expect, it } from 'vitest';
import type { Backend } from './backend';
import { dadosDaEntrada, hex8, listarZip } from '@kof/domain';
import { lerArquivoDeJogo, tamanhoDoJogo } from './arquivo';
import { identidade, cabecaDoCd } from './jogos';

/** Backend falso: guarda quanto cada file.read pediu. */
function backend(arquivos: Record<string, Uint8Array>) {
  const pedidos: { path: string; length?: number }[] = [];
  const b: Backend = {
    chamar: () => Promise.reject(new Error('não usado')),
    enviarBinario: () => Promise.reject(new Error('não usado')),
    lerBinario: (_cmd, a) => {
      const path = String(a?.path);
      const length = a?.length as number | undefined;
      pedidos.push({ path, ...(length !== undefined ? { length } : {}) });
      const d = arquivos[path] ?? new Uint8Array(0);
      return Promise.resolve(d.subarray(Number(a?.offset ?? 0), length === undefined ? undefined : length));
    },
  };
  return { b, pedidos };
}

/** Começo de um CD cru (setor 00 FF×10 00, modo 2). */
function setorCru(n: number): Uint8Array {
  const u = new Uint8Array(n);
  u.set([0, ...Array(10).fill(0xff), 0], 0);
  u[15] = 2;
  return u;
}

describe('cabeça do CD de PS1', () => {
  it('.chd/.iso grande: pede só 64 KB, guarda o tamanho de verdade (a chave do save não muda)', async () => {
    const { b, pedidos } = backend({ 'Games/psx/Jogo.iso': setorCru(0x20000) });
    const j = await cabecaDoCd(b, 'Games/psx/Jogo.iso', 700 << 20);
    expect(j?.sistema).toBe('ps1');
    expect(j?.parcial).toBe(true);
    expect(j?.tamanho).toBe(700 << 20);
    expect(pedidos).toEqual([{ path: 'Games/psx/Jogo.iso', length: 64 << 10 }]);
    // mesma identidade que lendo inteiro: nome + tamanho
    expect(identidade('ps1', j?.rom ?? new Uint8Array(0), 'Jogo', j?.tamanho).id).toBe(
      identidade('ps1', new Uint8Array(700 << 20), 'Jogo').id,
    );
  });

  it('.cue: lê o .cue inteiro (pequeno) e não toca nos .bin', async () => {
    const cue = new TextEncoder().encode('FILE "Jogo.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n');
    const { b, pedidos } = backend({ 'Games/psx/Jogo.cue': cue });
    const j = await cabecaDoCd(b, 'Games/psx/Jogo.cue', cue.length);
    expect(j?.sistema).toBe('ps1');
    expect(j?.parcial).toBeUndefined();
    expect(pedidos.map((p) => p.path)).toEqual(['Games/psx/Jogo.cue']);
  });

  it('.bin de Mega Drive não é CD: volta null (lê do jeito normal)', async () => {
    const { b } = backend({ 'Games/megadrive/Sonic.bin': new Uint8Array(0x10000) });
    expect(await cabecaDoCd(b, 'Games/megadrive/Sonic.bin', 0x10000)).toBeNull();
  });

  it('.zip com CD: o Rust lista e lê só o .cue / a cabeça; o jogo é o mesmo que lendo o zip inteiro', async () => {
    const cue = new TextEncoder().encode(
      'FILE "Jogo (Disc 1).bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n',
    );
    const casos: [string, [string, Uint8Array][]][] = [
      [
        'com .cue',
        [
          ['Jogo (Disc 1).bin', setorCru(20 << 20)],
          ['Jogo (Disc 1).cue', cue],
        ],
      ],
      ['imagem única', [['Jogo.iso', setorCru(20 << 20)]]],
      [
        'só as faixas',
        [
          ['Jogo (Track 1).bin', setorCru(20 << 20)],
          ['Jogo (Track 2).bin', new Uint8Array(4096)],
        ],
      ],
    ];
    for (const [qual, arqs] of casos) {
      const zip = zipGuardado(arqs);
      const lidos: { entrada: string; length?: number }[] = [];
      const b: Backend = {
        chamar: <T>(cmd: string) => {
          if (cmd !== 'file.zip.list') return Promise.reject(new Error(cmd));
          const itens = listarZip(zip).map((e) => ({ nome: e.nome, tamanho: e.tamanho, crc: hex8(e.crc) }));
          return Promise.resolve({ size: zip.length, itens } as T);
        },
        enviarBinario: () => Promise.reject(new Error('não usado')),
        lerBinario: (cmd, a) => {
          if (cmd !== 'file.zip.read') return Promise.reject(new Error(`a página leu o zip com ${cmd}`));
          const length = a?.length as number | undefined;
          lidos.push({ entrada: String(a?.entrada), ...(length ? { length } : {}) });
          const e = listarZip(zip).find((x) => x.nome === a?.entrada);
          return Promise.resolve(e ? dadosDaEntrada(zip, e).subarray(0, length) : new Uint8Array(0));
        },
      };
      const j = await cabecaDoCd(b, 'Games/psx/Jogo.zip', zip.length);
      const inteiro = await lerArquivoDeJogo('Jogo.zip', zip);
      expect(j?.parcial, qual).toBe(true);
      expect([j?.nome, j?.arquivo, j?.principal, j?.sistema], qual).toEqual([
        inteiro.nome,
        inteiro.arquivo,
        inteiro.principal,
        'ps1',
      ]);
      // mesma identidade (e chave do save) que o caminho que lia o zip inteiro
      const id = (x: typeof inteiro) => identidade('ps1', x.rom, x.nome, tamanhoDoJogo(x)).id;
      expect(j && id(j), qual).toBe(id(inteiro));
      expect(j?.pesoCd, qual).toBe(arqs.reduce((a, [, d]) => a + d.length, 0));
      for (const l of lidos) expect(l.length ?? 0, `${qual}: só pedaços pequenos`).toBeLessThanOrEqual(64 << 10);
      if (qual === 'com .cue') expect(lidos).toEqual([{ entrada: 'Jogo (Disc 1).cue' }]);
    }
  });

  it('.zip sem CD dentro: volta null', async () => {
    const zip = zipGuardado([['jogo.nes', new Uint8Array(16)]]);
    const b: Backend = {
      chamar: <T>() =>
        Promise.resolve({
          size: zip.length,
          itens: listarZip(zip).map((e) => ({ nome: e.nome, tamanho: e.tamanho, crc: hex8(e.crc) })),
        } as T),
      enviarBinario: () => Promise.reject(new Error('não usado')),
      lerBinario: () => Promise.reject(new Error('não devia ler')),
    };
    expect(await cabecaDoCd(b, 'Games/nes/jogo.zip', zip.length)).toBeNull();
  });
});

/** Zip com arquivos guardados (método 0), montado à mão. */
function zipGuardado(arqs: [string, Uint8Array][]): Uint8Array {
  const partes: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let pos = 0;
  for (const [n, dados] of arqs) {
    const nome = new TextEncoder().encode(n);
    const local = new Uint8Array(30 + nome.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint32(18, dados.length, true);
    lv.setUint32(22, dados.length, true);
    lv.setUint16(26, nome.length, true);
    local.set(nome, 30);
    const c = new Uint8Array(46 + nome.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint32(20, dados.length, true);
    cv.setUint32(24, dados.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, pos, true);
    c.set(nome, 46);
    partes.push(local, dados);
    centrais.push(c);
    pos += local.length + dados.length;
  }
  const tamDir = centrais.reduce((a, c) => a + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arqs.length, true);
  fv.setUint16(10, arqs.length, true);
  fv.setUint32(12, tamDir, true);
  fv.setUint32(16, pos, true);
  const z = new Uint8Array(pos + tamDir + 22);
  let o = 0;
  for (const p of [...partes, ...centrais, fim]) {
    z.set(p, o);
    o += p.length;
  }
  return z;
}
