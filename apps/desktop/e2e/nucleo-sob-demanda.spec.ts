// T.1: o núcleo de um console só é baixado quando um jogo daquele console abre (como o antigo).
import { expect, test } from '@playwright/test';
import { romGbComSave, romVermelha } from './roms';

test('nenhum núcleo no Início; abrir um jogo de GB traz só o Gambatte; um de MD traz só o Genesis Plus', async ({
  page,
}) => {
  const nucleos: string[] = [];
  page.on('request', (r) => {
    const m = /\/nucleos\/([a-z0-9]+)(?:-[0-9a-f]{8})?\.js/.exec(r.url());
    if (m?.[1] && !['jogos', 'trilha', 'somfm', 'violino'].includes(m[1])) nucleos.push(m[1]);
  });
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await page.waitForTimeout(800);
  expect(nucleos).toEqual([]);
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  expect([...new Set(nucleos)]).toEqual(['gambatte']);
  await page.setInputFiles('#arquivo', {
    name: 'Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  expect([...new Set(nucleos)].sort()).toEqual(['gambatte', 'genplus']);
});
