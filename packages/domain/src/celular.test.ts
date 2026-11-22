import { describe, expect, it } from 'vitest';
import { enderecoDoControle, linhaDoJogo, padDaRede, padDoServidor, padPraRede } from './celular';

describe('celular como controle (formatos do antigo)', () => {
  it('canal pad: ida e volta', () => {
    const t = padPraRede(0x8081, [32767, -32767, 0, 16384]);
    const p = padDaRede(t);
    expect(p.b).toBe(0x8081);
    expect(p.e).toEqual([32767, -32767, 0, 16513]); // int8 no caminho: perde um pouco, como no antigo
    expect(padDaRede('0,0')).toEqual({ b: 0, e: [0, 0, 0, 0] });
  });
  it('6 bytes do servidor do APK', () => {
    expect(padDoServidor(new Uint8Array([0x81, 0x80, 127, 0x81, 0, 0]))).toEqual({
      b: 0x8081,
      e: [32767, -32767, 0, 0],
    });
    expect(padDoServidor(new Uint8Array([1, 2]))).toBeNull();
  });
  it('endereço e senha, e a linha do jogo', () => {
    expect(enderecoDoControle('192.168.0.15 4821')).toEqual({ url: 'ws://192.168.0.15:8642', senha: '4821' });
    expect(enderecoDoControle(' 10.0.0.2:9000 1234 ')).toEqual({ url: 'ws://10.0.0.2:9000', senha: '1234' });
    expect(enderecoDoControle('celular 12')).toBeNull();
    expect(linhaDoJogo('snes', 'Jogo\tcom tab')).toBe('JOGO snes\tJogo com tab');
  });
});

describe('Jogar no PC', () => {
  it('escala, .local e o jogo pedido', async () => {
    const { escalaTransmissao, trocarLocal, acharJogoPedido } = await import('./celular');
    expect(escalaTransmissao(256, 224)).toBe(4);
    expect(escalaTransmissao(640, 480)).toBe(2);
    expect(trocarLocal('c=IN IP4 0f1e2d3c-1111-2222-3333-444455556666.local', '192.168.0.9')).toBe(
      'c=IN IP4 192.168.0.9',
    );
    const l = [
      { crc: 'aa', arquivo: 'Mario.sfc', nome: 'Mario', sistema: 'snes' },
      { arquivo: 'Sonic.md', nome: 'Sonic', sistema: 'md' },
    ];
    expect(acharJogoPedido(l, { crc: 'aa' })?.nome).toBe('Mario');
    expect(acharJogoPedido(l, { arquivo: 'sonic.bin', sistema: 'md' })?.nome).toBe('Sonic');
    expect(acharJogoPedido(l, { nome: 'Zelda', sistema: 'snes' })).toBeUndefined();
  });

  it('o Opus do som ganha estéreo e banda de música; sem Opus, nada muda', async () => {
    const { opusComQualidade } = await import('./celular');
    const sdp =
      'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\n';
    const r = opusComQualidade(sdp);
    expect(r).toContain('a=fmtp:111 minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=256000\r\n');
    expect(opusComQualidade(r)).toBe(r); // de novo: igual
    const sem = 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n';
    expect(opusComQualidade(sem)).toContain('a=rtpmap:111 opus/48000/2\r\na=fmtp:111 stereo=1;');
    expect(opusComQualidade('m=video 9 x 96\r\n')).toBe('m=video 9 x 96\r\n');
  });
});
