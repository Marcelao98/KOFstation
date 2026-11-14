// T.1: a tabela de sistemas do app novo (domain SISTEMAS + engine NUCLEOS + BIOS) confere com o SISTEMAS do
// `web/nucleo.js` do antigo, campo a campo. Com KOF_ANTIGO=<pasta do kofstation-old>. Diferenças de propósito (PS2 usa
// o PCSX2 nativo em vez do Play!) estão em DIFERENTES, com o motivo.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { BIOS, SISTEMAS, ANALOGICO } from '@kof/domain';
import { describe, expect, it } from 'vitest';
import { NUCLEOS } from '../src/nucleos';

interface Velho {
  nome: string;
  curto: string;
  ext: string[];
  nucleo: string;
  largura: number;
  altura: number;
  dinamico?: boolean;
  tv43?: boolean;
  proporcao?: number;
  semRebob?: boolean;
  grande?: boolean;
  caminho?: boolean;
  dispositivo?: number;
  analogico?: string;
  opcoes?: Record<string, string>;
  bios?: (string | { arquivo: string })[];
}

const antigo = process.env.KOF_ANTIGO;

function carregar(): Record<string, Velho> {
  const ctx = vm.createContext({ console, setTimeout, document: undefined, window: undefined });
  vm.runInContext(readFileSync(join(antigo ?? '', 'web/nucleo.js'), 'utf8') + ';this.KofLibretro=KofLibretro', ctx);
  return (vm.runInContext('KofLibretro', ctx) as { SISTEMAS: Record<string, Velho> }).SISTEMAS;
}

/** Diferenças de propósito: sistema → campo → motivo. */
const DIFERENTES: Record<string, Record<string, string>> = {
  ps2: {
    nucleo: 'o novo roda o PCSX2 (LRPS2) nativo; o antigo, o Play! em WebAssembly',
    opcoes: 'só existem no núcleo nativo novo',
    dinamico: 'o LRPS2 muda de resolução no meio do jogo; o Play! desenhava num canvas próprio',
    caminho: 'o núcleo nativo lê o DVD direto do disco (o Play! lia pedaços do arquivo escolhido)',
  },
};

describe.skipIf(!antigo)('sistemas: o novo confere com o SISTEMAS do nucleo.js do antigo', () => {
  const velhos = antigo ? carregar() : {};

  it('os mesmos sistemas, com os mesmos nomes e extensões', () => {
    expect(SISTEMAS.map((s) => s.id).sort()).toEqual(Object.keys(velhos).sort());
    for (const s of SISTEMAS) {
      const v = velhos[s.id];
      expect(s.nome, s.id).toBe(v?.nome);
      expect(s.curto, s.id).toBe(v?.curto);
      expect([...s.ext], s.id).toEqual(v?.ext);
    }
  });

  it('núcleo, tamanho da imagem, proporção e opções fixas', () => {
    for (const [id, v] of Object.entries(velhos)) {
      const n = NUCLEOS[id as keyof typeof NUCLEOS];
      expect(n, `${id} sem núcleo no novo`).toBeDefined();
      if (!n) continue;
      const dif = DIFERENTES[id] ?? {};
      if (!dif.nucleo) expect(n.nucleo, `${id}: núcleo`).toBe(v.nucleo);
      expect(n.largura, `${id}: largura`).toBe(v.largura);
      expect(n.altura, `${id}: altura`).toBe(v.altura);
      if (!dif.dinamico) expect(!!n.dinamico, `${id}: dinâmico`).toBe(!!v.dinamico);
      // o antigo trata o SNES como TV de qualquer jeito (naTv); o novo faz o mesmo em ehDeTv
      if (id !== 'snes') expect(!!n.tv43, `${id}: tv43`).toBe(!!v.tv43);
      expect(n.proporcao, `${id}: proporção`).toBe(v.proporcao);
      if (!dif.semRebob) expect(!!n.semRebob, `${id}: sem rebobinar`).toBe(!!(v.semRebob || v.grande));
      if (!dif.caminho) expect(!!n.caminho, `${id}: por caminho`).toBe(!!v.caminho);
      expect(n.dispositivo, `${id}: dispositivo`).toBe(v.dispositivo);
      if (!dif.opcoes)
        for (const [k, x] of Object.entries(v.opcoes ?? {})) expect(n.opcoes?.[k], `${id}: ${k}`).toBe(x);
    }
  });

  it('analógico (misto / puro) e arquivos de BIOS', () => {
    for (const [id, v] of Object.entries(velhos)) {
      expect(ANALOGICO[id], `${id}: analógico`).toBe(v.analogico);
      const velhas = (v.bios ?? []).map((b) => (typeof b === 'string' ? b : b.arquivo)).sort();
      const novas = (BIOS[id as keyof typeof BIOS] ?? []).map((b) => b.arquivo).sort();
      expect(novas, `${id}: BIOS`).toEqual(velhas);
    }
  });
});
