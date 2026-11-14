// M7: painel de imagem (F4): Simples com prévia, Avançado, ⭐ meu jeito, .kofvisual (o formato do antigo) e lembrar
// por console.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

test('F4 sem jogo: cartela, cartões com prévia, escolher, Avançado e voltar ao original', async ({ page }) => {
  test.setTimeout(60_000);
  // a tecla pode chegar antes do App ligar os atalhos (já falhou no CI com a máquina cheia): repete até o painel abrir
  await expect(async () => {
    if (!(await page.locator('#visual').isVisible())) await page.keyboard.press('F4');
    await expect(page.locator('#visual')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20_000, intervals: [500] });
  await expect(page.locator('body')).toHaveClass(/com-visual/);
  await expect(page.locator('#vis-pre .vis-card')).toHaveCount(42);
  await page.click('[data-vis-cat="TV de tubo"]');
  await expect(page.locator('#vis-pre .vis-card')).toHaveCount(7);
  await page.click('[data-vis-pre="tv"]');
  await expect(page.locator('#vis-nome')).toHaveText('· TV de tubo da sala');
  await expect(page.locator('#vis-custo')).toContainText(/leve|médio|pesado/);
  // a prévia do cartão tem imagem (não é tudo preto)
  const temImagem = await page
    .locator('#vis-pre .vis-card canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? [];
      for (let i = 0; i < d.length; i += 4) if ((d[i] ?? 0) + (d[i + 1] ?? 0) + (d[i + 2] ?? 0) > 30) return true;
      return false;
    });
  expect(temImagem).toBe(true);
  await page.click('[data-vis-modo="avancado"]');
  await page.fill('#vis-busca', 'ntsc');
  await expect(page.locator('#vis-ajustes .vis-aj').first()).toBeVisible({ timeout: 15_000 });
  await page.fill('#vis-busca', '');
  await page.click('[data-vis-grupo="*"]');
  await expect(page.locator('#vis-ajustes .vis-aj.mudou').first()).toBeVisible({ timeout: 15_000 });
  await page.click('[data-acao="vis-zerar"]');
  await expect(page.locator('#vis-nome')).toHaveText('· Original');
  await page.keyboard.press('F4');
  await expect(page.locator('#visual')).toBeHidden();
});

test('⭐ meu jeito, exportar e importar .kofvisual (formato do antigo), lembrar por console', async ({ page }) => {
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await page.keyboard.press('F4');
  await page.check('#vis-porsis');
  await page.click('[data-vis-pre="gameboy"]');
  page.once('dialog', (d) => void d.accept('Minha TV'));
  await page.click('[data-acao="vis-salvar"]');
  await expect(page.locator('#vis-nome')).toHaveText('· ⭐ Minha TV');
  const baixando = page.waitForEvent('download');
  await page.click('[data-acao="vis-exportar"]');
  const d = await baixando;
  expect(d.suggestedFilename()).toBe('Minha-TV.kofvisual');
  const o = JSON.parse(readFileSync((await d.path()) as string, 'utf8')) as {
    kofvisual: number;
    nome: string;
    v: Record<string, number>;
  };
  expect(o).toMatchObject({ kofvisual: 1, nome: 'Minha TV' });
  expect(o.v.verde).toBe(1);
  // um estilo vindo do antigo
  const escolha = page.waitForEvent('filechooser');
  await page.click('[data-acao="vis-importar"]');
  await (
    await escolha
  ).setFiles({
    name: 'amigo.kofvisual',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ kofvisual: 1, nome: 'Do Amigo', v: { linhas: 0.8, pixel: 0 } })),
  });
  await expect(page.locator('#aviso')).toContainText('estilo "Do Amigo" importado');
  await expect(page.locator('#vis-pre .vis-card[data-vis-meu]')).toHaveCount(2);
  // fecha e reabre o jogo: volta com o jeito guardado pro Mega Drive
  await page.keyboard.press('F4');
  await page.click('#menu >> text=Imagem');
  await page.click('#menu [data-acao="filtro"][data-v="original"], #menu >> text=Filtro: Original');
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  await page.keyboard.press('F4');
  await expect(page.locator('#vis-nome')).toHaveText('· ⭐ Do Amigo');
});
