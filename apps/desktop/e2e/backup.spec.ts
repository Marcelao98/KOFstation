// M4: o backup .kofsave do app antigo entra no novo, e o do novo sai no mesmo formato.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { criarKofsave, lerKofsave, saveDoAntigo } from './kofsave';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('traz o .kofsave do antigo arrastado/aberto e faz um backup que volta igual', async ({ page }) => {
  const sram = new Uint8Array(8192).fill(0xff);
  sram.set([1, 2, 3, 4], 0);
  const pacote = criarKofsave({
    versao: 1,
    aparelho: 'antigo01',
    nome: 'PC',
    quando: Date.now(),
    saves: [saveDoAntigo('sram.SUPER TESTE.524288', sram, 1000)],
    stats: [
      { id: 'SUPER TESTE|524288', nome: 'Super Teste', tempo: 120000, sessoes: 3, dias: { '2026-10-30': 120000 } },
    ],
    config: { tema: 'mocha', volume: '10' },
    estados: [{ jogo: 'SUPER TESTE|524288', nome: 'Super Teste', quando: 42, capa: '', dados: new Uint8Array([1, 2]) }],
  });
  await page.setInputFiles('#arquivo', {
    name: 'meu backup.kofsave',
    mimeType: 'application/octet-stream',
    buffer: pacote,
  });
  await expect(page.locator('#aviso')).toContainText(
    'backup trazido: 1 save(s) novo(s), 1 jogo(s) nas estatísticas, 1 savestate(s)',
  );
  // arrastado/aberto não traz configurações (igual ao antigo); pela janela, com a caixinha, traz
  await page.click('#menu >> text=Arquivo');
  await page.click('[data-acao="exportar-saves"]');
  await expect(page.locator('#backup-tela')).toBeVisible();
  await page.check('#bk-estados');
  const baixando = page.waitForEvent('download');
  await page.click('[data-acao="bk-fazer"]');
  const d = await baixando;
  expect(d.suggestedFilename()).toMatch(/^KOFstation PC \d{4}-\d\d-\d\d\.kofsave$/);
  const p = lerKofsave(readFileSync((await d.path()) as string));
  const saves = p.saves as { chave: string; hash: string }[];
  expect(saves.map((s) => s.chave)).toEqual(['sram.SUPER TESTE.524288']);
  expect(saves[0]?.hash).toBe(saveDoAntigo('x', sram, 0).hash);
  expect((p.estados as unknown[]).length).toBe(1);
  expect((p.stats as { partes: Record<string, { tempo: number }> }[])[0]?.partes.antigo01?.tempo).toBe(120000);
  expect(p.config).not.toHaveProperty('volume');
});
