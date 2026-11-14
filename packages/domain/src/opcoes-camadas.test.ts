import { describe, expect, it } from 'vitest';
import {
  ajustarOpcao,
  ajustarPerfil,
  compararOpcoes,
  escolhasVazias,
  lerEscolhas,
  limparCamada,
  opcoesParaNucleo,
  perfilEfetivo,
  resolverOpcoes,
  textoDasEscolhas,
} from './opcoes-camadas';
import { valoresDoPerfil } from './opcoes-nucleo';

describe('camadas das opções de emulação', () => {
  it('sem nada guardado, o Equilibrado vale e bate com o perfil do catálogo', () => {
    const e = escolhasVazias();
    expect(perfilEfetivo(e, 'ps2')).toBe('equilibrado');
    expect(opcoesParaNucleo(e, 'ps2')).toEqual(valoresDoPerfil('ps2', 'equilibrado'));
    expect(opcoesParaNucleo(e, 'ps2').pcsx2_ee_cycle_skip).toBe('Mild Underclock'); // o que o app já usava
  });

  it('console vence o geral, jogo vence o console', () => {
    let e = ajustarPerfil(escolhasVazias(), 'geral', 'ps2', undefined, 'rapido');
    expect(opcoesParaNucleo(e, 'ps2').pcsx2_ee_cycle_skip).toBe('Moderate Underclock');
    e = ajustarOpcao(e, 'console', 'ps2', undefined, 'pcsx2_ee_cycle_skip', 'disabled');
    expect(opcoesParaNucleo(e, 'ps2', 'sotc').pcsx2_ee_cycle_skip).toBe('disabled');
    e = ajustarOpcao(e, 'jogo', 'ps2', 'sotc', 'pcsx2_ee_cycle_skip', 'Maximum Underclock');
    expect(opcoesParaNucleo(e, 'ps2', 'sotc').pcsx2_ee_cycle_skip).toBe('Maximum Underclock');
    expect(opcoesParaNucleo(e, 'ps2', 'outro').pcsx2_ee_cycle_skip).toBe('disabled');
    const o = resolverOpcoes(e, 'ps2', 'sotc').find((x) => x.def.chave === 'pcsx2_ee_cycle_skip');
    expect(o?.origem).toBe('jogo');
  });

  it('perfil do jogo troca o perfil só nele; valor null volta a herdar', () => {
    let e = ajustarPerfil(escolhasVazias(), 'jogo', 'ps2', 'sotc', 'fiel');
    expect(perfilEfetivo(e, 'ps2', 'sotc')).toBe('fiel');
    expect(perfilEfetivo(e, 'ps2', 'zoe2')).toBe('equilibrado');
    e = ajustarPerfil(e, 'jogo', 'ps2', 'sotc', null);
    expect(e.jogos).toEqual({});
    e = ajustarOpcao(e, 'console', 'ps1', undefined, 'pcsx_rearmed_drc', 'disabled');
    expect(Object.keys(e.consoles)).toEqual(['ps1']);
    e = ajustarOpcao(e, 'console', 'ps1', undefined, 'pcsx_rearmed_drc', null);
    expect(e.consoles).toEqual({});
  });

  it('limparCamada apaga perfil e ajustes', () => {
    let e = ajustarPerfil(escolhasVazias(), 'console', 'ps2', undefined, 'fiel');
    e = ajustarOpcao(e, 'console', 'ps2', undefined, 'pcsx2_mtvu', 'enabled');
    expect(limparCamada(e, 'console', 'ps2', undefined).consoles).toEqual({});
  });

  it('ida e volta pelo texto; texto estragado, chave e valor desconhecidos são descartados', () => {
    let e = ajustarPerfil(escolhasVazias(), 'geral', 'ps2', undefined, 'fiel');
    e = ajustarOpcao(e, 'jogo', 'ps2', 'sotc', 'pcsx2_mtvu', 'enabled');
    expect(lerEscolhas(textoDasEscolhas(e))).toEqual(e);
    expect(lerEscolhas('{não é json')).toEqual(escolhasVazias());
    expect(lerEscolhas(null)).toEqual(escolhasVazias());
    const sujo = JSON.stringify({
      geral: 'turbo',
      consoles: {
        ps2: { perfil: 'fiel', opcoes: { pcsx2_mtvu: 'talvez', inventada: 'x', pcsx2_fastcdvd: 'enabled' } },
      },
    });
    const l = lerEscolhas(sujo);
    expect(l.geral).toBe('equilibrado');
    expect(l.consoles.ps2).toEqual({ perfil: 'fiel', opcoes: { pcsx2_fastcdvd: 'enabled' } });
  });

  it('compararOpcoes separa o que vale na hora do que pede reabrir', () => {
    const antes = valoresDoPerfil('ps2', 'equilibrado');
    const depois = valoresDoPerfil('ps2', 'rapido');
    const d = compararOpcoes('ps2', antes, depois);
    expect(d.naHora.pcsx2_ee_cycle_skip).toBe('Moderate Underclock');
    expect(d.aoReabrir).toContain('VU1 em outro núcleo do processador (MTVU)');
    expect(compararOpcoes('ps2', antes, antes)).toEqual({ naHora: {}, aoReabrir: [] });
  });

  it('sistema sem catálogo: nada', () => {
    expect(opcoesParaNucleo(escolhasVazias(), 'neogeo')).toEqual({});
  });
});
