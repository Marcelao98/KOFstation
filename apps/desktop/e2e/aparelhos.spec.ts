// M13.2: 📡 Aparelhos (o #aparelhos do antigo) com o serviço de rede de mentira do backend de teste: parear um celular
// pelo código, o QR, a lista e o cartão do Início.
import { expect, test } from '@playwright/test';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('parear um celular: QR e código, o celular aparece conectado, nome e remover', async ({ page }) => {
  await expect(page.locator('#hm-aparelhos')).toHaveText('parear o celular com o PC');
  await page.locator('#home [data-acao="aparelhos"]').first().click();
  await expect(page.locator('#aparelhos #ap-com')).toBeVisible();
  await expect(page.locator('#ap-vazio')).toBeVisible();
  await expect(page.locator('#ap-nome')).toHaveValue('PC de teste');
  await page.click('[data-acao="ap-parear"]');
  await expect(page.locator('#ap-codigo')).toHaveText('123 456');
  await expect(page.locator('#ap-qr-img svg')).toBeVisible();
  await expect(page.locator('#ap-tempo')).toContainText('192.168.0.10:8650');
  const errado = await page.evaluate(() =>
    (
      window as unknown as { __kofTeste: { rede: { parearCelular: (c: string) => boolean } } }
    ).__kofTeste.rede.parearCelular('654321'),
  );
  expect(errado).toBe(false);
  await page.evaluate(() =>
    (
      window as unknown as { __kofTeste: { rede: { parearCelular: (c: string, n: string) => boolean } } }
    ).__kofTeste.rede.parearCelular('123456', 'Moto do Marcelo'),
  );
  await expect(page.locator('#ap-lista li')).toHaveCount(1);
  await expect(page.locator('#ap-lista li')).toContainText('📱 Moto do Marcelo');
  await expect(page.locator('#ap-lista li')).toContainText('🟢 conectado');
  await expect(page.locator('#ap-qr')).toHaveCount(0);
  await expect(page.locator('#ap-msg')).toHaveText('✅ Pareado com Moto do Marcelo');
  await page.fill('#ap-nome', 'PC da sala');
  await page.press('#ap-nome', 'Enter');
  await expect(page.locator('#ap-nome')).toHaveValue('PC da sala');
  await page.click('#aparelhos .x');
  await expect(page.locator('#hm-aparelhos')).toHaveText('🟢 conectado: Moto do Marcelo');
  await page.locator('#home [data-acao="aparelhos"]').first().click();
  page.once('dialog', (d) => void d.accept());
  await page.locator('#ap-lista li button', { hasText: 'Remover' }).click();
  await expect(page.locator('#ap-lista li')).toHaveCount(0);
});
