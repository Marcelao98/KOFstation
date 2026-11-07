// M10: estatísticas e espaço usado, caçador de bugs (F9) e patch de tradução.
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

const abrirGb = async (page: import('@playwright/test').Page) => {
  await page.setInputFiles('#arquivo', { name: 'Som.gb', mimeType: 'application/octet-stream', buffer: romGbSom() });
  await expect(page.locator('#st-jogo')).toHaveText('Som');
};

test('estatísticas: a sessão e o jogo aparecem; Espaço usado lista as lojas', async ({ page }) => {
  await abrirGb(page);
  await page.waitForTimeout(1500);
  await page.locator('#lateral [data-acao="estatisticas"]').click();
  await expect(page.locator('#estatisticas')).toBeVisible();
  await expect(page.locator('.est-caixa', { hasText: 'Sessões' }).locator('b')).toHaveText('1');
  await expect(page.locator('.est-tab tr', { hasText: 'Som' })).toHaveCount(1);
  await page.locator('[data-acao="espaco"]').click();
  await expect(page.locator('#est-espaco')).toContainText('Biblioteca e prints');
});

test('F9 abre o Reportar bug com o pacote marcado; Esc fecha e o jogo volta', async ({ page }) => {
  await abrirGb(page);
  await page.keyboard.press('F9');
  await expect(page.locator('#bug')).toBeVisible();
  await expect(page.locator('#bug-pacote')).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bug')).toHaveCount(0);
});

test('patch IPS no jogo aberto: abre o traduzido e marca 🇧🇷 na biblioteca', async ({ page }) => {
  await abrirGb(page);
  const ips = Buffer.from([...Buffer.from('PATCH'), 0x00, 0x01, 0x40, 0x00, 0x01, 0x41, ...Buffer.from('EOF')]);
  await page.setInputFiles('#arquivo', { name: 'pt-br.ips', mimeType: 'application/octet-stream', buffer: ips });
  await expect(page.locator('#aviso')).toContainText('tradução aplicada', { timeout: 10_000 });
  await expect(page.locator('#st-jogo')).toHaveText('Som (tradução)');
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await expect(page.locator('.sis-tag', { hasText: '🇧🇷' })).toHaveCount(1, { timeout: 10_000 });
});

test('🔄 Procurar atualização: pergunta ao backend e diz por que está desligado (rodando do código)', async ({ page }) => {
  await page.locator('#menu .m', { has: page.locator('[data-acao="atualizacao"]') }).locator('> button').click();
  await page.locator('#menu .m.aberto [data-acao="atualizacao"]').click();
  await expect(page.locator('#aviso')).toContainText('atualizador desligado: rodando do código');
});
