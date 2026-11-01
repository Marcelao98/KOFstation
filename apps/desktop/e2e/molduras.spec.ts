// M7.5: molduras (galeria, moldura em volta do jogo, uma por console) e paletas do Game Boy/NES.
import { expect, test } from '@playwright/test';
import { romGbComSave, romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('galeria: escolher a moldura põe a borda em volta do jogo; Sem moldura tira', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  const larguraSem = await page.locator('#tela').evaluate((c) => c.getBoundingClientRect().width);
  await page.click('#menu >> text=Imagem');
  await page.click('#menu [data-acao="molduras"]');
  await expect(page.locator('#molduras')).toBeVisible();
  await expect(page.locator('#grade-molduras .mold-card')).toHaveCount(17);
  await page.click('[data-mold-escolher="tv80"]');
  await expect(page.locator('body')).toHaveAttribute('data-moldura', 'tv80');
  await expect
    .poll(() => page.locator('#moldura').evaluate((m) => getComputedStyle(m).backgroundImage))
    .toContain('svg');
  await page.keyboard.press('Escape');
  await expect(page.locator('#molduras')).toBeHidden();
  const padding = await page.locator('#moldura').evaluate((m) => parseFloat(getComputedStyle(m).paddingRight));
  expect(padding).toBeGreaterThan(20);
  await page.click('#menu >> text=Imagem');
  await page.click('#menu [data-acao="moldura"]');
  await expect(page.locator('body')).toHaveAttribute('data-moldura', 'nenhuma');
  await expect.poll(() => page.locator('#tela').evaluate((c) => c.getBoundingClientRect().width)).toBe(larguraSem);
});

test('menu rápido: cores do Game Boy só no Game Boy, e a paleta muda', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await page.keyboard.press('F2');
  const item = page.locator('#rapido li', { hasText: 'Cores do Game Boy' });
  await expect(item).toContainText('Cores do Game Boy Color');
  await item.click();
  await page.keyboard.press('ArrowRight');
  await expect(item).toContainText('Verde');
  await expect(page.locator('#rapido li', { hasText: 'Cores do NES' })).toHaveCount(0);
});
