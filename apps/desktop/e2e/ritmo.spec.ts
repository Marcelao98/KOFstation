// Tarefa A: o ritmo dos quadros na tela. O Game Boy da romGbContador troca o tom da tela a cada quadro; em cada vsync
// anota o tom que foi pra placa de vídeo e conta repetidos e pulados (a conta completa, com o antigo, é o
// tools/medir-ritmo.mjs). Com o ritmo pelo vsync, quase todo vsync traz um quadro novo.
import { expect, test } from '@playwright/test';
import { romGbContador } from './roms';

test('cada vsync mostra um quadro novo: quase nada repetido ou pulado', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.addInitScript(() => {
    const r = { tons: [] as number[], medir: false, atual: -2 };
    (window as unknown as { __ritmo: typeof r }).__ritmo = r;
    const laco = () => {
      requestAnimationFrame(laco); // antes do app: o envio do app cai neste vsync
      if (r.medir && r.atual > -2) r.tons.push(r.atual);
      r.atual = -1;
    };
    requestAnimationFrame(laco);
    for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const orig = P.texSubImage2D as (...a: unknown[]) => void;
      (P as unknown as { texSubImage2D: (...a: unknown[]) => void }).texSubImage2D = function (
        this: unknown,
        ...a: unknown[]
      ) {
        const [w, h, d] = [a[4], a[5], a[8]];
        if (typeof w === 'number' && typeof h === 'number' && w >= 100 && ArrayBuffer.isView(d)) {
          const u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
          const i = ((h >> 1) * w + (w >> 2)) * 4;
          r.atual = (u8[i] ?? 0) + (u8[i + 1] ?? 0) + (u8[i + 2] ?? 0);
        }
        return orig.apply(this, a);
      };
    }
  });
  await page.goto('/');
  await page.setInputFiles('#arquivo', {
    name: 'Ritmo.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbContador(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Ritmo');
  await page.waitForTimeout(2000);
  await page.evaluate(() => ((window as unknown as { __ritmo: { medir: boolean } }).__ritmo.medir = true));
  await page.waitForTimeout(5000);
  const tons = await page.evaluate(() => (window as unknown as { __ritmo: { tons: number[] } }).__ritmo.tons);
  const niveis = [...new Set(tons.filter((t) => t >= 0))].sort((a, b) => b - a);
  expect(niveis).toHaveLength(4);
  let repetidos = 0;
  let pulados = 0;
  let antes = -1;
  for (const t of tons) {
    const q = niveis.indexOf(t);
    if (q < 0 || q === antes) repetidos++;
    else if (antes >= 0) pulados += ((q - antes + 4) % 4) - 1;
    if (q >= 0) antes = q;
  }
  // ~300 vsyncs; antes da tarefa A eram ~70 repetidos e ~70 pulados. Folga pros trancos do container.
  expect(tons.length).toBeGreaterThan(250);
  expect(repetidos).toBeLessThanOrEqual(12);
  expect(pulados).toBeLessThanOrEqual(12);
  expect(erros).toEqual([]);
});
