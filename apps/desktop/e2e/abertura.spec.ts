// M9.5: a abertura da primeira vez (título → frases → guia), Pular e Boas-vindas no menu Ajuda.
import { expect, test } from '@playwright/test';

test('abertura: tecla começa, Pular vai pro guia, 4 passos e fecha no Começar', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.addInitScript(() => ((globalThis as { __kofAbertura?: boolean }).__kofAbertura = true));
  await page.goto('/');
  await expect(page.locator('#abertura')).toBeVisible();
  await expect(page.locator('#ab-titulo')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ab-texto')).toBeVisible();
  await expect(page.locator('#ab-frase')).toContainText('Shhh', { timeout: 5000 });
  await page.locator('[data-acao="ab-pular"]').click();
  await expect(page.locator('#ab-guia')).toBeVisible();
  await expect(page.locator('.ab-passo[data-passo="1"]')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.locator('[data-acao="ab-proximo"]').click();
  await expect(page.locator('[data-acao="ab-proximo"]')).toHaveText('Começar ▸');
  await page.locator('[data-acao="ab-proximo"]').click();
  await expect(page.locator('#abertura')).toHaveCount(0);
  await expect(page.locator('#home')).toBeVisible();
  // vista: não aparece mais sozinha; Ajuda → Boas-vindas reabre
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#abertura')).toHaveCount(0);
  await page.locator('#menu button', { hasText: 'Ajuda' }).click();
  await page.locator('[data-acao="boas-vindas"]').click();
  await expect(page.locator('#abertura')).toBeVisible();
  expect(erros).toEqual([]);
});
