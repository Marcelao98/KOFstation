// M16.4: opções de emulação por console: perfil geral → console → jogo, Avançado, "vale na hora" × "ao reabrir".
import { expect, test } from '@playwright/test';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

async function abrirOpcoes(page: import('@playwright/test').Page) {
  await page.keyboard.press('F2');
  await page.click('#menu >> text=Emulação');
  await page.click('#menu [data-acao="emu-opcoes"]');
  await expect(page.locator('#emu-console')).toBeVisible();
}

test('perfis, ajuste fino por console e Avançado no PS2', async ({ page }) => {
  await abrirOpcoes(page);
  await page.selectOption('#emu-console-sis', 'ps2');
  await expect(page.locator('#emu-perfil-geral')).toHaveValue('equilibrado');
  // Equilibrado = o que o app sempre usou
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Mild Underclock');
  // o perfil Rápido do console muda as opções
  await page.selectOption('#emu-perfil', 'rapido');
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Moderate Underclock');
  // ajuste fino só dela, com o rótulo de quando vale
  const linha = page.locator('[data-chave="pcsx2_ee_cycle_skip"]');
  await expect(linha).toContainText('vale na hora');
  await page.selectOption('#emuc-pcsx2_ee_cycle_skip', 'disabled');
  await expect(linha).toContainText('voltar ao perfil');
  await expect(page.locator('[data-chave="pcsx2_mtvu"]')).toContainText('vale ao reabrir');
  // Avançado esconde as opções de especialista
  await expect(page.locator('#emu-avancado [data-chave="pcsx2_ee_cycle_rate"]')).toBeHidden();
  await page.click('#emu-avancado summary');
  await expect(page.locator('#emu-avancado [data-chave="pcsx2_ee_cycle_rate"]')).toBeVisible();
  // apagar os ajustes volta ao perfil geral
  await page.click('#emu-limpar');
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Mild Underclock');
  await expect(page.locator('#emu-limpar')).toHaveCount(0);
});

test('a escolha fica guardada na configuração e volta depois de recarregar', async ({ page }) => {
  await abrirOpcoes(page);
  await page.selectOption('#emu-console-sis', 'ps1');
  await page.selectOption('#emu-perfil', 'fiel');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('kofstation-teste.config') ?? ''), { timeout: 10_000 })
    .toContain('emuOpcoes');
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await abrirOpcoes(page);
  await page.selectOption('#emu-console-sis', 'ps1');
  await expect(page.locator('#emu-perfil')).toHaveValue('fiel');
});
