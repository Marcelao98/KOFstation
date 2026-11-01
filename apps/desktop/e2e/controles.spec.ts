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

test('analógico no teclado vai pro núcleo: em PS1/PS2/N64 as setas são o analógico (unidade em domain/entrada)', async ({
  page,
}) => {
  // os núcleos de PS1/N64 chegam no M11; aqui confere que a aba mostra o analógico e as teclas padrão do antigo
  await page.click('#menu >> text=Emulação');
  await page.click('#menu [data-acao="teclas"]');
  await page.click('#ct-abas button:has-text("PS1")');
  await expect(page.locator('[data-ct-tecla="AE↑"]')).toHaveText('↑');
  await expect(page.locator('[data-ct-tecla="Cima"]')).toHaveText('T');
  await expect(page.locator('[data-ct-tecla="L2"]')).toHaveText('E');
  await expect(page.locator('[data-ct-tecla="AD→"]')).toHaveText('L');
  await page.click('#ct-abas button:has-text("N64")');
  await expect(page.locator('[data-ct-tecla="AD→"]')).toHaveCount(0);
});

test('jogadores: dois controles pegam J1 e J2, a luz acende e a escolha fica guardada pelo nome', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = (id: string, index: number) => ({
      id,
      index,
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      timestamp: 0,
    });
    const pads = [pad('Xbox Wireless Controller (STANDARD GAMEPAD)', 0), pad('8BitDo Pro 2', 1)];
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads });
    (window as unknown as { __pads: typeof pads }).__pads = pads;
  });
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await page.click('#menu >> text=Arquivo');
  await page.click('#menu [data-acao="jogadores"]');
  await expect(page.locator('#jog-lista li')).toHaveCount(3);
  const li = (n: number) => page.locator('#jog-lista li').nth(n);
  await expect(li(0)).toContainText('Teclado');
  await expect(li(0).locator('button.ativo')).toHaveText('J1');
  await expect(li(1).locator('button.ativo')).toHaveText('J1');
  await expect(li(2).locator('button.ativo')).toHaveText('J2');
  await page.evaluate(() => {
    const b = (window as unknown as { __pads: { buttons: { pressed: boolean }[] }[] }).__pads[1]?.buttons[4]; // LB (o B fecharia a janela, como no antigo)
    if (b) b.pressed = true;
  });
  await expect(li(2)).toHaveClass(/apertando/);
  await li(1).locator('button', { hasText: 'J3' }).click();
  await expect(li(1).locator('button.ativo')).toHaveText('J3');
  await expect
    .poll(async () => (await page.evaluate(() => sessionStorage.getItem('kofstation-teste.config'))) ?? '')
    .toContain('pad:Xbox Wireless Controller (STANDARD GAMEPAD)');
});
