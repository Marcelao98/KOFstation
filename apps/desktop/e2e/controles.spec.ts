// M8: controles e teclas (camadas, captura de tecla, teclas reservadas, só este jogo) e jogadores.
import { expect, test } from '@playwright/test';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('remapear: tecla nova, reservada recusada, troca com quem tinha, só este jogo e ↺', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await page.click('#menu >> text=Emulação');
  await page.click('#menu [data-acao="teclas"]');
  await expect(page.locator('#teclas')).toBeVisible();
  await expect(page.locator('#ct-abas .ativo')).toHaveText('MD');
  // Mega Drive: o B do SNES é o "B" e o Y é o "A" do console
  await expect(page.locator('#grade-teclas .ct-nome', { hasText: 'A (Y)' })).toHaveCount(1);
  await page.click('[data-ct-tecla="B"]');
  await expect(page.locator('#teclas-dica')).toContainText('Aperte a tecla');
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('atalho do emulador');
  await page.keyboard.press('KeyX'); // era do A: troca
  await expect(page.locator('[data-ct-tecla="B"]')).toHaveText('X');
  await expect(page.locator('[data-ct-tecla="A"]')).toHaveText('Z');
  await expect(page.locator('[data-ct-tecla="B"]')).toHaveClass(/mudou/);
  // só este jogo
  await page.click('#ct-escopo button:has-text("Só Vermelho")');
  await page.click('[data-ct-tecla="Start"]');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-ct-tecla="Start"]')).toHaveText('Espaço');
  await expect
    .poll(async () =>
      Object.keys(
        (await page.evaluate(() => JSON.parse(sessionStorage.getItem('kofstation-teste.config') ?? '{}'))).valores ??
          {},
      ),
    )
    .toEqual(expect.arrayContaining(['teclas.md', 'teclas.jogo.MD 17643206|1024']));
  await page.locator('#grade-teclas .ct-volta').nth(10).click({ force: true });
  await page.click('[data-acao="teclas-padrao"]');
  await expect(page.locator('#aviso')).toContainText('este jogo volta a usar os controles do console');
  await expect(page.locator('[data-ct-tecla="Start"]')).toHaveText('Enter');
});
