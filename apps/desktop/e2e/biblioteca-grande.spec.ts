// T.1: a biblioteca com milhares de jogos, com a CPU limitada (4× mais lenta), abre rápido e só desenha o primeiro lote
// de 150 (como o antigo); o resto vem ao rolar.
import { expect, test } from '@playwright/test';

test('3.000 jogos com a CPU 4× mais lenta: abre em segundos e desenha só o primeiro lote', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await page.evaluate(() => {
    const t = (globalThis as unknown as { __kofTeste: { lojas: Map<string, Map<string, [unknown, Uint8Array]>> } })
      .__kofTeste;
    const m = new Map<string, [unknown, Uint8Array]>();
    for (let i = 0; i < 3000; i++) {
      const titulo = `Jogo de teste ${String(i).padStart(4, '0')}`;
      const id = `${titulo}|${32768 + i}`;
      m.set(id, [
        { id, nome: titulo + '.gb', arquivo: titulo + '.gb', sistema: 'gb', titulo, tamanho: 32768 + i, ultimo: i },
        new Uint8Array(0),
      ]);
    }
    t.lojas.set('jogos', m);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await expect(page.locator('#biblioteca li').first()).toBeVisible({ timeout: 10_000 });
  const ms = Date.now() - t0;
  const linhas = await page.locator('#biblioteca li').count();
  console.log(`biblioteca com 3000 jogos, CPU 4×: ${ms} ms até a primeira linha, ${linhas} linhas no DOM`);
  expect(ms).toBeLessThan(5000);
  expect(linhas).toBeLessThanOrEqual(400); // um lote de 150 (+ cabeçalhos), não os 3.000
  expect(linhas).toBeGreaterThanOrEqual(100);
});
