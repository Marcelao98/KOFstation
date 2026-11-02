// M11: tela de BIOS, Neo Geo pedindo o neogeo.zip, PS1 e N64 abrindo nos núcleos do antigo (no Worker).
import { expect, test } from '@playwright/test';
import { exePs1, romN64 } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('tela de BIOS: guarda a do GBA pelo botão e mostra ✅', async ({ page }) => {
  await page.locator('#home [data-acao="bios-tela"]').first().click();
  await expect(page.locator('#bios-tela')).toBeVisible();
  await expect(page.locator('#bios-lista li')).toHaveCount(4);
  const escolha = page.waitForEvent('filechooser');
  await page.locator('[data-acao="bios:gba"]').click();
  await (
    await escolha
  ).setFiles({ name: 'gba_bios.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(16384) });
  await expect(page.locator('#bios-lista li.tem')).toContainText('gba_bios.bin');
});

test('Neo Geo sem o neogeo.zip: pede a BIOS; com ela, tenta abrir no FBNeo', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'mslug.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('PK\x05\x06' + '\0'.repeat(18), 'latin1'),
  });
  await expect(page.locator('#bios-tela')).toBeVisible();
  await expect(page.locator('#bios-titulo')).toContainText('Neo Geo');
  const escolha = page.waitForEvent('filechooser');
  await page.locator('[data-acao="bios:neogeo"]').click();
  await (
    await escolha
  ).setFiles({
    name: 'neogeo.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('PK\x05\x06' + '\0'.repeat(18), 'latin1'),
  });
  // o zip de teste é vazio: o FBNeo carrega no Worker e diz que não abriu (e a tela de BIOS fecha)
  await expect(page.locator('#aviso')).toContainText('não abriu esse jogo', { timeout: 20_000 });
  await expect(page.locator('#bios-tela')).toHaveCount(0);
});

test('PlayStation: um PS-X EXE abre no PCSX (sem BIOS) e roda', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'Teste.exe', mimeType: 'application/octet-stream', buffer: exePs1() });
  await expect(page.locator('#st-jogo')).toHaveText('Teste', { timeout: 20_000 });
  await expect(page.locator('#st-fps')).toContainText('fps', { timeout: 10_000 });
});

test('Nintendo 64: o Mupen64Plus abre com WebGL2 dentro do Worker', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'Teste.z64', mimeType: 'application/octet-stream', buffer: romN64() });
  await expect(page.locator('#st-jogo')).toHaveText('Teste', { timeout: 30_000 });
  await expect(page.locator('#st-fps')).toContainText('fps', { timeout: 15_000 });
});
