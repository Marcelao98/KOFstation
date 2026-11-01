// M3: biblioteca e pasta Kof Games (com o backend de teste: a Kof Games é de mentira, na memória da página).
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
});
test.afterEach(() => expect(erros).toEqual([]));

/** Põe arquivos na Kof Games falsa (caminho → bytes). */
async function porArquivos(page: Page, arquivos: Record<string, number[]>) {
  await page.evaluate((a) => {
    const t = (globalThis as unknown as { __kofTeste: { arquivos: Map<string, Uint8Array> } }).__kofTeste;
    for (const [k, v] of Object.entries(a)) t.arquivos.set(k, new Uint8Array(v));
  }, arquivos);
}

test('escolhe a pasta, mostra o plano, organiza e joga da lista', async ({ page }) => {
  const rom = [...romVermelha()];
  await porArquivos(page, {
    'Novos/Vermelho.md': rom,
    'Games/snes/leia-me.txt': [1],
    'Games/gba/Errado [h1].sfc': [1, 2, 3],
  });
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await expect(page.locator('#lista-vazia')).toContainText('pasta Kof Games');
  await page.click('.bib-rodape [data-acao="pasta"]');
  await page.fill('#pasta-caminho', '/home/teste/Games');
  await page.click('#pasta-tela button[type="submit"]');
  await expect(page.locator('#aviso')).toContainText('pasta de dentro');
  await page.fill('#pasta-caminho', '/home/teste/Kof Games');
  await page.click('#pasta-tela button[type="submit"]');
  await expect(page.locator('#organizar-lista li')).toHaveCount(2);
  await expect(page.locator('#organizar-lista')).toContainText('Novos/Vermelho.md');
  await page.click('[data-acao="organizar-aplicar"]');
  // a variante [h1] some com "Só os principais"; aparece quando desliga
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#roms li').first()).toContainText('Vermelho');
  await page.click('[data-acao="so-principais"]');
  await expect(page.locator('#roms li')).toHaveCount(2);
  const lugar = await page.evaluate(() =>
    [
      ...(globalThis as unknown as { __kofTeste: { arquivos: Map<string, Uint8Array> } }).__kofTeste.arquivos.keys(),
    ].sort(),
  );
  expect(lugar).toEqual(['Games/megadrive/Vermelho.md', 'Games/snes/Errado [h1].sfc', 'Games/snes/leia-me.txt']);
  // digitar procura; Enter joga
  await page.keyboard.type('verm');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  // depois de jogar ele vira um jogo da biblioteca (★)
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li.sel .li-ext')).toHaveText('★');
  await expect(page.locator('#info-det')).toContainText('Mega Drive · jogado');
});

test('jogo aberto de fora ganha uma cópia na Kof Games e fica na biblioteca', async ({ page }) => {
  await page.evaluate(() => {
    (globalThis as unknown as { __kofTeste: { raiz: string } }).__kofTeste.raiz = '/home/teste/Kof Games';
  });
  await page.setInputFiles('#arquivo', {
    name: 'Fora.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Fora');
  await expect(page.locator('#aviso')).toContainText('guardado em Kof Games/Games/megadrive');
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#roms li').first()).toContainText('Fora');
});
