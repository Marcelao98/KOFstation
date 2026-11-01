// M6: rebobinar (segurar Backspace): preto e branco, ampulheta voltando, recarga no Normal, nada no Hardcore.
import { expect, test } from '@playwright/test';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
});
test.afterEach(() => expect(erros).toEqual([]));

test('Normal: volta em preto e branco e depois recarrega', async ({ page }) => {
  await page.waitForTimeout(2500); // ~2,5 s de jogo guardados
  await page.keyboard.down('Backspace');
  await expect(page.locator('body')).toHaveClass(/rebobinando/);
  await expect(page.locator('#ampulheta')).toContainText('⏪');
  await page.waitForTimeout(600);
  await page.keyboard.up('Backspace');
  await expect(page.locator('body')).not.toHaveClass(/rebobinando/);
  await expect(page.locator('#ampulheta')).toContainText('⏳ 30 s');
  await page.keyboard.down('Backspace');
  await expect(page.locator('#aviso')).toContainText('rebobinar recarregando');
  await page.keyboard.up('Backspace');
});

test('Hardcore: sem rebobinar', async ({ page }) => {
  await page.keyboard.press('F2');
  await page.locator('#rapido li', { hasText: '🎮 Modo' }).click();
  await page.locator('#emu-modo').selectOption('hardcore');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await page.keyboard.down('Backspace');
  await expect(page.locator('#aviso')).toContainText('sem rebobinar');
  await page.keyboard.up('Backspace');
  await expect(page.locator('body')).not.toHaveClass(/rebobinando/);
});
