// M5: save de bateria, estados, salvar automático e modos de jogo.
import { expect, test, type Page } from '@playwright/test';
import { romGbComSave } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

type Lojas = Map<string, Map<string, [Record<string, unknown>, Uint8Array]>>;
const loja = (page: Page, nome: string) =>
  page.evaluate(
    (n) =>
      [...((globalThis as unknown as { __kofTeste: { lojas: Lojas } }).__kofTeste.lojas.get(n) ?? new Map())].map(
        ([k, [meta, b]]) => ({ k, meta, n: b.length }),
      ),
    nome,
  );

test('o save da bateria vai pra loja com a chave do antigo (rascunho primeiro, depois assentado)', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await expect
    .poll(async () => (await loja(page, 'saves')).map((s) => s.k), { timeout: 10_000 })
    .toEqual(['sram.KOFSAVE.32768']);
  const [s] = await loja(page, 'saves');
  expect(s?.meta).toMatchObject({ chave: 'sram.KOFSAVE.32768', jogo: 'KOFSAVE|32768', nome: 'Save' });
  expect(s?.meta.cheio).toBeGreaterThanOrEqual(8192);
  // o rascunho sai depois de assentar
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kofstation-rascunho.'))))
    .toEqual([]);
});
