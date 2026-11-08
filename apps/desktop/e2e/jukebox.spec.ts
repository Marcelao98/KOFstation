// M9: F7 guarda a música do jogo; a jukebox toca numa instância separada do núcleo, com as ondas de cada canal.
import { expect, test } from '@playwright/test';
import { romGbSom, spcDeTeste } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

/** Quanto do canvas está pintado (0 = vazio). */
const pintado = (sel: string) =>
  `(() => { const c = document.querySelector('${sel}'); const g = c && c.getContext('2d');
     if (!g || !c.width) return 0; const d = g.getImageData(0, 0, c.width, c.height).data;
     let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })()`;

test('F7 guarda, a jukebox toca com ondas, Mudo/Solo e a trilha do KOFstation na lista', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'Som.gb', mimeType: 'application/octet-stream', buffer: romGbSom() });
  await expect(page.locator('#st-jogo')).toHaveText('Som');
  await page.waitForTimeout(400);
  await page.keyboard.press('F7');
  await expect(page.locator('#aviso')).toContainText('música guardada');
  await page.locator('#lateral [data-acao="jukebox"]').click();
  await expect(page.locator('#jukebox')).toBeVisible();
  await expect(page.locator('.jk-grupo').first()).toHaveText('🎵 Trilha do KOFstation');
  await expect(page.locator('.jk-faixa', { hasText: 'Se Essa Rua' })).toHaveCount(1);
  await page.locator('.jk-faixa', { hasText: 'Faixa 1' }).click();
  await expect(page.locator('#jk-titulo')).toHaveText('Faixa 1');
  await expect(page.locator('#jk-vozes .jk-voz')).toHaveCount(4); // os 4 canais do Game Boy
  await page.locator('[data-acao="jk-vista-ondas"]').click();
  await expect(page.locator('#jk-ondas .jk-canal')).toHaveCount(4);
  await expect.poll(() => page.evaluate(pintado('#jk-ondas .jk-canal canvas')), { timeout: 5000 }).toBeGreaterThan(0);
  await page.locator('#jk-ondas .jk-canal').first().locator('[data-m="solo"]').click();
  await expect(page.locator('#jk-ondas .jk-canal.apagado')).toHaveCount(3);
  // o tempo anda (o Worker está gerando som de verdade)
  await expect(page.locator('#jk-tempo')).toContainText('/ 3:08');
  await expect.poll(() => page.locator('#jk-tempo').textContent(), { timeout: 5000 }).toMatch(/^0:0[1-9]/);
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/jukebox-ondas.png` });
  // a trilha do KOFstation toca no núcleo só de som (10 canais)
  await page.locator('.jk-faixa', { hasText: 'Se Essa Rua' }).click();
  await expect(page.locator('#jk-ondas .jk-canal')).toHaveCount(10);
  await expect.poll(() => page.evaluate(pintado('#jk-ondas .jk-canal canvas')), { timeout: 5000 }).toBeGreaterThan(0);
  await page.locator('[data-acao="jk-vista-notas"]').click();
  await page.waitForTimeout(1500);
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/jukebox-notas.png` });
});

test('SNES: .spc com as 8 vozes nas Ondas (Snes9x com sonda), Notas e Capa', async ({ page }) => {
  await page.locator('#lateral [data-acao="jukebox"]').click();
  await expect(page.locator('#jukebox')).toBeVisible();
  await page.setInputFiles('#arquivo-spc', {
    name: 'Quadrada.spc',
    mimeType: 'application/octet-stream',
    buffer: spcDeTeste(),
  });
  await page.locator('.jk-faixa', { hasText: 'Quadrada' }).click();
  await expect(page.locator('#jk-titulo')).toHaveText('Quadrada');
  await expect(page.locator('#jk-vozes .jk-voz')).toHaveCount(8);
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/jukebox-snes-capa.png` });
  await page.locator('[data-acao="jk-vista-ondas"]').click();
  await expect(page.locator('#jk-ondas .jk-canal')).toHaveCount(8);
  // a voz 1 soa (quadrada): o canvas dela é pintado; o aviso "sem ondas" não aparece
  await expect.poll(() => page.evaluate(pintado('#jk-ondas .jk-canal canvas')), { timeout: 5000 }).toBeGreaterThan(0);
  await expect(page.locator('#jukebox')).not.toContainText('não entrega a onda');
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/jukebox-snes-ondas.png` });
  await page.locator('[data-acao="jk-vista-notas"]').click();
  await page.waitForTimeout(1500);
  if (process.env.KOF_PRINTS) await page.screenshot({ path: `${process.env.KOF_PRINTS}/jukebox-snes-notas.png` });
});
