// M5: save de bateria, estados, salvar automático e modos de jogo.
import { expect, test, type Page } from '@playwright/test';
import { romGbComSave, romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

type Lojas = Map<string, Map<string, [Record<string, unknown>, Uint8Array]>>;
const loja = (page: Page, nome: string) =>
  page.evaluate(
    (n) =>
      [...((globalThis as unknown as { __kofTeste: { lojas: Lojas } }).__kofTeste.lojas.get(n) ?? new Map())].map(
        ([k, [meta, b]]) => ({ k, meta, n: b.length }),
      ),
    nome,
  );

test('o save da bateria vai pra loja com a chave do antigo (rascunho primeiro, depois assentado)', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await expect
    .poll(async () => (await loja(page, 'saves')).map((s) => s.k), { timeout: 10_000 })
    .toEqual(['sram.KOFSAVE.32768']);
  const [s] = await loja(page, 'saves');
  expect(s?.meta).toMatchObject({ chave: 'sram.KOFSAVE.32768', jogo: 'KOFSAVE|32768', nome: 'Save' });
  expect(s?.meta.cheio).toBeGreaterThanOrEqual(8192);
  // o rascunho sai depois de assentar
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kofstation-rascunho.'))))
    .toEqual([]);
});

test('F5 salva estado com print, F6 mostra, clicar carrega, F8 carrega o último, 🗑 apaga', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await page.waitForTimeout(500);
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('estado salvo');
  await page.keyboard.press('F5');
  await expect.poll(async () => (await loja(page, 'estados')).length).toBe(2);
  const [e] = await loja(page, 'estados');
  expect(e?.k).toMatch(/^KOFSAVE\|32768\/\d+$/);
  expect(String(e?.meta.capa)).toMatch(/^data:image\/(webp|png)/);
  await page.keyboard.press('F6');
  await expect(page.locator('#estados')).toBeVisible();
  await expect(page.locator('#grade-estados .cartao')).toHaveCount(2);
  await expect(page.locator('#estados-jogo')).toHaveValue('KOFSAVE|32768');
  await page.locator('#grade-estados .cartao .x').first().click();
  await expect(page.locator('#grade-estados .cartao')).toHaveCount(1);
  await page.locator('#grade-estados .cartao').first().click();
  await expect(page.locator('#aviso')).toContainText('carregado');
  await expect(page.locator('#estados')).toBeHidden();
  await page.keyboard.press('F8');
  await expect(page.locator('#aviso')).toContainText('carregado');
});

test('salvar automático ao trocar de jogo; Continuar na biblioteca, no Início e nos estados', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await page.waitForTimeout(400);
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await expect.poll(async () => (await loja(page, 'autos')).map((a) => a.k)).toEqual(['KOFSAVE|32768']);
  await page.keyboard.press('Home');
  await expect(page.locator('#hm-bloco-recentes .hm-cartao')).toHaveCount(1);
  await page.keyboard.press('Control+KeyL');
  await page.fill('#filtro', 'save');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#info-nome')).toHaveText('Save');
  await expect(page.locator('[data-acao="jogar"]')).toHaveText('▶ Continuar');
  await expect(page.locator('[data-acao="do-zero"]')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#aviso')).toContainText('continuando de');
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await page.keyboard.press('F6');
  await expect(page.locator('#grade-estados .cartao.auto')).toHaveCount(1);
});

test('modos: pergunta ao abrir, Hardcore sem estados, opções de emulação e não perguntar mais', async ({ page }) => {
  await page.evaluate(() => ((window as unknown as { __kofModo: boolean }).__kofModo = true));
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#modo-tela')).toBeVisible();
  await expect(page.locator('#modo-jogo')).toHaveText('Save');
  await expect(page.locator('#modo-ops .modo-op')).toHaveCount(4);
  await page.click('[data-modo="hardcore"]');
  await expect(page.locator('#modo-tela')).toBeHidden();
  await expect(page.locator('#aviso')).toContainText('modo 💀 Hardcore');
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('Hardcore: sem estados');
  await page.keyboard.press('F2');
  await page.click('#menu >> text=Emulação');
  await page.click('#menu [data-acao="emu-opcoes"]');
  await expect(page.locator('#emu-modo')).toHaveValue('hardcore');
  await page.selectOption('#emu-modo', 'alegria');
  await page.selectOption('#emu-modoPerguntar', '0');
  await page.keyboard.press('Escape');
  await page.keyboard.press('F5');
  await expect(page.locator('#aviso')).toContainText('estado salvo');
  // reabrir outro jogo não pergunta mais
  await page.setInputFiles('#arquivo', {
    name: 'Outro.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(0x11),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Outro');
  await expect(page.locator('#modo-tela')).toBeHidden();
});
