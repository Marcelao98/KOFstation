// R.2: o som ao rebobinar. Sem SharedArrayBuffer o som vai por mensagem e o worklet conta o que tocou (`somTocado`):
// segurando Backspace, com 📼 fita o som continua saindo (invertido, ~1 quadro de som por passo); com 🔇 mudo, para.
import { expect, test, type Page } from '@playwright/test';
import { romGbSom } from './roms';

async function abrir(page: Page, som: 'fita' | 'mudo') {
  await page.addInitScript((s) => {
    Object.defineProperty(self, 'crossOriginIsolated', { value: false });
    localStorage.setItem('kofstation.somRebob', s); // a configuração do navegador vira a do app (stores/config.ts)
  }, som);
  await page.goto('/');
  await page.setInputFiles('#arquivo', { name: 'Som.gb', mimeType: 'application/octet-stream', buffer: romGbSom() });
  await expect(page.locator('#st-jogo')).toBeVisible();
  await page.keyboard.press('KeyZ'); // gesto: libera o AudioContext
}
const tocadas = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __kofTeste: { somTocado: () => number } }).__kofTeste.somTocado());

/** Quantas amostras tocaram do meio pro fim de ~1 s segurando Backspace (o começo ainda é o som que já estava na fila). */
async function tocadasVoltando(page: Page): Promise<number> {
  await expect.poll(() => tocadas(page), { timeout: 15_000 }).toBeGreaterThan(24_000);
  await page.waitForTimeout(3000); // ~3 s guardados
  await page.keyboard.down('Backspace');
  await expect(page.locator('body')).toHaveClass(/rebobinando/);
  await page.waitForTimeout(400); // a fila do som de antes (até 250 ms) acaba
  const a = await tocadas(page);
  await page.waitForTimeout(600);
  const b = await tocadas(page);
  await expect(page.locator('body')).toHaveClass(/rebobinando/);
  await page.keyboard.up('Backspace');
  return b - a;
}

test('📼 fita: rebobinando, o som continua saindo', async ({ page }) => {
  await abrir(page, 'fita');
  const n = await tocadasVoltando(page);
  expect(n).toBeGreaterThan(12_000); // ~0,6 s × 48 mil, com folga pro CI
});

test('🔇 mudo: rebobinando, não sai som', async ({ page }) => {
  await abrir(page, 'mudo');
  const n = await tocadasVoltando(page);
  expect(n).toBeLessThan(3_000);
});
