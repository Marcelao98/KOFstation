// M3: biblioteca e pasta Kof Games (com o backend de teste: a Kof Games é de mentira, na memória da página).
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

/** Põe arquivos na Kof Games falsa (caminho → bytes). */
async function porArquivos(page: Page, arquivos: Record<string, number[]>) {
  await page.evaluate((a) => {
    const t = (globalThis as unknown as { __kofTeste: { arquivos: Map<string, Uint8Array> } }).__kofTeste;
    for (const [k, v] of Object.entries(a)) t.arquivos.set(k, new Uint8Array(v));
  }, arquivos);
}

test('escolhe a pasta, mostra o plano, organiza e joga da lista', async ({ page }) => {
  const rom = [...romVermelha()];
  await porArquivos(page, {
    'Novos/Vermelho.md': rom,
    'Games/snes/leia-me.txt': [1],
    'Games/gba/Errado [h1].sfc': [1, 2, 3],
  });
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await expect(page.locator('#lista-vazia')).toContainText('pasta Kof Games');
  await page.click('.bib-rodape [data-acao="pasta"]');
  await page.fill('#pasta-caminho', '/home/teste/Games');
  await page.click('#pasta-tela button[type="submit"]');
  await expect(page.locator('#aviso')).toContainText('pasta de dentro');
  await page.fill('#pasta-caminho', '/home/teste/Kof Games');
  await page.click('#pasta-tela button[type="submit"]');
  await expect(page.locator('#organizar-lista li')).toHaveCount(2);
  await expect(page.locator('#organizar-lista')).toContainText('Novos/Vermelho.md');
  await page.click('[data-acao="organizar-aplicar"]');
  // a variante [h1] some com "Só os principais"; aparece quando desliga
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#roms li').first()).toContainText('Vermelho');
  await page.click('[data-acao="so-principais"]');
  await expect(page.locator('#roms li')).toHaveCount(2);
  const lugar = await page.evaluate(() =>
    [
      ...(globalThis as unknown as { __kofTeste: { arquivos: Map<string, Uint8Array> } }).__kofTeste.arquivos.keys(),
    ].sort(),
  );
  expect(lugar).toEqual(['Games/megadrive/Vermelho.md', 'Games/snes/Errado [h1].sfc', 'Games/snes/leia-me.txt']);
  // digitar procura; Enter joga
  await page.keyboard.type('verm');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('#st-jogo')).toHaveText('Vermelho');
  // depois de jogar ele vira um jogo da biblioteca (★)
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li.sel .li-ext')).toHaveText('★');
  await expect(page.locator('#info-det')).toContainText('Mega Drive · jogado');
});

test('jogo aberto de fora ganha uma cópia na Kof Games e fica na biblioteca', async ({ page }) => {
  await page.evaluate(() => {
    (globalThis as unknown as { __kofTeste: { raiz: string } }).__kofTeste.raiz = '/home/teste/Kof Games';
  });
  await page.setInputFiles('#arquivo', {
    name: 'Fora.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Fora');
  await expect(page.locator('#aviso')).toContainText('guardado em Kof Games/Games/megadrive');
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#roms li').first()).toContainText('Fora');
});

test('busca com a base de jogos: campo:valor, facetas com contagem e ficha com botõezinhos', async ({ page }) => {
  await page.evaluate(() => {
    const t = (globalThis as unknown as { __kofTeste: { raiz: string; arquivos: Map<string, Uint8Array> } }).__kofTeste;
    t.raiz = '/home/teste/Kof Games';
    for (const n of ['Super Mario World (USA)', 'Chrono Trigger (USA)', 'Donkey Kong Country (USA)'])
      t.arquivos.set(`Games/snes/${n}.sfc`, new Uint8Array(4));
  });
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li')).toHaveCount(3);
  await expect(page.locator('#bib-filtros')).toBeVisible();
  await page.fill('#filtro', 'empresa:square');
  await expect(page.locator('#roms li')).toHaveCount(1);
  await expect(page.locator('#roms li').first()).toContainText('Chrono Trigger');
  await page.fill('#filtro', '');
  await expect(page.locator('#roms li')).toHaveCount(3);
  await page.click('[data-faceta="empresa"]');
  await expect(page.locator('#bib-pop button[data-v="Nintendo"] small')).toHaveText('2');
  await page.click('#bib-pop button[data-v="Nintendo"]');
  await expect(page.locator('#roms li')).toHaveCount(2);
  await expect(page.locator('[data-faceta="empresa"]')).toContainText('Empresa: Nintendo ✕');
  await page.click('[data-faceta="empresa"]');
  await expect(page.locator('#roms li')).toHaveCount(3);
  // ordem por nome
  await page.click('[data-faceta="ordem"]');
  await page.click('#bib-pop button[data-v="nome"]');
  await expect(page.locator('#roms li').first()).toContainText('Chrono');
  // ficha: os botõezinhos filtram
  await expect(page.locator('#info-meta .chip').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#biblioteca')).toBeHidden();
});

test('capa oficial na ficha e modo sofá com a grade de capas', async ({ page }) => {
  await page.evaluate(async () => {
    const t = (
      globalThis as unknown as {
        __kofTeste: { raiz: string; arquivos: Map<string, Uint8Array>; capas: Map<string, Uint8Array> };
      }
    ).__kofTeste;
    t.raiz = '/home/teste/Kof Games';
    t.arquivos.set('Games/snes/Jogo Azul (USA).sfc', new Uint8Array(4));
    t.arquivos.set('Games/snes/Sem Capa (USA).sfc', new Uint8Array(4));
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#00f';
      g.fillRect(0, 0, 8, 8);
    }
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'));
    t.capas.set('Jogo Azul (USA)', new Uint8Array(await (blob as Blob).arrayBuffer()));
  });
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#roms li')).toHaveCount(2);
  await expect(page.locator('#capa-img.oficial')).toBeVisible();
  await page.locator('#roms li').nth(1).click();
  await expect(page.locator('#info-nome')).toHaveText('Sem Capa (USA)');
  await expect(page.locator('#capa-img')).toBeHidden();
  await expect(page.locator('#capa-vazia')).toBeVisible();
  await page.click('#biblioteca [data-acao="sofa"]');
  await expect(page.locator('body')).toHaveClass(/sofa/);
  await expect(page.locator('#roms li .mini img')).toHaveCount(1);
  await page.click('#biblioteca [data-acao="capas"]');
  await expect(page.locator('#roms li .mini img')).toHaveCount(0);
});
