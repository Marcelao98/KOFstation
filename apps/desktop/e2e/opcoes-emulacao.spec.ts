// M16.4 + tarefa E: a tela ⚙ Opções de emulação (Geral e uma aba por console, seções como no PCSX2, perfis em botão,
// busca), "vale na hora" × "ao reabrir".
import { expect, test } from '@playwright/test';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

async function abrirOpcoes(page: import('@playwright/test').Page, sis = 'geral') {
  await page.keyboard.press('F2');
  await page.click('#menu >> text=Emulação');
  await page.click('#menu [data-acao="emu-opcoes"]');
  await expect(page.locator('#emulacao')).toBeVisible();
  await page.click(`#emu-abas [data-sis="${sis}"]`);
}

test('tela própria: Geral com o perfil de todos os consoles e as opções do app', async ({ page }) => {
  await abrirOpcoes(page);
  await expect(page.locator('#emu-perfil-geral')).toHaveValue('equilibrado');
  await expect(page.locator('#emu-modo')).toBeVisible();
  await page.click('#emu-perfis-geral [data-perfil="bonito"]');
  await expect(page.locator('#emu-perfil-geral')).toHaveValue('bonito');
});

test('PS2: perfis, ajuste fino, seções como no PCSX2, mais opções, busca e as fixas', async ({ page }) => {
  await abrirOpcoes(page, 'ps2');
  // Equilibrado = o que o app sempre usou
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toBeHidden(); // fica na seção Emulação
  await page.click('#emu-secoes [data-secao="emulacao"]');
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Mild Underclock');
  // o perfil Rápido do console muda as opções
  await page.click('#emu-perfis [data-perfil="rapido"]');
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Moderate Underclock');
  // ajuste fino só dela, com o rótulo de quando vale
  const linha = page.locator('[data-chave="pcsx2_ee_cycle_skip"]');
  await expect(linha).toContainText('vale na hora');
  await page.selectOption('#emuc-pcsx2_ee_cycle_skip', 'disabled');
  await expect(linha).toContainText('voltar ao perfil');
  await expect(page.locator('[data-chave="pcsx2_mtvu"]')).toContainText('vale ao reabrir');
  // o resto que o núcleo oferece aparece na seção dele, depois das principais
  await expect(page.locator('#emu-secao-emulacao [data-chave="pcsx2_ee_cycle_rate"]')).toBeVisible();
  await page.click('#emu-secoes [data-secao="correcoes"]');
  await expect(page.locator('[data-chave="pcsx2_enable_hw_hacks"]')).toContainText('⚠');
  await page.click('#emu-secoes [data-secao="controle"]');
  await expect(page.locator('[data-chave="pcsx2_axis_deadzone1"]')).toBeVisible();
  await page.click('#emu-secoes [data-secao="sistema"]');
  await expect(page.locator('#emu-fixas [data-chave="pcsx2_renderer"]')).toContainText('OpenGL');
  // a busca procura em todas as seções, sem acento
  await page.fill('#emu-busca', 'vibracao');
  await expect(page.locator('#emu-resultado [data-chave="pcsx2_enable_rumble1"]')).toBeVisible();
  await page.fill('#emu-busca', '');
  // apagar os ajustes volta ao perfil geral
  await page.click('#emu-limpar');
  await page.click('#emu-secoes [data-secao="emulacao"]');
  await expect(page.locator('#emuc-pcsx2_ee_cycle_skip')).toHaveValue('Mild Underclock');
  await expect(page.locator('#emu-limpar')).toHaveCount(0);
});

test('a escolha fica guardada na configuração e volta depois de recarregar', async ({ page }) => {
  await abrirOpcoes(page, 'ps1');
  await page.click('#emu-perfis [data-perfil="fiel"]');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('kofstation-teste.config') ?? ''), { timeout: 10_000 })
    .toContain('emuOpcoes');
  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await abrirOpcoes(page, 'ps1');
  await expect(page.locator('#emu-perfil')).toHaveValue('fiel');
});

test('Wii (o Dolphin): perfis, o ponteiro no mouse, o Nunchuk e as fixas', async ({ page }) => {
  await abrirOpcoes(page, 'wii');
  await page.click('#emu-secoes [data-secao="graficos"]');
  await expect(page.locator('#emuc-dolphin_efb_scale')).toHaveValue('1');
  await page.click('#emu-perfis [data-perfil="bonito"]');
  await expect(page.locator('#emuc-dolphin_efb_scale')).toHaveValue('2');
  await expect(page.locator('#emuc-dolphin_shader_compilation_mode')).toHaveValue('2');
  await page.click('#emu-secoes [data-secao="controle"]');
  await expect(page.locator('#emuc-dolphin_ir_mode')).toHaveValue('2');
  await expect(page.locator('#emuc-dolphin_wiimote_default_device')).toHaveValue('nunchuk');
  await page.click('#emu-secoes [data-secao="sistema"]');
  await expect(page.locator('#emu-fixas [data-chave="dolphin_renderer"]')).toContainText('OpenGL');
});
