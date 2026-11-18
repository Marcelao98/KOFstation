// M16.3: modo diagnóstico. Liga pela Ajuda, grava o jogo aberto (quadro a quadro, segundos, engasgos), fecha com o
// resumo quando troca de jogo e exporta o .zip (o backend de teste guarda em memória e não comprime: dá pra ler).
import { expect, test } from '@playwright/test';
import { romGbSom } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

const abrirGb = async (page: import('@playwright/test').Page, nome: string) => {
  await page.setInputFiles('#arquivo', {
    name: `${nome}.gb`,
    mimeType: 'application/octet-stream',
    buffer: romGbSom(),
  });
  await expect(page.locator('#st-jogo')).toHaveText(nome);
};

const abrirJanela = async (page: import('@playwright/test').Page) => {
  await page
    .locator('#menu .m', { has: page.locator('[data-acao="diagnostico"]') })
    .locator('> button')
    .click();
  await page.locator('#menu .m.aberto [data-acao="diagnostico"]').click();
  await expect(page.locator('#diagnostico')).toBeVisible();
};

test('🩺 liga, grava o jogo, resume ao trocar e exporta o .zip', async ({ page }) => {
  await abrirJanela(page);
  await expect(page.locator('#diag-lista')).toContainText('nenhuma sessão');
  await page.locator('#diag-ligado').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('#diagnostico')).toHaveCount(0);
  await expect(page.locator('#st-diag')).toBeVisible();

  await abrirGb(page, 'Som');
  await page.waitForTimeout(3500);
  await abrirGb(page, 'Outro'); // trocar de jogo fecha a sessão do anterior com o resumo
  await expect(page.locator('#aviso')).toContainText('Tempo jogado', { timeout: 10_000 });

  await abrirJanela(page);
  const sessoes = page.locator('.diag-sessao');
  await expect(sessoes).toHaveCount(2);
  // a fechada (a do 1º jogo) tem o resumo; o nome usa o título interno do jogo (KOFSOM)
  const velha = sessoes.filter({ hasText: 'Tempo jogado' });
  await expect(velha).toContainText('_KOFSOM');
  await expect(velha).toContainText('Engasgos:');
  await velha.locator('input').check();
  const baixando = page.waitForEvent('download');
  await page.locator('#diag-exportar').click();
  const d = await baixando;
  expect(d.suggestedFilename()).toMatch(/^kofdiagnostico-\d{12}\.zip$/);
  const zip = await (await import('node:fs/promises')).readFile(await d.path());
  expect(zip.subarray(0, 2).toString()).toBe('PK');
  const texto = zip.toString('utf8');
  expect(texto).toContain('t_ms,intervalo_ms,nucleo_ms,leitura_ms,envio_ms,pagina_ms,som_fila_ms,faltas');
  expect(texto).toContain('t_s,fps,p50_ms,p95_ms,p99_ms,max_ms,engasgos');
  expect(texto).toContain('"formato": "kof-diagnostico"');
  expect(texto).toContain('Diagnóstico do KOFstation · KOFSOM');
  // uns 3 s a ~60 fps: bem mais de 100 linhas de quadro
  const linhasDeQuadro = texto
    .split('\n')
    .filter((l) => /^\d+(\.\d+)?,\d+(\.\d+)?,\d/.test(l) && l.split(',').length === 8);
  expect(linhasDeQuadro.length).toBeGreaterThan(100);
});
