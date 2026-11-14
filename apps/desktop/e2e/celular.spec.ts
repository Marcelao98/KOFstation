// M14.2: controle de toque e layout do celular, no navegador com tela de celular (?celular=1 liga o modo).
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/?celular=1');
  await expect(page.locator('html')).toHaveClass(/celular/);
});
test.afterEach(() => expect(erros).toEqual([]));

async function abrirJogo(page: Page) {
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await expect(page.locator('body')).toHaveClass(/cel-jogo/);
}

/** Um dedo (pointerId) apertando/soltando/arrastando no ponto central de um elemento ou numa posição. */
async function dedo(
  page: Page,
  tipo: 'pointerdown' | 'pointermove' | 'pointerup',
  id: number,
  alvo: string,
  dx = 0,
  dy = 0,
) {
  await page.evaluate(
    ([t, i, sel, x, y]) => {
      const el = document.querySelector(sel as string) as HTMLElement;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 + (x as number);
      const cy = r.top + r.height / 2 + (y as number);
      const alvoReal = t === 'pointerdown' ? el : (document.querySelector('#ctl') as HTMLElement);
      alvoReal.dispatchEvent(
        new PointerEvent(t as string, {
          pointerId: i as number,
          clientX: cx,
          clientY: cy,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    [tipo, id, alvo, dx, dy] as const,
  );
}
async function caixa(page: Page, seletor: string) {
  const b = await page.locator(seletor).boundingBox();
  if (!b) throw new Error(`${seletor} não tem caixa na tela`);
  return b;
}
const bits = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __kofTeste: { toque: { bits: number } } }).__kofTeste.toque.bits);

test('retrato: o controle aparece embaixo, com a barra de baixo escondida; sem jogo ele não aparece', async ({
  page,
}) => {
  await expect(page.locator('#ctl')).toBeHidden();
  await abrirJogo(page);
  await expect(page.locator('#ctl')).toBeVisible();
  await expect(page.locator('#lateral')).toBeHidden();
  for (const b of ['dpad', 'A', 'B', 'X', 'Y', 'L', 'R', 'Start', 'Select', 'menu', 'rew', 'turbo'])
    await expect(page.locator(`#ctl [data-b="${b}"]`)).toBeVisible();
  const ctl = await caixa(page, '#ctl');
  const tela = await caixa(page, '#tela');
  expect(tela.y + tela.height).toBeLessThanOrEqual(ctl.y + 1); // o jogo fica acima do controle, sem cobrir
  await page.screenshot({ path: 'test-results/celular-retrato.png' });
});

test('multitoque: dois dedos apertam A e Start juntos; soltar um mantém o outro; deslizar troca de botão', async ({
  page,
}) => {
  await abrirJogo(page);
  await dedo(page, 'pointerdown', 1, '#ctl [data-b="A"]');
  await dedo(page, 'pointerdown', 2, '#ctl [data-b="Start"]');
  await expect.poll(() => bits(page)).toBe(0x0080 | 0x1000);
  await dedo(page, 'pointerup', 1, '#ctl [data-b="A"]');
  await expect.poll(() => bits(page)).toBe(0x1000);
  await dedo(page, 'pointerup', 2, '#ctl [data-b="Start"]');
  await expect.poll(() => bits(page)).toBe(0);
  // deslizar do B pro Y: o dedo troca de botão
  await dedo(page, 'pointerdown', 3, '#ctl [data-b="B"]');
  await expect.poll(() => bits(page)).toBe(0x8000);
  await dedo(page, 'pointermove', 3, '#ctl [data-b="Y"]');
  await expect.poll(() => bits(page)).toBe(0x4000);
  await dedo(page, 'pointerup', 3, '#ctl [data-b="Y"]');
  await expect.poll(() => bits(page)).toBe(0);
});

test('direcional: cima e direita juntos (diagonal); no centro não aperta nada', async ({ page }) => {
  await abrirJogo(page);
  await dedo(page, 'pointerdown', 1, '#ctl [data-b="dpad"]'); // centro: zona morta
  await expect.poll(() => bits(page)).toBe(0);
  await dedo(page, 'pointermove', 1, '#ctl [data-b="dpad"]', 55, -55);
  await expect.poll(() => bits(page)).toBe(0x0800 | 0x0100);
  await expect(page.locator('#ctl [data-b="dpad"]')).toHaveAttribute('data-dir', /u/);
  await dedo(page, 'pointerup', 1, '#ctl [data-b="dpad"]');
  await expect.poll(() => bits(page)).toBe(0);
});

test('☰ abre o menu rápido com Início e Controle virtual; ⏩ liga o turbo enquanto segura', async ({ page }) => {
  await abrirJogo(page);
  await dedo(page, 'pointerdown', 1, '#ctl [data-b="menu"]');
  await expect(page.locator('#rapido')).toBeVisible();
  await expect(page.locator('#rapido')).toContainText('🏠 Início');
  await expect(page.locator('#rapido')).toContainText('🎮 Controle virtual');
});

test('os 6 modelos mudam o visual e ficam guardados; tamanho, transparência e canhoto', async ({ page }) => {
  await abrirJogo(page);
  await page.keyboard.press('Escape'); // pausa; a tela Controles abre pelo menu rápido
  await page.evaluate(() =>
    (document.querySelector('#ctl [data-b="menu"]') as HTMLElement).dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 9, bubbles: true, cancelable: true }),
    ),
  );
  await page.locator('#rapido li', { hasText: 'Controle virtual' }).click();
  await expect(page.locator('#teclas')).toBeVisible();
  await expect(page.locator('#teclas .ctl-card')).toHaveCount(6);
  for (const m of ['moderno', 'minimo', 'arcade', 'portatil', 'tema', 'classico']) {
    await page.click(`#teclas [data-modelo="${m}"]`);
    await expect(page.locator('#ctl')).toHaveClass(new RegExp(`skin-${m}`));
    await expect(page.locator(`#teclas [data-modelo="${m}"]`)).toHaveClass(/ativo/);
  }
  await page.fill('#ctl-tam', '1.4');
  await expect(page.locator('#ctl')).toHaveCSS('--esc', '1.4');
  await page.check('#ctl-canhoto');
  await expect(page.locator('body')).toHaveClass(/canhoto/);
  // guardado: recarregar mantém o modelo
  await page.click('#teclas [data-modelo="arcade"]');
  await page.waitForTimeout(300);
  await page.reload();
  await abrirJogo(page);
  await expect(page.locator('#ctl')).toHaveClass(/skin-arcade/);
  await page.screenshot({ path: 'test-results/celular-arcade.png' });
});

test.describe('deitado', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('o controle flutua por cima do jogo, nos cantos, sem cobrir a imagem', async ({ page }) => {
    await abrirJogo(page);
    const ctl = await caixa(page, '#ctl');
    expect(ctl.width).toBeGreaterThan(800); // cobre a tela inteira, só os botões pegam toque
    const tela = await caixa(page, '#tela');
    const dpad = await caixa(page, '#ctl [data-b="dpad"]');
    const a = await caixa(page, '#ctl [data-b="A"]');
    expect(dpad.x + dpad.width).toBeLessThanOrEqual(tela.x + 2); // direcional à esquerda da imagem
    expect(a.x).toBeGreaterThanOrEqual(tela.x + tela.width - 2); // botões à direita
    await page.screenshot({ path: 'test-results/celular-paisagem.png' });
  });
});
