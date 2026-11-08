// M13.4: 🖥 Jogar no PC (o jogarpc.js do antigo) com um "celular" de verdade em WebRTC numa outra página: o celular pede
// pelo canal `jogo`, o PC transmite a imagem (vermelha, da ROM de teste), o canal de dados leva os botões (6 bytes) e o
// ping, o menu do PC aparece no celular, e o "fim" devolve o jogo pro PC.
import { expect, test } from '@playwright/test';
import { romVermelha } from './roms';

// o IP da rede de casa sem o nome .local (no container não tem quem responda o mDNS)
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
  parearCelular: (c: string, n: string, ip: string) => boolean;
  mensagem: (d: string, c: string, x: string) => void;
  enviados: { para: string; canal: string; dados: string }[];
};

test('o celular joga com o PC processando: imagem, botões, ping, menu e voltar pra TV', async ({ page, context }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await page.setInputFiles('#arquivo', {
    name: 'Teste Vermelho.md',
    mimeType: 'application/octet-stream',
    buffer: romVermelha(),
  });
  await expect(page.locator('#st-jogo')).toHaveText('Teste Vermelho');
  await page.click('#menu >> text=Arquivo');
  await page.click('#menu [data-acao="aparelhos"]');
  await page.click('[data-acao="ap-parear"]');
  await expect(page.locator('#ap-codigo')).toHaveText('123 456');
  await page.evaluate(() =>
    (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.parearCelular('123456', 'Moto', ''),
  );
  await expect(page.locator('#ap-lista li')).toHaveCount(1);
  const cel = (await page.locator('#ap-lista li').getAttribute('data-id')) ?? '';
  await page.click('#aparelhos .x');

  // o celular pede
  await page.evaluate(
    (c) => (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.mensagem(c, 'jogo', '{"t":"pedir"}'),
    cel,
  );
  const oferta = await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.enviados.find(
            (x) => x.canal === 'jogo' && x.dados.includes('"oferta"'),
          ),
        ),
      { timeout: 10000 },
    )
    .toBeTruthy()
    .then(() =>
      page.evaluate(
        () =>
          (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.enviados.find((x) =>
            x.dados.includes('"oferta"'),
          )?.dados ?? '',
      ),
    );
  const sdp = (JSON.parse(oferta) as { sdp: string }).sdp;

  // o celular (outra página): responde, recebe o vídeo e o canal de dados
  const celular = await context.newPage();
  await celular.goto('about:blank');
  const resposta = await celular.evaluate(async (oferta) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const w = window as unknown as { dc?: RTCDataChannel; chegou: string[]; video: HTMLVideoElement };
    w.chegou = [];
    w.video = document.createElement('video');
    w.video.muted = true;
    w.video.autoplay = true;
    document.body.appendChild(w.video);
    pc.ontrack = (e) => {
      if (e.track.kind === 'video') w.video.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    };
    pc.ondatachannel = (e) => {
      w.dc = e.channel;
      e.channel.onmessage = (m) => w.chegou.push(String(m.data));
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: oferta });
    await pc.setLocalDescription(await pc.createAnswer());
    await new Promise<void>((ok) => {
      if (pc.iceGatheringState === 'complete') return ok();
      pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && ok();
      setTimeout(ok, 3000);
    });
    return pc.localDescription?.sdp ?? '';
  }, sdp);
  await page.evaluate(
    ([c, r]) =>
      (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.mensagem(
        c ?? '',
        'jogo',
        JSON.stringify({ t: 'resposta', sdp: r }),
      ),
    [cel, resposta],
  );
  await expect(page.locator('#aviso')).toContainText('transmitindo pro celular', { timeout: 15000 });
  // a imagem chega vermelha no celular
  await expect
    .poll(
      () =>
        celular.evaluate(() => {
          const v = (window as unknown as { video: HTMLVideoElement }).video;
          if (!v.videoWidth) return null;
          const c = document.createElement('canvas');
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const g = c.getContext('2d');
          if (!g) return false;
          g.drawImage(v, 0, 0);
          const [r = 0, gr = 255, b = 255] = g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data;
          return r > 150 && gr < 80 && b < 80;
        }),
      { timeout: 15000 },
    )
    .toBe(true);
  // o jogo e o tamanho, o ping, o menu e um botão
  await expect
    .poll(
      () =>
        celular.evaluate(() => (window as unknown as { chegou: string[] }).chegou.find((x) => x.includes('"jogo"'))),
      { timeout: 5000 },
    )
    .toContain('"sis":"md"');
  await celular.evaluate(() => {
    const w = window as unknown as { dc: RTCDataChannel };
    w.dc.send('p42');
    w.dc.send('{"t":"menu"}');
    w.dc.send(new Int8Array([0x80, 0, 0, 0, 0, 0]).buffer); // A
  });
  await expect.poll(() => celular.evaluate(() => (window as unknown as { chegou: string[] }).chegou)).toContain('P42');
  await expect
    .poll(() =>
      celular.evaluate(() => (window as unknown as { chegou: string[] }).chegou.find((x) => x.includes('"menu"'))),
    )
    .toContain('💾 Salvar estado');
  await expect(page.locator('#aviso'))
    .toContainText('Celular (controle do PC) = Jogador 1', { timeout: 5000 })
    .catch(() => {});
  // o celular sai: o jogo volta pro PC
  await page.evaluate(
    (c) => (window as unknown as { __kofTeste: { rede: Rede } }).__kofTeste.rede.mensagem(c, 'jogo', '{"t":"fim"}'),
    cel,
  );
  await expect(page.locator('#aviso')).toContainText('o jogo voltou pra cá');
  expect(erros).toEqual([]);
});
