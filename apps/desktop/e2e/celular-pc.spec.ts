// M14: o lado do CELULAR do Jogar no PC e do controle (o `entrarModoControle` do antigo), com duas páginas de verdade:
// o PC (o app com um jogo aberto) e o celular (`?celular=1`), ligados por um "cabo" de teste que leva as mensagens do canal
// `jogo` de uma rede de mentira pra outra. O vídeo e os botões vão por WebRTC de verdade, como no uso real.
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

test.use({
  launchOptions: {
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-features=WebRtcHideLocalIpsWithMdns',
    ],
  },
});

const redeOk = (p: Page) =>
  p.evaluate(() => (globalThis as unknown as { __kofTeste: { redeOk: () => boolean } }).__kofTeste.redeOk());

type Rede = {
  adicionar: (t: string, n: string, ip?: string) => string;
  mensagem: (d: string, c: string, x: string) => void;
  enviados: { para: string; canal: string; dados: string }[];
};
const rede = (p: Page) =>
  p.evaluate(() => (globalThis as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.enviados.length);

test('o celular vira o controle e joga no PC: imagem, ping, botões, menu do PC e voltar', async ({ browser }) => {
  const erros: string[] = [];
  const ctxPc = await browser.newContext();
  const ctxCel = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const pc = await ctxPc.newPage();
  const cel = await ctxCel.newPage();
  for (const p of [pc, cel]) p.on('pageerror', (e) => erros.push(e.message));
  await pc.goto('/');
  await cel.goto('/?celular=1');
  await pc.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');
  // os dois já pareados: o PC enxerga um celular, o celular enxerga o PC
  const idCel = await pc.evaluate(() =>
    (globalThis as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.adicionar('celular', 'Moto', ''),
  );
  const idPc = await cel.evaluate(() =>
    (globalThis as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.adicionar('pc', 'PC de teste', ''),
  );
  // a rede de mentira só entrega depois de ligada (500 ms depois da abertura): repete até a lista chegar nas duas telas
  const ligar = (p: Page, id: string) =>
    p.evaluate(
      (i) =>
        (
          globalThis as unknown as { __kofTeste: { rede: { ligar: (i: string, o: boolean) => void } } }
        ).__kofTeste.rede.ligar(i, true),
      id,
    );
  await expect.poll(async () => (await ligar(cel, idPc), await redeOk(cel)), { timeout: 10_000 }).toBe(true);
  await expect.poll(async () => (await ligar(pc, idCel), await redeOk(pc)), { timeout: 10_000 }).toBe(true);
  // o "cabo": o que cada lado manda pelo canal `jogo` chega no outro
  const vistos = { pc: 0, cel: 0 };
  let parou = false;
  const bombear = async () => {
    while (!parou) {
      for (const [de, para, idDeQuemMandou, chave] of [
        [pc, cel, idPc, 'pc'],
        [cel, pc, idCel, 'cel'],
      ] as const) {
        const todos = await de.evaluate(
          () => (globalThis as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.enviados,
        );
        for (const m of todos.slice(vistos[chave])) {
          // quem recebe vê "de" = o id do aparelho que mandou, do ponto de vista dele
          await para.evaluate(
            ([i, c, d]) =>
              (globalThis as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.mensagem(
                i as string,
                c as string,
                d as string,
              ),
            [idDeQuemMandou, m.canal, m.dados],
          );
        }
        vistos[chave] = todos.length;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const cabo = bombear();

  // celular: 📡 Aparelhos → 🎮 Jogar no PC
  await cel.evaluate(() => (document.querySelector('[data-acao="aparelhos"]') as HTMLElement).click());
  await expect(cel.locator('#ap-lista li')).toHaveCount(1);
  await expect(cel.locator('#ap-lista li')).toContainText('PC de teste');
  await expect(cel.locator('[data-acao="ap-ler-qr"]')).toBeVisible(); // só no celular
  await expect(cel.locator('[data-acao="ap-parear"]')).toBeHidden(); // só no PC
  await cel.getByRole('button', { name: '🎮 Jogar no PC' }).click();
  await expect(cel.locator('#modo-controle')).toBeVisible();
  // conectou: luz acesa, nome do PC, o console e o jogo que o PC abriu, imagem chegando e o ping
  await expect(cel.locator('#modo-controle.ligado .mc-status')).toHaveText('PC de teste', { timeout: 25_000 });
  await expect(cel.locator('.mc-jogo')).toHaveText('Teste Vermelho', { timeout: 10_000 });
  await expect(cel.locator('.mc-sis')).toHaveText('Mega Drive');
  await expect
    .poll(() => cel.evaluate(() => (document.querySelector('.mc-video') as HTMLVideoElement | null)?.videoWidth ?? 0), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
  await expect(cel.locator('.mc-ping')).toContainText('ms', { timeout: 10_000 });
  // o controle de toque aparece com os botões do Mega Drive e o que a pessoa aperta chega no PC
  await expect(cel.locator('#ctl')).toBeVisible();
  await cel.evaluate(() => {
    const el = document.querySelector('#ctl [data-b="A"]') as HTMLElement;
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, bubbles: true, cancelable: true }));
  });
  await expect
    .poll(
      () =>
        pc.evaluate(
          () =>
            (globalThis as unknown as { __kofTeste: { padDoCelular: () => { b: number } } }).__kofTeste.padDoCelular()
              .b,
        ),
      { timeout: 10_000 },
    )
    .toBe(0x0080);
  // ☰ abre o menu do PC dentro do celular
  await cel.evaluate(() => (document.querySelector('.mc-atalhos [data-at="menu"]') as HTMLElement).click());
  await expect(cel.locator('.mc-menu')).toBeVisible();
  await expect(cel.locator('.mc-menu-pc .mc-item').first()).toBeVisible({ timeout: 10_000 });
  await cel.locator('.mc-menu [data-r="sair"]').click();
  await expect(cel.locator('#modo-controle')).toHaveCount(0);
  parou = true;
  await cabo;
  expect(erros).toEqual([]);
  expect(await rede(pc)).toBeGreaterThan(0);
  await ctxPc.close();
  await ctxCel.close();
});

test('celular como controle pela rede pareada: o PC diz o jogador e o console, e o botão chega', async ({
  browser,
}) => {
  const erros: string[] = [];
  const ctxPc = await browser.newContext();
  const ctxCel = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const pc = await ctxPc.newPage();
  const cel = await ctxCel.newPage();
  for (const p of [pc, cel]) p.on('pageerror', (e) => erros.push(e.message));
  await pc.goto('/');
  await cel.goto('/?celular=1');
  await pc.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');
  const R = (p: Page, f: string, ...a: unknown[]) =>
    p.evaluate(
      ([fn, args]) => {
        const r = (globalThis as unknown as { __kofTeste: { rede: Record<string, unknown> } }).__kofTeste.rede[
          fn as string
        ];
        return typeof r === 'function' ? (r as (...x: unknown[]) => unknown)(...(args as unknown[])) : r; // `enviados` é a lista, o resto são funções
      },
      [f, a] as const,
    );
  const idCel = (await R(pc, 'adicionar', 'celular', 'Moto', '')) as string;
  const idPc = (await R(cel, 'adicionar', 'pc', 'PC de teste', '')) as string;
  for (const [p, id] of [
    [cel, idPc],
    [pc, idCel],
  ] as const)
    await expect.poll(async () => (await R(p, 'ligar', id, true), await redeOk(p)), { timeout: 10_000 }).toBe(true);
  const vistos = { pc: 0, cel: 0 };
  let parou = false;
  const cabo = (async () => {
    while (!parou) {
      for (const [de, para, id, chave] of [
        [pc, cel, idPc, 'pc'],
        [cel, pc, idCel, 'cel'],
      ] as const) {
        const todos = (await R(de, 'enviados')) as { canal: string; dados: string }[];
        for (const m of todos.slice(vistos[chave])) await R(para, 'mensagem', id, m.canal, m.dados);
        vistos[chave] = todos.length;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  })();
  // celular: Controles → 📱 Usar este celular como controle do PC
  await cel.evaluate(() => (document.querySelector('[data-acao="teclas"]') as HTMLElement).click());
  await expect(cel.locator('#teclas')).toBeVisible();
  await cel.locator('[data-acao="modo-controle"]').click();
  await expect(cel.locator('#modo-controle')).toBeVisible();
  await expect(cel.locator('#modo-controle.ligado .mc-status')).toContainText('PC de teste · Jogador 1', {
    timeout: 15_000,
  });
  await expect(cel.locator('.mc-sis')).toHaveText('Mega Drive');
  await cel.evaluate(() => {
    (document.querySelector('#ctl [data-b="B"]') as HTMLElement).dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 3, bubbles: true, cancelable: true }),
    );
  });
  await expect
    .poll(
      () =>
        pc.evaluate(
          () =>
            (globalThis as unknown as { __kofTeste: { padDoCelular: () => { b: number } } }).__kofTeste.padDoCelular()
              .b,
        ),
      { timeout: 5000 },
    )
    .not.toBeUndefined();
  await cel.locator('.mc-sair').click();
  await expect(cel.locator('#modo-controle')).toHaveCount(0);
  parou = true;
  await cabo;
  expect(erros).toEqual([]);
  await ctxPc.close();
  await ctxCel.close();
});
