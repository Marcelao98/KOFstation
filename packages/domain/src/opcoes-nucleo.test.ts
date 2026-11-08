import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conferirOpcoes, OPCOES_DE_NUCLEO, PERFIS, valoresDoPerfil } from './opcoes-nucleo';
import type { SistemaId } from './sistemas';

const sistemas = Object.keys(OPCOES_DE_NUCLEO) as SistemaId[];

describe('catálogo de opções de emulação', () => {
  it('cobre pelo menos PS1 e PS2', () => {
    expect(sistemas).toEqual(expect.arrayContaining(['ps1', 'ps2']));
  });

  for (const s of sistemas) {
    describe(s, () => {
      const catalogo = OPCOES_DE_NUCLEO[s] ?? [];

      it('não repete chave', () => {
        const chaves = catalogo.map((o) => o.chave);
        expect(new Set(chaves).size).toBe(chaves.length);
      });

      it('o padrão e o valor de cada perfil existem nos valores da opção', () => {
        for (const o of catalogo) {
          const aceitos = o.valores.map((x) => x.valor);
          expect(new Set(aceitos).size, `${o.chave}: valor repetido`).toBe(aceitos.length);
          expect(aceitos, `${o.chave}: padrão`).toContain(o.padrao);
          for (const p of PERFIS) expect(aceitos, `${o.chave}: perfil ${p}`).toContain(o.perfis[p]);
        }
      });

      it('tem nome e dica em português preenchidos', () => {
        for (const o of catalogo) {
          expect(o.nome.trim(), o.chave).not.toBe('');
          expect(o.dica.trim().length, `${o.chave}: dica`).toBeGreaterThan(20);
          for (const x of o.valores) expect(x.nome.trim(), `${o.chave}/${x.valor}`).not.toBe('');
        }
      });

      it('os perfis passam na própria conferência', () => {
        for (const p of PERFIS) expect(conferirOpcoes(s, valoresDoPerfil(s, p))).toEqual({ ok: true, erros: [] });
      });
    });
  }

  it('o Equilibrado do PS2 bate com o que o app usa hoje (Mild Underclock) e deixa o resto no padrão do núcleo', () => {
    const eq = valoresDoPerfil('ps2', 'equilibrado');
    expect(eq.pcsx2_ee_cycle_skip).toBe('Mild Underclock');
    for (const o of OPCOES_DE_NUCLEO.ps2 ?? []) {
      if (o.chave !== 'pcsx2_ee_cycle_skip') expect(eq[o.chave], o.chave).toBe(o.padrao);
    }
  });

  it('o Equilibrado do PS1 bate com o que o app usa hoje (frameskip automático, intervalo 3, recompilador)', () => {
    const eq = valoresDoPerfil('ps1', 'equilibrado');
    expect(eq.pcsx_rearmed_frameskip_type).toBe('auto');
    expect(eq.pcsx_rearmed_frameskip_interval).toBe('3');
    expect(eq.pcsx_rearmed_drc).toBe('enabled');
  });

  it('as opções fixas do app (BIOS e renderizador do PS2) não entram no catálogo', () => {
    const chaves = (OPCOES_DE_NUCLEO.ps2 ?? []).map((o) => o.chave);
    expect(chaves).not.toContain('pcsx2_bios');
    expect(chaves).not.toContain('pcsx2_renderer');
  });

  it('o Rápido e o Fiel mudam alguma coisa em relação ao Equilibrado', () => {
    for (const s of sistemas) {
      const eq = valoresDoPerfil(s, 'equilibrado');
      for (const p of ['rapido', 'fiel'] as const) {
        const outro = valoresDoPerfil(s, p);
        expect(
          Object.keys(outro).some((k) => outro[k] !== eq[k]),
          `${s}/${p}`,
        ).toBe(true);
      }
    }
  });

  describe('conferirOpcoes', () => {
    it('recusa chave desconhecida, em português', () => {
      const r = conferirOpcoes('ps2', { pcsx2_nao_existe: 'x' });
      expect(r.ok).toBe(false);
      expect(r.erros[0]).toMatch(/não existe no catálogo/);
    });

    it('recusa valor desconhecido, listando os aceitos', () => {
      const r = conferirOpcoes('ps2', { pcsx2_ee_cycle_skip: 'Mild' });
      expect(r.ok).toBe(false);
      expect(r.erros[0]).toMatch(/não é aceito/);
      expect(r.erros[0]).toContain('Mild Underclock');
    });

    it('recusa sistema sem catálogo', () => {
      const r = conferirOpcoes('snes', { a: 'b' });
      expect(r.ok).toBe(false);
      expect(r.erros[0]).toMatch(/ainda não tem opções/);
    });

    it('aceita um conjunto válido e vazio', () => {
      expect(conferirOpcoes('ps2', { pcsx2_ee_cycle_skip: 'Mild Underclock' }).ok).toBe(true);
      expect(conferirOpcoes('ps1', {})).toEqual({ ok: true, erros: [] });
    });
  });

  describe('fixture pro teste Rust', () => {
    const caminho = new URL('../../contracts/fixtures/opcoes-nucleo.json', import.meta.url);
    // o que o Rust precisa pra conferir contra o núcleo de verdade: chave, padrão, valores e se vale na hora
    const esperado =
      JSON.stringify(
        Object.fromEntries(
          sistemas.map((s) => [
            s,
            (OPCOES_DE_NUCLEO[s] ?? []).map((o) => ({
              chave: o.chave,
              padrao: o.padrao,
              naHora: o.naHora,
              valores: o.valores.map((x) => x.valor),
              perfis: o.perfis,
            })),
          ]),
        ),
        null,
        2,
      ) + '\n';

    it('packages/contracts/fixtures/opcoes-nucleo.json está em dia (KOF_ATUALIZAR_FIXTURES=1 reescreve)', () => {
      if (process.env.KOF_ATUALIZAR_FIXTURES) writeFileSync(caminho, esperado);
      expect(readFileSync(caminho, 'utf8'), 'rode: KOF_ATUALIZAR_FIXTURES=1 pnpm --filter @kof/domain test').toBe(
        esperado,
      );
    });
  });
});
