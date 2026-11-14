import { describe, expect, it } from 'vitest';
import { apkTemNativo, empacotarEixos, JogoNativoAndroid, type AmbienteAndroid } from './nativo-android';

function ambiente() {
  const chamadas: [string, unknown[]][] = [];
  const janela: Record<string, unknown> = {};
  const apk: Record<string, (...a: never[]) => unknown> = {};
  for (const c of ['ps1', 'n64']) {
    for (const m of ['Pad', 'Area', 'Fechar', 'Reiniciar', 'Volume'])
      apk[c + m] = (...a: never[]) => void chamadas.push([c + m, a]);
    apk[c + 'Nativo'] = () => true;
    apk[c + 'Estado'] = () => btoa('estado!');
    apk[c + 'CarregarEstado'] = (...a: never[]) => (chamadas.push([c + 'CarregarEstado', a]), true);
    apk[c + 'Abrir'] = (...a: never[]) => {
      chamadas.push([c + 'Abrir', a]);
      queueMicrotask(() =>
        (janela['__' + c + 'Pronto'] as (r: unknown) => void)({
          principal: 'jogo.cue',
          largura: 320,
          altura: 240,
          fps: 59.94,
        }),
      );
    };
  }
  const amb: AmbienteAndroid = { apk, janela, area: () => ({ left: 1, top: 2, width: 300, height: 225 }) };
  return { amb, chamadas };
}

describe('PS1 e N64 nativos no APK (fachada do antigo)', () => {
  it('empacota os eixos como o nucleo.js do antigo', () => {
    expect(empacotarEixos([0, 0, 0, 0])).toBe(0);
    expect(empacotarEixos([32767, -32767, 0, 0])).toBe(0x7f | (0x80 << 8));
  });

  it('só diz que tem nativo se a casca responde ps1Nativo()/n64Nativo() verdadeiro', () => {
    expect(apkTemNativo(undefined, 'ps1')).toBe(false);
    expect(apkTemNativo({}, 'ps1')).toBe(false);
    expect(apkTemNativo({ ps1Nativo: () => false }, 'ps1')).toBe(false);
    expect(
      apkTemNativo(
        {
          ps1Nativo: () => {
            throw new Error('sem .so');
          },
        },
        'ps1',
      ),
    ).toBe(false);
    expect(apkTemNativo(ambiente().amb.apk, 'n64')).toBe(true);
  });

  it('abre pelo Java, espera o "pronto" e manda botões, área e volume; pausar para de mandar (a tela nativa some)', async () => {
    const { amb, chamadas } = ambiente();
    const j = await JogoNativoAndroid.abrir(amb, { sistema: 'ps1', nome: 'jogo.cue', volume: 0.8, mudo: false });
    expect(chamadas[0]).toEqual(['ps1Abrir', ['jogo.cue']]);
    expect(j.info).toMatchObject({ sistema: 'ps1', largura: 320, altura: 240 });
    j.botoesDo(0, 0x0080); // A do SNES
    await new Promise((r) => setTimeout(r, 60));
    const nomes = chamadas.map((c) => c[0]);
    expect(nomes).toContain('ps1Pad');
    expect(nomes).toContain('ps1Area');
    expect(nomes).toContain('ps1Volume');
    const area = chamadas.find((c) => c[0] === 'ps1Area');
    expect(area?.[1]).toEqual([1, 2, 300, 225]);
    j.pausar(true);
    const n = chamadas.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(chamadas.length).toBe(n); // parado: nenhum botão novo
    j.pausar(false);
    expect(chamadas.length).toBeGreaterThan(n);
    j.fechar();
    expect(chamadas.map((c) => c[0])).toContain('ps1Fechar');
  });

  it('o erro do Java vira erro em português do app, não silêncio', async () => {
    const { amb } = ambiente();
    amb.apk['n64Abrir'] = () =>
      queueMicrotask(() => (amb.janela['__n64Pronto'] as (r: unknown) => void)({ erro: 'não achei a ROM' }));
    await expect(
      JogoNativoAndroid.abrir(amb, { sistema: 'n64', nome: 'x.z64', volume: 1, mudo: false }),
    ).rejects.toThrow('não achei a ROM');
  });

  it('savestate de ida e volta por base64', async () => {
    const { amb, chamadas } = ambiente();
    const j = await JogoNativoAndroid.abrir(amb, { sistema: 'n64', nome: 'x.z64', volume: 1, mudo: false });
    expect(new TextDecoder().decode(await j.salvarEstado())).toBe('estado!');
    await j.carregarEstado(new TextEncoder().encode('outro'));
    expect(chamadas.find((c) => c[0] === 'n64CarregarEstado')?.[1]).toEqual([btoa('outro')]);
    j.fechar();
  });
});
