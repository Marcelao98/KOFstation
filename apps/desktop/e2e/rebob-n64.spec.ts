// R.4: o N64 (Worker, estado de ~16 MB) rebobina. Mede quanto custa cada foto (fotoMs da medição) e confere que
// segurar Backspace volta (preto e branco, ampulheta) sem erro.
import { expect, test } from '@playwright/test';
import { romN64QueDesenha } from './roms';

test('N64: grava fotos, mede o custo e volta', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await page.setInputFiles('#arquivo', {
    name: 'Desenha.z64',
    mimeType: 'application/octet-stream',
    buffer: romN64QueDesenha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Desenha', { timeout: 30_000 });
  type Med = { fps: number; nucleoMs: number; fotoMs?: { media: number; maior: number } } | null;
  const medicao = () =>
    page.evaluate(
      () => (globalThis as unknown as { __kofTeste: { medicao: () => unknown } }).__kofTeste.medicao() as Med,
    );
  await expect.poll(async () => (await medicao())?.fotoMs?.media ?? -1, { timeout: 20_000 }).toBeGreaterThan(0);
  const amostras: Med[] = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1000);
    amostras.push(await medicao());
  }
  console.log('N64 rebobinar:', JSON.stringify(amostras));
  await page.keyboard.down('Backspace');
  await expect(page.locator('body')).toHaveClass(/rebobinando/);
  await expect(page.locator('#ampulheta')).toContainText('⏪');
  await page.waitForTimeout(500);
  await page.keyboard.up('Backspace');
  await expect(page.locator('body')).not.toHaveClass(/rebobinando/);
  expect(erros).toEqual([]);
});
