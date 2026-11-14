// M14.1: o app novo rodando por cima da ponte `window.KofAndroid` (o que a casca Java do APK oferece), simulada em
// JavaScript: mesmos comandos, mesmo envelope JSON com bytes em base64 (android/src/.../Ponte.java e Comandos.java).
// Prova o adaptador `platform/android.ts`, o modo celular automático e o que acontece com comando que o celular ainda não
// tem (pasta de ROMs, núcleo nativo). A casca Java em si só se prova instalando o APK (SITUACAO: T-CELULAR).
import { expect, test } from '@playwright/test';
import { romGbComSave } from './roms';

test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

const erros: string[] = [];
test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  await page.addInitScript(() => {
    const lojas = new Map<string, Map<string, { meta: unknown; bin: string }>>();
    let config: Record<string, string> = {};
    const chamadas: string[] = [];
    const ok = (data: unknown) => JSON.stringify({ ok: true, data });
    const erro = (code: string, message: string) => JSON.stringify({ ok: false, error: { code, message } });
    (globalThis as unknown as Record<string, unknown>).__chamadasAndroid = chamadas;
    (globalThis as unknown as Record<string, unknown>).__lojasAndroid = lojas;
    (globalThis as unknown as Record<string, unknown>).KofAndroid = {
      chamar(cmd: string, argsJson: string, corpo: string): string {
        chamadas.push(cmd);
        const a = JSON.parse(argsJson || '{}') as Record<string, string>;
        const loja = () => {
          let m = lojas.get(a.store ?? '');
          if (!m) lojas.set(a.store ?? '', (m = new Map()));
          return m;
        };
        switch (cmd) {
          case 'app.info':
            return ok({
              version: '0.0.1',
              contractVersion: 1,
              os: 'android',
              arch: 'arm64',
              dataDir: '/data/user/0/x/files',
            });
          case 'app.vivo':
          case 'log.write':
            return ok(null);
          case 'config.read':
            return ok({ versao: 1, valores: config });
          case 'config.write':
            config = (JSON.parse(argsJson) as { data: { valores: Record<string, string> } }).data.valores;
            return ok(null);
          case 'store.put':
            loja().set(a.key ?? '', { meta: (a as unknown as { meta: unknown }).meta, bin: corpo });
            return ok(null);
          case 'store.list':
            return ok(
              [...loja()]
                .map(([key, v]) => ({ key, meta: v.meta, size: atob(v.bin).length }))
                .filter((r) => r.key.startsWith(a.prefix ?? '')),
            );
          case 'store.get': {
            const v = loja().get(a.key ?? '');
            return v ? JSON.stringify({ ok: true, bin: v.bin }) : erro('NOT_FOUND', 'não existe');
          }
          case 'store.meta': {
            const v = loja().get(a.key ?? '');
            return v ? ok(v.meta) : erro('NOT_FOUND', 'não existe');
          }
          case 'store.delete':
            loja().delete(a.key ?? '');
            return ok(null);
          case 'store.space':
            return ok([]);
          case 'nativo.disponivel':
            return ok({ sistemas: [] });
          case 'library.root.get':
            return ok({ path: null, ok: false, missing: [], sugestao: '' });
          default:
            return erro('UNSUPPORTED', `o comando ${cmd} ainda não existe no celular`);
        }
      },
    };
  });
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
});
test.afterEach(() => expect(erros).toEqual([]));

const chamadas = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (globalThis as unknown as { __chamadasAndroid: string[] }).__chamadasAndroid);

test('com a ponte KofAndroid o app liga sozinho no modo celular e fala com a casca', async ({ page }) => {
  await expect(page.locator('html')).toHaveClass(/celular/);
  expect(await chamadas(page)).toContain('app.info');
  expect(await chamadas(page)).toContain('config.read');
});

test('abre um jogo pelo seletor de arquivos, o save de bateria vai pra loja da casca e o controle de toque aparece', async ({
  page,
}) => {
  await page.setInputFiles('#arquivo', {
    name: 'Save.gb',
    mimeType: 'application/octet-stream',
    buffer: romGbComSave(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Save');
  await expect(page.locator('#ctl')).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const l = (globalThis as unknown as { __lojasAndroid: Map<string, Map<string, unknown>> }).__lojasAndroid;
          return [...(l.get('saves')?.keys() ?? [])];
        }),
      { timeout: 10_000 },
    )
    .toEqual(['sram.KOFSAVE.32768']);
  expect(await chamadas(page)).toContain('store.put');
});

test('sem pasta Kof Games no celular: a biblioteca avisa em português em vez de quebrar', async ({ page }) => {
  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await expect(page.locator('#lista-vazia')).toBeVisible();
});

test('PS1 e N64 vão pro núcleo nativo da casca (KOFnesApk, as .so do antigo): abre, manda os botões e a área, e para ao pausar', async ({
  page,
}) => {
  await page.evaluate(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    const chamadas: [string, unknown[]][] = [];
    g.__nativoAndroid = chamadas;
    const apk: Record<string, unknown> = {};
    for (const c of ['ps1', 'n64']) {
      apk[c + 'Nativo'] = () => true;
      for (const m of ['Pad', 'Area', 'Fechar', 'Reiniciar', 'Volume'])
        apk[c + m] = (...a: unknown[]) => void chamadas.push([c + m, a]);
      apk[c + 'Abrir'] = (...a: unknown[]) => {
        chamadas.push([c + 'Abrir', a]);
        setTimeout(
          () =>
            (g['__' + c + 'Pronto'] as (r: unknown) => void)({
              principal: String(a[0]),
              largura: 320,
              altura: 240,
              fps: 59.94,
            }),
          20,
        );
      };
    }
    g.KOFnesApk = apk;
  });
  // um CD (.cue pequeno de teste): o app NÃO lê o CD, só passa o nome pro Java
  await page.setInputFiles('#arquivo', {
    name: 'Meu Jogo.cue',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('FILE "a.bin" BINARY\n'),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Meu Jogo', { timeout: 10_000 });
  const nomes = () =>
    page.evaluate(() =>
      (globalThis as unknown as { __nativoAndroid: [string, unknown[]][] }).__nativoAndroid.map((c) => c[0]),
    );
  await expect.poll(nomes).toContain('ps1Abrir');
  await expect.poll(nomes).toContain('ps1Pad');
  await expect.poll(nomes).toContain('ps1Area');
  // nenhum núcleo WebAssembly do PS1 foi baixado
  expect(
    await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /nucleos\/pcsx/.test(r.name))),
  ).toBe(false);
  // um .z64 vai pro N64 nativo
  await page.setInputFiles('#arquivo', {
    name: 'Mario.z64',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(2048, 7),
  });
  await expect.poll(nomes).toContain('n64Abrir');
  await expect.poll(nomes).toContain('ps1Fechar'); // trocou de jogo: o PS1 fechou
});
