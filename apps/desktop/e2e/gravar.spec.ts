// G.1: F10 grava o jogo (imagem como o jogador vê + som) e salva em <Kof Games>/Gravações; o vídeo abre num <video>.
import { expect, test } from '@playwright/test';
import { romGbSom } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  await page.evaluate(() => {
    (globalThis as unknown as { __kofTeste: { raiz: string } }).__kofTeste.raiz = '/home/teste/Kof Games';
  });
});
test.afterEach(() => expect(erros).toEqual([]));

test('F10 grava, o selo ⏺ conta o tempo, F10 de novo salva um vídeo que abre', async ({ page }) => {
  await page.setInputFiles('#arquivo', { name: 'Som.gb', mimeType: 'application/octet-stream', buffer: romGbSom() });
  await expect(page.locator('#st-jogo')).toHaveText('Som');
  await page.waitForTimeout(400);
  await page.keyboard.press('F10');
  await expect(page.locator('#gravando')).toBeVisible();
  await expect.poll(() => page.locator('#gravando').textContent(), { timeout: 5000 }).toMatch(/⏺ 0:0[2-9]/);
  await page.keyboard.press('F10');
  await expect(page.locator('#aviso')).toContainText('Gravação salva', { timeout: 10000 });
  await expect(page.locator('#gravando')).toHaveCount(0);

  const r = await page.evaluate(async () => {
    const t = (globalThis as unknown as { __kofTeste: { arquivos: Map<string, Uint8Array> } }).__kofTeste;
    const nomes = [...t.arquivos.keys()].filter((k) => k.startsWith('Gravações/'));
    const nome = nomes[0] ?? '';
    const d = t.arquivos.get(nome) ?? new Uint8Array();
    const tipo = nome.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    const v = document.createElement('video');
    v.muted = true;
    v.src = URL.createObjectURL(new Blob([d as Uint8Array<ArrayBuffer>], { type: tipo }));
    const ok = await new Promise<boolean>((res) => {
      v.onloadedmetadata = () => res(true);
      v.onerror = () => res(false);
      setTimeout(() => res(false), 5000);
    });
    // o som entrou: a trilha de áudio aparece no cabeçalho (MP4: caixa mp4a/Opus; WebM: A_OPUS)
    const cabeca = new TextDecoder('latin1').decode(d.subarray(0, 4096));
    const som = /mp4a|Opus|A_OPUS/.test(cabeca);
    return { nomes, tamanho: d.length, abriu: ok, w: v.videoWidth, h: v.videoHeight, som };
  });
  expect(r.nomes).toHaveLength(1);
  expect(r.nomes[0]).toMatch(/^Gravações\/Som \d{4}-\d\d-\d\d \d\d-\d\d-\d\d\.(mp4|webm)$/);
  expect(r.tamanho).toBeGreaterThan(1000);
  expect(r.abriu).toBe(true);
  expect(r.h).toBe(1080);
  expect(r.som).toBe(true);
  expect(r.w % 2).toBe(0);
});

test('sem pasta Kof Games: avisa o erro e não fica gravando', async ({ page }) => {
  await page.evaluate(() => {
    (globalThis as unknown as { __kofTeste: { raiz: string | null } }).__kofTeste.raiz = null;
  });
  await page.setInputFiles('#arquivo', { name: 'Som.gb', mimeType: 'application/octet-stream', buffer: romGbSom() });
  await expect(page.locator('#st-jogo')).toHaveText('Som');
  await page.keyboard.press('F10');
  // o erro sai no 1º pedaço que tenta salvar (1 s de vídeo; com a máquina cheia o gravador atrasa)
  await expect(page.locator('#aviso.erro')).toContainText('não consegui salvar', { timeout: 20000 });
  await expect(page.locator('#gravando')).toHaveCount(0);
});
