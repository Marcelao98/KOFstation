// M7: os filtros do painel de imagem dão OS MESMOS PIXELS do app antigo, nas 42 predefinições. Abre o KOFstation.html
// publicado do antigo (KOF_ANTIGO=<pasta do kofstation-old>) e o app novo lado a lado, com a mesma imagem de teste e o
// relógio parado (efeitos animados ficam iguais), e compara o canvas inteiro.
import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const antigo = process.env.KOF_ANTIGO ?? '';
const html = join(antigo, 'publicado/KOFstation.html');

function imagem(): number[] {
  const l = 256;
  const a = 224;
  const rgba: number[] = [];
  for (let y = 0; y < a; y++)
    for (let x = 0; x < l; x++) {
      const xadrez = ((x >> 3) ^ (y >> 3)) & 1;
      const diag = Math.abs(x - y * 1.1) < 6;
      rgba.push(diag ? 255 : (x * 3) & 255, (y * 5) & 255, xadrez ? 230 : 40, 255);
    }
  return rgba;
}

const parar = () => {
  performance.now = () => 1234.5;
};

async function abrirAntigo(page: Page) {
  await page.addInitScript(parar);
  await page.goto('file://' + html);
  await page.waitForFunction(() => typeof (window as unknown as { KOFnes?: unknown }).KOFnes === 'object');
  return page.evaluate((rgba) => {
    const K = (window as unknown as { KOFnes: { imagemTeste(r: number[], l: number, a: number): void } }).KOFnes;
    K.imagemTeste(rgba, 256, 224);
    const t = document.getElementById('tela') as HTMLCanvasElement;
    return [t.width, t.height];
  }, imagem());
}

async function abrirNovo(page: Page) {
  await page.addInitScript(parar);
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  return page.evaluate(
    (rgba) =>
      (
        globalThis as unknown as {
          __kofTeste: { visual: { imagemTeste(r: number[], l: number, a: number): number[] } };
        }
      ).__kofTeste.visual.imagemTeste(rgba, 256, 224),
    imagem(),
  );
}

test.skip(!antigo || !existsSync(html), 'precisa do app antigo (KOF_ANTIGO)');

test('mesmos pixels do antigo nas 42 predefinições', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const outra = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const tamAntigo = await abrirAntigo(outra);
  const tamNovo = await abrirNovo(page);
  expect(tamNovo).toEqual(tamAntigo);
  const ids = await page.evaluate(() =>
    (globalThis as unknown as { __kofTeste: { visual: { ids(): string[] } } }).__kofTeste.visual.ids(),
  );
  expect(ids).toHaveLength(42);
  const diferentes: string[] = [];
  const vistos = new Set<number>();
  for (const id of ids) {
    const deLa = await outra.evaluate((pre) => {
      const K = (window as unknown as { KOFnes: { aplicarVisual(v: unknown, p: string): void } }).KOFnes;
      const V = (0, eval)('KofVisual') as { valores(p: string): unknown }; // const do script do antigo (não é window.)
      K.aplicarVisual(V.valores(pre), pre);
      const gl = (document.getElementById('tela') as HTMLCanvasElement).getContext('webgl') as WebGLRenderingContext;
      const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let h = 0;
      for (let i = 0; i < px.length; i++) h = (Math.imul(h, 31) + (px[i] ?? 0)) | 0;
      return h;
    }, id);
    const daqui = await page.evaluate((pre) => {
      const t = (
        globalThis as unknown as {
          __kofTeste: { visual: { aplicarPre(p: string): void; lerTela(): number[] | null } };
        }
      ).__kofTeste.visual;
      t.aplicarPre(pre);
      const px = t.lerTela() ?? [];
      let h = 0;
      for (let i = 0; i < px.length; i++) h = (Math.imul(h, 31) + (px[i] ?? 0)) | 0;
      return h;
    }, id);
    if (deLa !== daqui) diferentes.push(id);
    vistos.add(daqui);
  }
  expect(diferentes).toEqual([]);
  expect(vistos.size, 'cada predefinição dá uma imagem diferente (não é tela vazia)').toBeGreaterThan(35);
  await outra.close();
});
