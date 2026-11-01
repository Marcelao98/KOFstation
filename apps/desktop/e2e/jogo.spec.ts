// M2: abrir uma ROM (gerada aqui: Mega Drive que pinta o fundo de vermelho) e jogar no app novo.
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

const corDoMeio = (page: Page) =>
  page.evaluate(() => {
    const t = document.querySelector<HTMLCanvasElement>('#tela');
    if (!t) return null;
    const c = document.createElement('canvas');
    c.width = t.width;
    c.height = t.height;
    const g = c.getContext('2d');
    if (!g) return null;
    g.drawImage(t, 0, 0);
    return [...g.getImageData(t.width >> 1, t.height >> 1, 1, 1).data];
  });

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

test('roda: imagem vermelha, quadros andando e som saindo', async ({ page }) => {
  await expect(page.locator('#tela')).toBeVisible();
  await expect.poll(() => corDoMeio(page), { timeout: 10_000 }).toEqual(expect.arrayContaining([expect.any(Number)]));
  await expect
    .poll(
      async () => {
        const c = await corDoMeio(page);
        const [r = 0, g = 255, b = 255] = c ?? [];
        return r > 180 && g < 60 && b < 60;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.keyboard.press('F3');
  await expect(page.locator('#desempenho')).toContainText('fps', { timeout: 5000 });
  const painel = (await page.locator('#desempenho').textContent()) ?? '';
  expect(painel).not.toContain('sem som');
  expect(Number(/(\d+) fps/.exec(painel)?.[1])).toBeGreaterThan(30);
  await expect(page.locator('#st-fps')).toContainText('fps');
});

test('Esc pausa, P continua; telas por cima pausam; Início mostra "Jogando agora"', async ({ page }) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('#st-fps')).toContainText('pausado');
  await page.keyboard.press('KeyP');
  await expect(page.locator('#st-fps')).not.toContainText('pausado');
  await page.keyboard.press('Home');
  await expect(page.locator('#hm-destaque')).toContainText('Jogando agora');
  await expect(page.locator('#hm-destaque h2')).toHaveText('Teste Vermelho');
  await expect(page.locator('#st-fps')).toContainText('pausado');
  await page.click('#hm-destaque [data-acao="voltar-jogo"]');
  await expect(page.locator('#tela')).toBeVisible();
  await expect(page.locator('#st-fps')).not.toContainText('pausado');
  await expect(page.locator('#lat-jogo')).toBeVisible();
});

test('menu rápido: F2 e botão direito, volume com ◀▶, Esc fecha', async ({ page }) => {
  await page.keyboard.press('F2');
  await expect(page.locator('#rapido')).toBeVisible();
  await expect(page.locator('#rapido-lista li')).toHaveCount(19);
  for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowDown');
  await expect(page.locator('#rapido-lista li.sel')).toContainText('Volume');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#rapido-lista li.sel b')).toHaveText('90%');
  await page.keyboard.press('Escape');
  await expect(page.locator('#rapido')).toBeHidden();
  await page.mouse.click(550, 350, { button: 'right' });
  await expect(page.locator('#rapido')).toBeVisible();
  await page.mouse.click(550, 350, { button: 'right' });
  await expect(page.locator('#rapido')).toBeHidden();
});

test('arquivo que não é jogo e sistema que ainda não chegou avisam', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'leia.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') });
  await expect(page.locator('#aviso')).toContainText('não parece um jogo');
  await page.setInputFiles('#arquivo', { name: 'disco.cue', mimeType: 'text/plain', buffer: Buffer.from('FILE') });
  await expect(page.locator('#aviso')).toContainText('PlayStation ainda não roda');
});
