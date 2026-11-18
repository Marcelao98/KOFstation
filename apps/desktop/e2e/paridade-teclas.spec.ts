// T.1: atalhos que faltavam provar (Tab = turbo, F11 = tela cheia) e a proporção da tela, como no antigo.
import { expect, test } from '@playwright/test';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await page.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Teste Vermelho');
});
test.afterEach(() => expect(erros).toEqual([]));

const fps = async (page: import('@playwright/test').Page) =>
  Number(/(\d+) fps/.exec((await page.locator('#desempenho').textContent()) ?? '')?.[1] ?? 0);

test('Tab segurado = turbo (vários quadros por passo); soltou, volta ao ritmo normal', async ({ page }) => {
  await page.keyboard.press('F3');
  await expect.poll(() => fps(page), { timeout: 8000 }).toBeGreaterThan(30);
  const normal = await fps(page);
  expect(normal).toBeLessThan(75);
  await page.keyboard.down('Tab');
  await expect.poll(() => fps(page), { timeout: 8000 }).toBeGreaterThan(normal * 1.8);
  await page.keyboard.up('Tab');
  await expect.poll(() => fps(page), { timeout: 8000 }).toBeLessThan(75);
});

test('F11 entra e sai da tela cheia', async ({ page }) => {
  await page.keyboard.press('F11');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement), { timeout: 5000 }).toBe(true);
  await page.keyboard.press('F11');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement), { timeout: 5000 }).toBe(false);
});

test('Proporção do menu rápido: 4:3 → 8:7 → esticar, como o PROPORCOES do antigo', async ({ page }) => {
  await page.keyboard.press('F2');
  const item = page.locator('#rapido li', { hasText: 'Proporção' });
  await expect(item).toContainText('4:3 (como na TV)');
  await item.click();
  await page.keyboard.press('ArrowRight');
  await expect(item).toContainText('Pixel perfeito (8:7)');
  await page.keyboard.press('ArrowRight');
  await expect(item).toContainText('Esticar');
  await page.keyboard.press('ArrowRight');
  await expect(item).toContainText('4:3 (como na TV)');
});
