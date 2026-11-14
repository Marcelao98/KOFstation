// O som sem SharedArrayBuffer (WebView do Android, que não tem isolamento de origem): Worker → página → AudioWorklet por
// mensagem. Antes o jogo rodava MUDO nesse caso (o APK de 14/11 saiu sem som por causa disso).
import { expect, test } from '@playwright/test';
import { romVermelha } from './roms';

test('sem crossOriginIsolated o jogo toca som pelo AudioWorklet por mensagens', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(self, 'crossOriginIsolated', { value: false }); // como o WebView do Android
  });
  await page.goto('/');
  expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(false);
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await page.keyboard.press('KeyZ'); // um gesto: o navegador libera o AudioContext
  const tocadas = () =>
    page.evaluate(() => (globalThis as unknown as { __kofTeste: { somTocado: () => number } }).__kofTeste.somTocado());
  await expect.poll(tocadas, { timeout: 15_000 }).toBeGreaterThan(24_000); // mais de ~0,5 s de som saiu
  // e o ritmo é o do jogo (≈ 1 s de som por segundo, com folga pra tolerância da máquina)
  const a = await tocadas();
  await page.waitForTimeout(2000);
  const b = await tocadas();
  const porSegundo = (b - a) / 2;
  expect(porSegundo).toBeGreaterThan(30_000);
  expect(porSegundo).toBeLessThan(60_000);
  await page.keyboard.press('F3');
  expect(await page.locator('#desempenho').textContent()).not.toContain('sem som');
  expect(erros).toEqual([]);
});
