// M14.3: a pasta de ROMs do celular (SAF) vista pelo app novo, com a ponte KofAndroid/KOFnesApk simulada: escolher a pasta
// pelo seletor do Android, a Biblioteca listar os jogos dela, abrir um jogo de GB (file.read) e um CD de PS1 pelo núcleo
// nativo (pasta.preparar + ps1Abrir). A parte Java (Pasta.java/PastaComandos.java) só se prova instalando.
import { expect, test } from '@playwright/test';
import { romGbComSave } from './roms';

test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

test('escolhe a pasta de ROMs, lista, abre GB pela leitura e PS1 pelo nativo', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const gb = Buffer.from(romGbComSave()).toString('base64');
  await page.addInitScript((gbB64: string) => {
    const g = globalThis as unknown as Record<string, unknown>;
    const chamadas: string[] = [];
    g.__chamadas = chamadas;
    let escolhida = false;
    let config: Record<string, string> = {};
    const lojas = new Map<string, Map<string, { meta: unknown; bin: string }>>();
    const ok = (data: unknown) => JSON.stringify({ ok: true, data });
    const erro = (code: string, message: string) => JSON.stringify({ ok: false, error: { code, message } });
    const arquivos: Record<string, string> = {
      'Jogos/Zelda Teste.gb': gbB64,
      'CDs/Meu Jogo.cue': btoa('FILE "a.bin" BINARY\n'),
    };
    g.KofAndroid = {
      chamar(cmd: string, argsJson: string, corpo: string): string {
        chamadas.push(cmd);
        const a = JSON.parse(argsJson || '{}') as Record<string, string | number>;
        const loja = () => {
          let m = lojas.get(String(a.store));
          if (!m) lojas.set(String(a.store), (m = new Map()));
          return m;
        };
        switch (cmd) {
          case 'app.info':
            return ok({ version: '0', contractVersion: 1, os: 'android', arch: 'arm64', dataDir: '/x' });
          case 'app.vivo':
          case 'log.write':
            return ok(null);
          case 'config.read':
            return ok({ versao: 1, valores: config });
          case 'config.write':
            config = (JSON.parse(argsJson) as { data: { valores: Record<string, string> } }).data.valores;
            return ok(null);
          case 'store.put':
            loja().set(String(a.key), { meta: a.meta, bin: corpo });
            return ok(null);
          case 'store.list':
            return ok([...loja()].map(([key, v]) => ({ key, meta: v.meta, size: atob(v.bin).length })));
          case 'store.get': {
            const v = loja().get(String(a.key));
            return v ? JSON.stringify({ ok: true, bin: v.bin }) : erro('NOT_FOUND', 'não existe');
          }
          case 'store.meta': {
            const v = loja().get(String(a.key));
            return v ? ok(v.meta) : erro('NOT_FOUND', 'não existe');
          }
          case 'store.delete':
            return ok(null);
          case 'store.space':
            return ok([]);
          case 'nativo.disponivel':
            return ok({ sistemas: [] });
          case 'library.root.get':
            return ok({ path: escolhida ? 'ROMs' : null, ok: escolhida, missing: [], sugestao: '' });
          case 'library.scan':
            return escolhida
              ? ok({
                  root: 'ROMs',
                  files: Object.keys(arquivos).map((p) => ({
                    path: 'Games/' + p,
                    size: atob(arquivos[p] ?? '').length,
                    modified: 0,
                  })),
                })
              : erro('ROOT_MISSING', 'escolha a pasta');
          case 'library.crc':
            return ok({ crcs: {} });
          case 'file.read': {
            const b = arquivos[String(a.path).replace(/^Games\//, '')];
            if (b === undefined) return erro('NOT_FOUND', 'sem o arquivo');
            const bytes = atob(b);
            const ini = Number(a.offset ?? 0);
            const fim = a.length === undefined ? bytes.length : Math.min(bytes.length, ini + Number(a.length));
            return JSON.stringify({ ok: true, bin: btoa(bytes.slice(ini, fim)) });
          }
          case 'pasta.preparar':
            return ok(null);
          default:
            return erro('UNSUPPORTED', 'não existe no celular: ' + cmd);
        }
      },
    };
    const apk: Record<string, unknown> = {
      pastaEscolher: () => {
        escolhida = true;
        setTimeout(() => (g.__pastaEscolhida as (o: boolean) => void)(true), 20);
      },
      ps1Nativo: () => true,
      n64Nativo: () => false,
    };
    for (const m of ['Pad', 'Area', 'Fechar', 'Reiniciar', 'Volume'])
      apk['ps1' + m] = (...x: unknown[]) => void chamadas.push('ps1' + m + ':' + x.length);
    apk.ps1Abrir = (n: string) => {
      chamadas.push('ps1Abrir:' + n);
      setTimeout(
        () => (g.__ps1Pronto as (r: unknown) => void)({ principal: n, largura: 320, altura: 240, fps: 59.94 }),
        20,
      );
    };
    g.KOFnesApk = apk;
  }, gb);
  await page.goto('/');
  await expect(page.locator('#home')).toBeVisible();
  const chamadas = () => page.evaluate(() => (globalThis as unknown as { __chamadas: string[] }).__chamadas);

  await page.keyboard.press('Control+KeyL');
  await expect(page.locator('#biblioteca')).toBeVisible();
  await page.click('.bib-rodape [data-acao="pasta"]'); // no APK abre o seletor de pastas do Android, não pede um caminho
  await expect(page.locator('#pasta-tela')).toBeHidden();
  await expect(page.locator('#roms li')).toHaveCount(2, { timeout: 10_000 });
  await expect(page.locator('#roms')).toContainText('Zelda Teste');
  await expect(page.locator('#roms')).toContainText('Meu Jogo');
  // GB: o app lê o arquivo pela casca e o jogo roda
  await page.locator('#roms li', { hasText: 'Zelda Teste' }).click();
  await expect(page.locator('#st-jogo')).toHaveText('Zelda Teste', { timeout: 15_000 });
  expect(await chamadas()).toContain('file.read');
  // PS1: a casca prepara o CD da pasta e o núcleo nativo abre; nada de WebAssembly
  await page.keyboard.press('Control+KeyL');
  await page.locator('#roms li', { hasText: 'Meu Jogo' }).dblclick();
  await expect.poll(chamadas, { timeout: 15_000 }).toContain('pasta.preparar');
  await expect.poll(chamadas).toContain('ps1Abrir:Meu Jogo.cue');
  expect(erros).toEqual([]);
});
