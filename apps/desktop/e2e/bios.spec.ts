// M11: tela de BIOS, Neo Geo pedindo o neogeo.zip, PS1 e N64 abrindo nos núcleos do antigo (no Worker).
import { expect, test, type Page } from '@playwright/test';
import { exePs1, romN64QueDesenha } from './roms';

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
  // o cartão do Início diz quais estão guardadas
  await page.keyboard.press('Home');
  await expect(page.locator('#hm-bios')).toHaveText('✅ GBA · trocar ou guardar outra');
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

/** Cor do pixel da tela do jogo na fração (fx, fy) da imagem. */
const corDaTela = (page: Page, fx: number, fy: number) =>
  page.evaluate(
    ([fx, fy]) => {
      const t = document.querySelector<HTMLCanvasElement>('#tela');
      if (!t) return [0, 0, 0];
      const c = document.createElement('canvas');
      c.width = t.width;
      c.height = t.height;
      const g = c.getContext('2d');
      if (!g) return [0, 0, 0];
      g.drawImage(t, 0, 0);
      return [...g.getImageData(Math.floor(t.width * (fx ?? 0)), Math.floor(t.height * (fy ?? 0)), 1, 1).data];
    },
    [fx, fy],
  );
const vermelho = ([r = 0, g = 0, b = 0]: number[]) => r > 180 && g < 60 && b < 60;
const verde = ([r = 0, g = 0, b = 0]: number[]) => g > 180 && r < 60 && b < 60;

test('PlayStation (wasm): um PS-X EXE que desenha abre no PCSX (sem BIOS) e a imagem confere', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'Teste.exe', mimeType: 'application/octet-stream', buffer: exePs1() });
  await expect(page.locator('#st-jogo')).toHaveText('Teste', { timeout: 20_000 });
  await expect(page.locator('#st-fps')).toContainText('fps', { timeout: 10_000 });
  await expect.poll(async () => vermelho(await corDaTela(page, 0.8, 0.8)), { timeout: 15_000 }).toBe(true);
  expect(verde(await corDaTela(page, 48 / 320, 32 / 240))).toBe(true);
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/ps1-wasm.png` });
});

test('Nintendo 64: uma ROM que boota de verdade desenha na tela (vermelho com retângulo verde)', async ({ page }) => {
  const log: string[] = [];
  page.on('console', (m) => log.push(m.text()));
  await page.setInputFiles('#arquivo', {
    name: 'Desenha.z64',
    mimeType: 'application/octet-stream',
    buffer: romN64QueDesenha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Desenha', { timeout: 30_000 });
  const cor = (fx: number, fy: number) =>
    page.evaluate(
      ([fx, fy]) => {
        const t = document.querySelector<HTMLCanvasElement>('#tela');
        if (!t) return [0, 0, 0];
        const c = document.createElement('canvas');
        c.width = t.width;
        c.height = t.height;
        const g = c.getContext('2d');
        if (!g) return [0, 0, 0];
        g.drawImage(t, 0, 0);
        return [...g.getImageData(Math.floor(t.width * (fx ?? 0)), Math.floor(t.height * (fy ?? 0)), 1, 1).data];
      },
      [fx, fy],
    );
  await expect
    .poll(
      async () => {
        const [r = 0, g = 0, b = 0] = await cor(0.8, 0.8);
        return r > 180 && g < 60 && b < 60;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  const [r = 0, g = 0, b = 0] = await cor(48 / 320, 32 / 240);
  expect(g > 180 && r < 60 && b < 60, `verde no retângulo (veio ${r},${g},${b}) · ${log.slice(-5).join(' | ')}`).toBe(
    true,
  );
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/n64-desenha.png` });
});
