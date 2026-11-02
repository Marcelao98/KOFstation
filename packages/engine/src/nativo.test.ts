import { NATIVO, blocoNativo } from '@kof/contracts';
import { describe, expect, it } from 'vitest';
import { JogoNativo } from './nativo';
import { mascaraLibretro } from './nucleos';

/** Imita o processo nativo do outro lado da WebSocket. */
class WsFalsa {
  static ultima: WsFalsa;
  readyState = 0;
  binaryType = '';
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  enviados: (string | Uint8Array)[] = [];
  constructor(readonly url: string) {
    WsFalsa.ultima = this;
    setTimeout(() => {
      this.readyState = 1;
      this.texto({
        tipo: 'pronto',
        nucleo: 'PCSX-ReARMed',
        versao: 'r',
        largura: 320,
        altura: 240,
        proporcao: 4 / 3,
        fps: 59.94,
        taxa: 44100,
        taxaSaida: 48000,
      });
    }, 1);
  }
  send(d: string | Uint8Array) {
    this.enviados.push(d);
  }
  close() {
    this.readyState = 3;
  }
  texto(v: unknown) {
    this.onmessage?.({ data: JSON.stringify(v) });
  }
  binario(u: Uint8Array) {
    const ab = new ArrayBuffer(u.length);
    new Uint8Array(ab).set(u);
    this.onmessage?.({ data: ab });
  }
  comandos() {
    return this.enviados
      .filter((e): e is string => typeof e === 'string')
      .map((e) => JSON.parse(e) as Record<string, unknown>);
  }
}

const abrir = (eventos = {}) =>
  JogoNativo.abrir(
    {
      sistema: 'ps1',
      porta: 1234,
      token: 'abc',
      volume: 0.5,
      mudo: false,
      sram: new Uint8Array([1, 2]),
      WebSocket: WsFalsa as unknown as typeof WebSocket,
    },
    eventos,
  );

describe('JogoNativo (página ↔ processo nativo)', () => {
  it('conecta com o token, espera o pronto e manda volume e o save', async () => {
    const j = await abrir();
    const ws = WsFalsa.ultima;
    expect(ws.url).toBe('ws://127.0.0.1:1234/?t=abc');
    expect(j.info).toMatchObject({ sistema: 'ps1', largura: 320, altura: 240, taxaAudio: 44100 });
    expect(j.comSom).toBe(true);
    expect(ws.comandos()).toContainEqual({ cmd: 'volume', valor: 0.5 });
    const bat = ws.enviados.find((e) => e instanceof Uint8Array && e[0] === NATIVO.GRAVAR_BATERIA) as Uint8Array;
    expect(Array.from(bat.subarray(12))).toEqual([1, 2]);
    j.fechar();
    expect(ws.comandos().at(-1)).toEqual({ cmd: 'fechar' });
  });

  it('quadro vira pixels, botões vão na máscara do libretro, estado vai e volta', async () => {
    const quadros: [number, number, number][] = [];
    const j = await abrir({ quadro: (p: Uint32Array, l: number, a: number) => quadros.push([p[0] ?? 0, l, a]) });
    const ws = WsFalsa.ultima;
    const q = new Uint8Array(12 + 2 * 1 * 4);
    q.set([1, 0, 0, 0, 2, 0, 1, 0, 5, 0, 0, 0, 0xff, 0, 0, 0xff]);
    ws.binario(q);
    expect(quadros).toEqual([[0xff0000ff, 2, 1]]);

    j.botoesDo(0, 0x8000 | 0x0080);
    const pad = ws.enviados.at(-1) as Uint8Array;
    expect(pad[0]).toBe(NATIVO.BOTOES);
    expect((pad[2] ?? 0) | ((pad[3] ?? 0) << 8)).toBe(mascaraLibretro(0x8000 | 0x0080));

    const salvo = j.salvarEstado();
    const pedido = ws.comandos().at(-1) as { cmd: string; pedido: number };
    expect(pedido.cmd).toBe('salvarEstado');
    const resp = blocoNativo(4, pedido.pedido, new Uint8Array([9, 8, 7]));
    resp[0] = NATIVO.ESTADO;
    ws.binario(resp);
    expect(Array.from(await salvo)).toEqual([9, 8, 7]);

    const carregado = j.carregarEstado(new Uint8Array([1]));
    const env = ws.enviados.at(-1) as Uint8Array;
    expect(env[0]).toBe(NATIVO.CARREGAR_ESTADO);
    ws.texto({ tipo: 'erro', pedido: env[4], codigo: 'CORE_FAILED', mensagem: 'o núcleo recusou o estado' });
    await expect(carregado).rejects.toThrow('recusou');
    j.fechar();
  });

  it('erro sem pedido e fim inesperado viram erro do emulador', async () => {
    const erros: string[] = [];
    const j = await abrir({ erro: (m: string) => erros.push(m) });
    WsFalsa.ultima.texto({ tipo: 'fim', motivo: 'o núcleo pediu pra fechar' });
    expect(erros).toEqual(['o núcleo nativo fechou: o núcleo pediu pra fechar']);
    j.fechar();
  });
});
