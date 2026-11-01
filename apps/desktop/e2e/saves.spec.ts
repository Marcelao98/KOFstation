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

test('F5 salva estado com print, F6 mostra, clicar carrega, F8 carrega o último, 🗑 apaga', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await page.waitForTimeout(500);
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('estado salvo');
  await page.keyboard.press('F5');
  await expect.poll(async () => (await loja(page, 'estados')).length).toBe(2);
  const [e] = await loja(page, 'estados');
  expect(e?.k).toMatch(/^KOFSAVE\|32768\/\d+$/);
  expect(String(e?.meta.capa)).toMatch(/^data:image\/(webp|png)/);
  await page.keyboard.press('F6');
  await expect(page.locator('#estados')).toBeVisible();
  await expect(page.locator('#grade-estados .cartao')).toHaveCount(2);
  await expect(page.locator('#estados-jogo')).toHaveValue('KOFSAVE|32768');
  await page.locator('#grade-estados .cartao .x').first().click();
  await expect(page.locator('#grade-estados .cartao')).toHaveCount(1);
  await page.locator('#grade-estados .cartao').first().click();
  await expect(page.locator('#aviso')).toContainText('carregado');
  await expect(page.locator('#estados')).toBeHidden();
  await page.keyboard.press('F8');
  await expect(page.locator('#aviso')).toContainText('carregado');
});
