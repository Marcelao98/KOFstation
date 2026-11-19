// B.1: biblioteca com cara de console. As versões de um jogo (região, tradução, as ROMs de um zip) viram uma linha só,
// com "qual versão?" ao jogar e a escolha lembrada.
import { expect, test } from '@playwright/test';
import { romVermelha, zipGuardado } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  const rom = [...romVermelha()];
  const zip = [...zipGuardado({ 'Outro Jogo (USA).md': romVermelha(), 'Outro Jogo (USA) [T+Por].md': romVermelha() })];
  await page.evaluate(
    ({ rom, zip }) => {
      const t = (globalThis as unknown as { __kofTeste: { raiz: string; arquivos: Map<string, Uint8Array> } })
        .__kofTeste;
      t.raiz = '/home/teste/Kof Games';
      for (const n of ['Jogo Vermelho (Japan)', 'Jogo Vermelho (USA)', 'Jogo Vermelho (USA) [T+Por]'])
        t.arquivos.set(`Games/megadrive/${n}.md`, new Uint8Array(rom));
      t.arquivos.set('Games/megadrive/Outro Jogo.zip', new Uint8Array(zip));
    },
    { rom, zip },
  );
});
test.afterEach(() => expect(erros).toEqual([]));

/** Seleciona a linha sem jogar: clicar na linha já selecionada joga (abre o "qual versão?"); aí fecha com Esc. */
async function selecionar(page: import('@playwright/test').Page, nome: string) {
  await page.locator('#roms li', { hasText: nome }).click();
  await page.waitForTimeout(150);
  if (await page.locator('#versoes').isVisible()) await page.keyboard.press('Escape');
  await expect(page.locator('#versoes')).toBeHidden();
  await expect(page.locator('#roms li.sel')).toContainText(nome);
}

test('uma linha por jogo, "qual versão?" ao jogar, a escolha fica lembrada', async ({ page }) => {
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li')).toHaveCount(2);
  const vermelho = page.locator('#roms li', { hasText: 'Jogo Vermelho' });
  await expect(vermelho).toContainText('3 versões');
  await expect(vermelho.locator('span').first()).toHaveText('Jogo Vermelho'); // o nome da obra, sem os rótulos
  await selecionar(page, 'Jogo Vermelho');
  await expect(page.locator('#info-nome')).toHaveText('Jogo Vermelho');
  await expect(page.locator('#info-det')).toContainText('3 versões');
  await page.keyboard.press('Enter');
  await expect(page.locator('#versoes')).toBeVisible();
  const opcoes = page.locator('#versoes [data-versao]');
  await expect(opcoes).toHaveCount(3);
  // a tradução em português primeiro, depois EUA, depois Japão
  await expect(opcoes.nth(0)).toContainText('EUA · Tradução PT-BR');
  await expect(opcoes.nth(1)).toContainText('EUA');
  await expect(opcoes.nth(2)).toContainText('Japão');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#st-jogo')).toHaveText('Jogo Vermelho (USA)');
  // de volta: a escolhida fica primeiro ("da última vez") e o Esc só fecha o diálogo
  await page.keyboard.press('Control+KeyL');
  await selecionar(page, 'Jogo Vermelho');
  await page.keyboard.press('Enter');
  await expect(opcoes.nth(0)).toContainText('EUA');
  await expect(opcoes.nth(0)).toContainText('da última vez');
  await page.keyboard.press('Escape');
  await expect(page.locator('#versoes')).toBeHidden();
  await expect(page.locator('#biblioteca')).toBeVisible();
});

test('zip com o jogo e a tradução: cada ROM é uma versão e abre a certa', async ({ page }) => {
  await page.keyboard.press('Control+KeyL');
  const outro = page.locator('#roms li', { hasText: 'Outro Jogo' });
  await expect(outro).toContainText('2 versões');
  await selecionar(page, 'Outro Jogo');
  await page.keyboard.press('Enter');
  const opcoes = page.locator('#versoes [data-versao]');
  await expect(opcoes).toHaveCount(2);
  await expect(opcoes.nth(0)).toContainText('Tradução PT-BR');
  await expect(opcoes.nth(0)).toContainText('dentro de um zip');
  await page.keyboard.press('Enter');
  await expect(page.locator('#st-jogo')).toHaveText('Outro Jogo (USA) [T+Por]');
});
