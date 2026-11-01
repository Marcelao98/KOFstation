// M1: casca, telas, Voltar, temas, atalhos e navegação por controle (equivalentes a home/direito/foco/temas-menu do antigo).
import { expect, test, type Page } from '@playwright/test';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('abre no Início com o tema Café e o isolamento ligado', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'cafe');
  await expect(page.locator('.n-temas')).toHaveText('126');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.locator('#hm-versao')).toContainText('versão 0.1.0');
});

test('telas e Voltar: lateral, Alt+←, botão direito e Esc', async ({ page }) => {
  await page.click('#lateral [data-acao="guia"]');
  await expect(page.locator('#guia')).toBeVisible();
  await page.click('#lateral [data-acao="biblioteca"]');
  await expect(page.locator('#biblioteca .titulo-j')).toContainText('Biblioteca');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('#guia')).toBeVisible();
  await page.mouse.click(600, 400, { button: 'right' });
  await expect(page.locator('#home')).toBeVisible();
  await page.keyboard.press('Control+l');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#home')).toBeVisible();
});

test('menus completos; o que ainda não existe avisa a etapa', async ({ page }) => {
  await page.click('#menu .m:nth-child(1) > button');
  await expect(page.locator('#menu .m.aberto .sub button')).toHaveCount(13);
  await page.click('#menu .m.aberto [data-acao="traducao"]');
  await expect(page.locator('#aviso')).toContainText('etapa M10');
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('abra um jogo primeiro');
});

test('Guia: páginas e tabela de atalhos', async ({ page }) => {
  await page.click('#lateral [data-acao="guia"]');
  await page.click('[data-guia="atalhos"]');
  await expect(page.locator('#tab-ajuda tr')).toHaveCount(21);
  await expect(page.locator('[data-pagina="atalhos"]')).toBeVisible();
  await expect(page.locator('[data-pagina="comecar"]')).toBeHidden();
});

test('temas: busca sem acento, experimentar, escolher e lembrar', async ({ page }) => {
  await page.click('#lateral [data-acao="temas"]');
  await page.fill('#temas-busca', 'cafe com canela');
  await expect(page.locator('.previa')).toHaveCount(1);
  await page.hover('.previa[data-tema="canela"]');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'canela');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'cafe');
  await page.click('#lateral [data-acao="temas"]');
  await page.click('[data-cat="Clássicos do KOFstation"]');
  await page.click('.previa[data-tema="zsnes"]');
  await expect(page.locator('#aviso')).toContainText('ZSNES');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'zsnes');
});

test('showcase rápido passa os temas e "Ficar com este" escolhe', async ({ page }) => {
  await page.click('#lateral [data-acao="temas"]');
  await page.click('[data-cat="Café"]');
  await page.click('[data-acao="showcase-rapido"]');
  await expect(page.locator('#showcase')).toBeVisible();
  await page.waitForTimeout(1200);
  const tema = await page.locator('html').getAttribute('data-tema');
  await page.click('[data-acao="showcase-ficar"]');
  await expect(page.locator('#showcase')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema ?? '');
});

// controle falso pela Gamepad API: index 1 = A, 0 = B, 13 = baixo, 15 = direita, 9 = Start
async function controle(page: Page) {
  await page.addInitScript(() => {
    const botoes = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    const g = {
      id: 'controle de teste',
      index: 0,
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: botoes,
      timestamp: 0,
    };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [g] });
    (window as unknown as { __apertar: (i: number, v: boolean) => void }).__apertar = (i, v) => {
      const b = botoes[i];
      if (b) b.pressed = v;
    };
  });
  await page.reload();
  return async (i: number) => {
    await page.evaluate(
      (x) => (window as unknown as { __apertar: (i: number, v: boolean) => void }).__apertar(x, true),
      i,
    );
    await page.waitForTimeout(60);
    await page.evaluate(
      (x) => (window as unknown as { __apertar: (i: number, v: boolean) => void }).__apertar(x, false),
      i,
    );
    await page.waitForTimeout(60);
  };
}

test('controle: A no Início faz a ação principal, direcional anda, B volta, Start vai pro Início', async ({ page }) => {
  const apertar = await controle(page);
  await page.click('#lateral [data-acao="guia"]');
  await apertar(13); // baixo: primeiro foco (o × da janela, o primeiro botão)
  await expect(page.locator('#guia .foco-pad')).toHaveCount(1);
  // anda pra baixo até cair num item do menu do guia que não é o aberto, e o A clica exatamente nele
  let alvo = '';
  for (let i = 0; i < 8 && !alvo; i++) {
    await apertar(13);
    const f = page.locator('#guia .gu-menu .foco-pad:not(.ativo)');
    if (await f.count()) alvo = (await f.textContent()) ?? '';
  }
  expect(alvo).not.toBe('');
  await apertar(1); // A
  await expect(page.locator('#guia .gu-menu .ativo')).toHaveText(alvo);
  await apertar(0); // B: fecha a janela (×)
  await expect(page.locator('#home')).toBeVisible();
  await apertar(9); // Start no Início = ação principal (escolher a pasta Kof Games)
  await expect(page.locator('#pasta-tela')).toBeVisible();
  await page.click('#pasta-tela .x');
  await apertar(15); // direita: anda pelos botões do Início
  await expect(page.locator('#home .foco-pad')).toHaveCount(1);
});
