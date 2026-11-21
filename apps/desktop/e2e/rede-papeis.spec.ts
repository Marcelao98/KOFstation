// Tarefa N: três aparelhos com papéis, como no uso real. O PC roda o jogo (🧠 Núcleo), o notebook mostra a imagem
// (📺 Tela) e o celular controla (🎮 Controle). Cada página tem a sua rede de mentira; o "cabo" leva cada mensagem do
// que um mandou pro outro, com o id que o outro conhece. A troca é pelo 📡 do menu lateral, com o jogo rodando.
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

type Rede = {
  adicionar: (t: string, n: string, ip?: string) => string;
  mensagem: (d: string, c: string, x: string) => void;
  ligar: (i: string, o: boolean) => void;
  enviados: { para: string; canal: string; dados: string }[];
};
type T = { __kofTeste: { rede: Rede; redeOk: () => boolean } & Record<string, () => unknown> };
const adicionar = (p: Page, tipo: string, nome: string) =>
  p.evaluate(
    ([t, n]) => (globalThis as unknown as T).__kofTeste.rede.adicionar(t as string, n as string, ''),
    [tipo, nome],
  );
const gancho = <R>(p: Page, nome: string) =>
  p.evaluate((n) => (globalThis as unknown as T).__kofTeste[n]?.(), nome) as Promise<R>;

test('PC núcleo, notebook tela e celular controle: troca pelo 📡 do menu lateral sem perder o jogo', async ({
  browser,
}) => {
  const erros: string[] = [];
  const ctx = [await browser.newContext(), await browser.newContext()];
  ctx.push(await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }));
  const [pc, note, cel] = await Promise.all(ctx.map((c) => c.newPage()));
  if (!pc || !note || !cel) throw new Error('páginas');
  for (const p of [pc, note, cel]) p.on('pageerror', (e) => erros.push(e.message));
  await pc.goto('/');
  await note.goto('/?celular=0');
  await cel.goto('/?celular=1');
  await pc.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');

  // quem enxerga quem (o id que cada página dá pro outro aparelho)
  const ids = {
    pc: { note: await adicionar(pc, 'pc', 'Notebook'), cel: await adicionar(pc, 'celular', 'Moto') },
    note: { pc: await adicionar(note, 'pc', 'PC de teste') },
    cel: { pc: await adicionar(cel, 'pc', 'PC de teste') },
  };
  const paginas = { pc, note, cel } as const;
  // quem mandou (página) e pra quem (id que ela conhece) → [página de destino, id de quem mandou, visto de lá]
  const rota = (de: keyof typeof paginas, para: string): [keyof typeof paginas, string] | null => {
    if (de === 'pc')
      return para === ids.pc.note ? ['note', ids.note.pc] : para === ids.pc.cel ? ['cel', ids.cel.pc] : null;
    return para === (de === 'note' ? ids.note.pc : ids.cel.pc)
      ? ['pc', de === 'note' ? ids.pc.note : ids.pc.cel]
      : null;
  };
  const ligar = (p: Page) => p.evaluate(() => (globalThis as unknown as T).__kofTeste.redeOk());
  for (const [k, p] of Object.entries(paginas))
    await expect
      .poll(
        async () => {
          for (const id of Object.values(ids[k as keyof typeof ids]))
            await p.evaluate((i) => (globalThis as unknown as T).__kofTeste.rede.ligar(i, true), id);
          return ligar(p);
        },
        { timeout: 10_000 },
      )
      .toBe(true);

  const vistos = { pc: 0, note: 0, cel: 0 };
  let parou = false;
  const cabo = (async () => {
    while (!parou) {
      for (const de of ['pc', 'note', 'cel'] as const) {
        const todos = await paginas[de].evaluate(() => (globalThis as unknown as T).__kofTeste.rede.enviados);
        for (const m of todos.slice(vistos[de])) {
          const r = rota(de, m.para);
          if (!r) continue;
          await paginas[r[0]].evaluate(
            ([i, c, d]) => (globalThis as unknown as T).__kofTeste.rede.mensagem(i as string, c as string, d as string),
            [r[1], m.canal, m.dados],
          );
        }
        vistos[de] = todos.length;
      }
      await new Promise((r) => setTimeout(r, 40));
    }
  })();

  // N.2: as fichas chegaram (o PC vê o notebook como PC e o celular como celular)
  await expect
    .poll(async () => Object.keys((await gancho<{ fichas: object }>(pc, 'arranjo')).fichas).length, { timeout: 10_000 })
    .toBe(2);

  // 📡 no menu lateral: os arranjos e os aparelhos com os chips
  await pc.locator('#lat-aparelhos').click();
  await expect(pc.locator('#painel-aparelhos [data-arranjo]')).toHaveCount(4);
  await expect(pc.locator('#painel-aparelhos [data-arranjo="sozinho"]')).toHaveClass(/ativo/);
  await expect(pc.locator('#painel-aparelhos .ba-lista li')).toHaveCount(3);
  await expect(pc.locator(`#painel-aparelhos li[data-aparelho="${ids.pc.note}"] .ba-ficha`)).toContainText('PC');
  await pc.screenshot({ path: test.info().outputPath('aparelhos-switch.png') });

  // 🖥📺📱 Três aparelhos, com um toque
  await pc.locator('#painel-aparelhos [data-arranjo="tres"]').click();
  // o notebook vira a tela: a imagem do jogo chega lá
  await expect(note.locator('#modo-controle')).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      () => note.evaluate(() => (document.querySelector('.mc-video') as HTMLVideoElement | null)?.videoWidth ?? 0),
      {
        timeout: 20_000,
      },
    )
    .toBeGreaterThan(0);
  // o celular vira o controle pela rede: o que ele aperta chega no PC
  await expect(cel.locator('#modo-controle')).toBeVisible({ timeout: 10_000 });
  await expect(cel.locator('#ctl')).toBeVisible();
  await cel.evaluate(() => {
    const el = document.querySelector('#ctl [data-b="A"]') as HTMLElement;
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, bubbles: true, cancelable: true }));
  });
  await expect
    .poll(
      async () =>
        (await gancho<{ k: string; b: number }[]>(pc, 'padsDaRede')).find((a) => a.k === 'cel:' + ids.pc.cel)?.b ?? 0,
      { timeout: 10_000 },
    )
    .toBe(0x0080);
  await expect(pc.locator('#painel-aparelhos [data-arranjo="tres"]')).toHaveClass(/ativo/);
  await expect(pc.locator(`li[data-aparelho="${ids.pc.note}"] [data-papel="tela"]`)).toHaveClass(/tem/);
  await expect(pc.locator(`li[data-aparelho="${ids.pc.cel}"] [data-papel="controle"]`)).toHaveClass(/tem/);

  // 🖥 PC sozinho: a imagem volta, o notebook e o celular largam o papel, o jogo continua
  await pc.locator('#painel-aparelhos [data-arranjo="sozinho"]').click();
  await expect(note.locator('#modo-controle')).toHaveCount(0, { timeout: 10_000 });
  await expect(cel.locator('#modo-controle')).toHaveCount(0, { timeout: 10_000 });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');

  // 📺 a tela cai no meio: volta sozinha pro PC e avisa
  await pc.locator('#painel-aparelhos [data-arranjo="tres"]').click();
  await expect(note.locator('#modo-controle')).toBeVisible({ timeout: 10_000 });
  await pc.evaluate((i) => (globalThis as unknown as T).__kofTeste.rede.ligar(i, false), ids.pc.note);
  await expect.poll(async () => (await gancho<{ arranjo: { tela: string } }>(pc, 'arranjo')).arranjo.tela).toBe('eu');
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');

  parou = true;
  await cabo;
  expect(erros).toEqual([]);
  for (const c of ctx) await c.close();
});
