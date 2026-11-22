// Tarefa M: a 🎲 Mesa com quatro jogadores. O PC roda o jogo (🧠 Núcleo e 📺 Tela); quatro "celulares" entram como
// jogador pela própria Mesa (o painel do 📡 no celular), cada um pega a sua vaga e os botões de cada um chegam no
// jogador certo. Um cai: a vaga fica reservada ("esperando") e ele volta pra ela ao religar. O "cabo" de teste leva
// as mensagens de uma página pra outra (como no rede-papeis.spec.ts).
import { expect, test, type Page } from '@playwright/test';
import { romVermelha } from './roms';

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
const ligar = (p: Page, id: string, on: boolean) =>
  p.evaluate(([i, o]) => (globalThis as unknown as T).__kofTeste.rede.ligar(i as string, o as boolean), [id, on]);

const NOMES = ['Moto', 'Galaxy', 'Xiaomi', 'iPhone'];
// o botão de cada celular (bits do pad: A, B, X, Y do controle de toque)
const BOTAO = ['A', 'B', 'X', 'Y'] as const;

test('quatro celulares entram pela Mesa, cada um na sua vaga; um cai e volta pra mesma', async ({ browser }) => {
  test.setTimeout(120_000);
  const erros: string[] = [];
  const ctx = [await browser.newContext()];
  for (let i = 0; i < 4; i++)
    ctx.push(await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }));
  const paginas = await Promise.all(ctx.map((c) => c.newPage()));
  const [pc, ...cels] = paginas;
  if (!pc || cels.length !== 4) throw new Error('páginas');
  for (const p of paginas) p.on('pageerror', (e) => erros.push(e.message));
  await pc.goto('/');
  for (const c of cels) await c.goto('/?celular=1');
  await pc.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');

  // quem enxerga quem: o PC dá um id pra cada celular; cada celular dá um id pro PC
  const doPc: string[] = [];
  const doCel: string[] = [];
  for (let i = 0; i < 4; i++) {
    doPc.push(await adicionar(pc, 'celular', NOMES[i] as string));
    doCel.push(await adicionar(cels[i] as Page, 'pc', 'PC de teste'));
  }
  for (let i = 0; i < 4; i++) {
    await ligar(pc, doPc[i] as string, true);
    await ligar(cels[i] as Page, doCel[i] as string, true);
  }
  for (const p of paginas)
    await expect
      .poll(() => p.evaluate(() => (globalThis as unknown as T).__kofTeste.redeOk()), { timeout: 10_000 })
      .toBe(true);

  const vistos = paginas.map(() => 0);
  let parou = false;
  const cabo = (async () => {
    while (!parou) {
      for (let de = 0; de < paginas.length; de++) {
        const p = paginas[de] as Page;
        const todos = await p.evaluate(() => (globalThis as unknown as T).__kofTeste.rede.enviados);
        for (const m of todos.slice(vistos[de])) {
          // do PC pro celular i (pelo id que o PC deu), ou do celular pro PC (pelo id que o celular deu)
          const i = de === 0 ? doPc.indexOf(m.para) : de - 1;
          if (i < 0 || (de > 0 && m.para !== doCel[i])) continue;
          const [alvo, quem] = de === 0 ? [cels[i] as Page, doCel[i] as string] : [pc, doPc[i] as string];
          await alvo.evaluate(
            ([q, c, d]) => (globalThis as unknown as T).__kofTeste.rede.mensagem(q as string, c as string, d as string),
            [quem, m.canal, m.dados],
          );
        }
        vistos[de] = todos.length;
      }
      await new Promise((r) => setTimeout(r, 30));
    }
  })();

  // a mesa chega em cada celular (o núcleo conta pelo canal `mesa`)
  for (const c of cels)
    await expect
      .poll(async () => (await gancho<{ voce: number } | null>(c, 'minhaVaga'))?.voce, { timeout: 10_000 })
      .toBe(-1);

  // o PC: 🎲 no 📡 do menu lateral, J1 é ele (teclado)
  await pc.locator('#lat-aparelhos').click();
  await expect(pc.locator('#painel-aparelhos .painel-mesa [data-vaga]')).toHaveCount(4);
  await expect(pc.locator('#painel-aparelhos [data-vaga="0"] .pm-aparelho')).toContainText('PC de teste');

  // cada celular entra pela Mesa (o 📡 do celular) e vira o próximo jogador
  for (let i = 0; i < 3; i++) {
    const c = cels[i] as Page;
    await c.locator('#lat-aparelhos').click();
    await c.locator('#painel-aparelhos [data-mesa="entrar"]').click();
    await expect(c.locator('#modo-controle')).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => (await gancho<{ voce: number } | null>(c, 'minhaVaga'))?.voce, { timeout: 10_000 })
      .toBe(i + 1);
  }
  // o 4º: a Mesa já está cheia (J1 é o PC): ele não pega vaga
  const c4 = cels[3] as Page;
  await c4.locator('#lat-aparelhos').click();
  await c4.locator('#painel-aparelhos [data-mesa="entrar"]').click();
  await expect(pc.locator('#aviso')).toContainText('vagas estão ocupadas', { timeout: 5000 });
  // o PC libera o J1 dele (tocar no aparelho do J1 passa pro próximo… até "livre": aqui, direto pela ação de sair)
  await pc.evaluate(() => (globalThis as unknown as T).__kofTeste.mesaSair?.());
  await c4.locator('#painel-aparelhos [data-mesa="entrar"]').click();
  await expect(c4.locator('#modo-controle')).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(async () => (await gancho<{ voce: number } | null>(c4, 'minhaVaga'))?.voce, { timeout: 10_000 })
    .toBe(0);
  await pc.screenshot({ path: test.info().outputPath('mesa-quatro.png') });
  // a Mesa inteira (cartões com o atraso, núcleo e tela, J1..J4)
  await pc.locator('#painel-aparelhos [data-abrir="mesa"]').click();
  await expect(pc.locator('#mesa .pm-cartoes li')).toHaveCount(5);
  await pc.screenshot({ path: test.info().outputPath('mesa-tela.png') });
  await pc.locator('#mesa [data-acao="mesa-fechar"]').click();
  await pc.locator('#lat-aparelhos').click();

  // os botões de cada um chegam no jogador dele: o celular i aperta o seu botão
  const vaga = [1, 2, 3, 0];
  for (let i = 0; i < 4; i++)
    await (cels[i] as Page).evaluate((b) => {
      const el = document.querySelector(`#ctl [data-b="${b}"]`) as HTMLElement;
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, cancelable: true }));
    }, BOTAO[i]);
  await expect
    .poll(
      async () => {
        const r = await gancho<{ k: string[]; j: number[]; b: number[] }>(pc, 'jogadoresDaRede');
        return doPc.map((id) => r.j[r.k.indexOf('cel:' + id)]);
      },
      { timeout: 10_000 },
    )
    .toEqual(vaga);
  // cada porta com o botão do seu celular (quatro botões diferentes, nenhuma porta vazia)
  await expect
    .poll(
      async () => {
        const r = await gancho<{ b: number[] }>(pc, 'jogadoresDaRede');
        return r.b.every((b) => b !== 0) && new Set(r.b).size === 4;
      },
      { timeout: 10_000 },
    )
    .toBe(true);

  // o atraso de cada jogador aparece na Mesa (o ping a cada 3 s)
  await expect
    .poll(async () => Object.keys((await gancho<{ atraso: object }>(pc, 'mesa')).atraso).length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(4);

  // o Galaxy (J3) cai: a vaga fica reservada, esperando; ninguém mais pega
  await ligar(pc, doPc[1] as string, false);
  await expect(pc.locator('#painel-aparelhos [data-vaga="2"]')).toHaveAttribute('data-estado', 'esperando', {
    timeout: 10_000,
  });
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');
  // volta: a mesma vaga, e o papel de controle de novo
  await ligar(pc, doPc[1] as string, true);
  await expect(pc.locator('#painel-aparelhos [data-vaga="2"]')).toHaveAttribute('data-estado', 'ok', {
    timeout: 10_000,
  });
  await expect
    .poll(async () => (await gancho<{ voce: number } | null>(cels[1] as Page, 'minhaVaga'))?.voce, { timeout: 10_000 })
    .toBe(2);
  await expect
    .poll(
      async () => {
        const x = await gancho<{ k: string[]; j: number[] }>(pc, 'jogadoresDaRede');
        return x.j[x.k.indexOf('cel:' + doPc[1])];
      },
      { timeout: 10_000 },
    )
    .toBe(2);

  // 📺 "trazer a imagem pra cá" de um celular: a imagem vai pra ele (a mesa mostra a tela nele)
  await (cels[0] as Page).locator('.mc-mesa').click();
  await (cels[0] as Page).locator('.mc-painel-mesa [data-mesa="imagem"]').click();
  await expect
    .poll(async () => (await gancho<{ mesa: { tela: string } }>(pc, 'mesa')).mesa.tela, { timeout: 10_000 })
    .toBe(doPc[0]);
  await expect(pc.locator('#st-jogo')).toHaveText('Teste Vermelho');

  parou = true;
  await cabo;
  expect(erros).toEqual([]);
  for (const c of ctx) await c.close();
});
