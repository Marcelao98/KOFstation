import { describe, expect, it } from 'vitest';
import { arquivosDoCue, baseCd, cdPs1, cueDasFaixas, isoDePs2, numFaixa, principal } from './cd';
import { fatosDe, pastaDoArquivo, sistemaDoArquivo, sistemaDoNome } from './deteccao';
import { setNeoGeo, setNeoGeoPorCrcs } from './neogeo';

const MB = 1 << 20;
const leitorDe = (u8: Uint8Array) => async (o: number, n: number) => u8.slice(o, o + n);

function iso(boot: string) {
  const u = new Uint8Array(40 * 2048);
  const pvd = 16 * 2048;
  u.set([1, ...[...'CD001'].map((c) => c.charCodeAt(0))], pvd);
  const v = new DataView(u.buffer);
  v.setUint32(pvd + 158, 20, true); // pasta raiz no setor 20
  v.setUint32(pvd + 166, 2048, true);
  const r = 20 * 2048;
  const nome = 'SYSTEM.CNF;1';
  u[r] = 33 + nome.length;
  v.setUint32(r + 2, 30, true); // arquivo no setor 30
  v.setUint32(r + 10, boot.length, true);
  u[r + 32] = nome.length;
  u.set(
    [...nome].map((c) => c.charCodeAt(0)),
    r + 33,
  );
  u.set(
    [...boot].map((c) => c.charCodeAt(0)),
    30 * 2048,
  );
  return u;
}

describe('detecção de sistema (pastaDoArquivo do antigo)', () => {
  it('pela extensão, com .gbc na pasta própria', () => {
    expect(pastaDoArquivo({ nome: 'Zelda.sfc', tamanho: 1 })).toBe('snes');
    expect(pastaDoArquivo({ nome: 'Tetris.gbc', tamanho: 1 })).toBe('gbc');
    expect(pastaDoArquivo({ nome: 'Sonic.md', tamanho: 1 })).toBe('megadrive');
    expect(pastaDoArquivo({ nome: 'leia-me.txt', tamanho: 1 })).toBe(null);
  });
  it('.bin: Mega Drive pequeno, PS1 grande ou pelo setor de CD', () => {
    expect(sistemaDoArquivo({ nome: 'a.bin', tamanho: 2 * MB })).toBe('md');
    expect(sistemaDoArquivo({ nome: 'a.bin', tamanho: 400 * MB })).toBe('ps1');
    expect(sistemaDoArquivo({ nome: 'a.bin', tamanho: 2 * MB, cd: 'ps1' })).toBe('ps1');
  });
  it('PS2 por .elf/.chd grande/ISO com BOOT2', async () => {
    expect(sistemaDoArquivo({ nome: 'x.elf', tamanho: 1 })).toBe('ps2');
    expect(sistemaDoArquivo({ nome: 'x.chd', tamanho: 1e9 })).toBe('ps2');
    expect(sistemaDoArquivo({ nome: 'x.chd', tamanho: 5e8 })).toBe('ps1');
    const dvd = iso('BOOT2 = cdrom0:\\SLUS_200.62;1');
    const cd = iso('BOOT = cdrom:\\SCUS_944.26;1');
    expect(await isoDePs2(leitorDe(dvd))).toBe(true);
    expect(await isoDePs2(leitorDe(cd))).toBe(false);
    expect(pastaDoArquivo(await fatosDe('Jogo.iso', dvd.length, leitorDe(dvd)))).toBe('ps2');
    expect(pastaDoArquivo(await fatosDe('Jogo.iso', cd.length, leitorDe(cd)))).toBe('psx');
  });
  it('zip: Neo Geo pelo nome ou pelos CRCs, CD dentro, ROM de dentro', () => {
    expect(sistemaDoNome('mslug.zip')).toBe('neogeo');
    expect(setNeoGeo('C:\\jogos\\KOF98.zip')).toBe('kof98');
    expect(sistemaDoArquivo({ nome: 'x.zip', tamanho: 9, zip: [{ nome: 'a.cue', tamanho: 1, crc: '0' }] })).toBe('ps1');
    expect(sistemaDoArquivo({ nome: 'x.zip', tamanho: 9, zip: [{ nome: 'Mario.nes', tamanho: 1, crc: '0' }] })).toBe(
      'nes',
    );
    expect(sistemaDoArquivo({ nome: 'x.zip', tamanho: 9, zip: [{ nome: 'leia.txt', tamanho: 1, crc: '0' }] })).toBe(
      null,
    );
  });
  it('Neo Geo com outro nome: o set com todos os chips de programa', () => {
    const set = setNeoGeoPorCrcs(new Set(['eb0ffaed']));
    expect(set).toBe('robocopng');
    expect(setNeoGeoPorCrcs(new Set(['00000000']))).toBe(null);
  });
});

describe('CD (cue, faixas)', () => {
  it('reconhece setor cru e ISO', () => {
    const cru = new Uint8Array(0x9001);
    cru.fill(0xff, 1, 11);
    expect(cdPs1(cru)).toBe(true);
    expect(cdPs1(new Uint8Array(0x9001))).toBe(false);
  });
  it('faixas, principal e .cue montado igual ao antigo', () => {
    expect(baseCd('Jogo (Track 2).bin')).toBe('Jogo');
    expect(numFaixa('Jogo (Track 12).bin')).toBe(12);
    expect(principal([{ name: 'J (Track 2).bin' }, { name: 'J (Track 1).bin' }])?.name).toBe('J (Track 1).bin');
    expect(arquivosDoCue('FILE "pasta/Jogo (Track 1).bin" BINARY\nFILE "J2.bin" BINARY')).toEqual([
      'Jogo (Track 1).bin',
      'J2.bin',
    ]);
    const dados = new Uint8Array(16);
    dados.set([0, 0xff]);
    dados[15] = 2;
    const cue = new TextDecoder().decode(
      cueDasFaixas([
        { nome: 'J (Track 2).bin', bytes: new Uint8Array(4) },
        { nome: 'J (Track 1).bin', bytes: dados },
      ]),
    );
    expect(cue).toBe(
      'FILE "J (Track 1).bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n' +
        'FILE "J (Track 2).bin" BINARY\n  TRACK 02 AUDIO\n    INDEX 00 00:00:00\n    INDEX 01 00:02:00\n',
    );
  });
});
