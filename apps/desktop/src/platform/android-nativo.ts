// PS1 e N64 nativos do APK (M14.4): quem decide se um arquivo vai pro núcleo nativo da casca (window.KOFnesApk, as `.so` do
// antigo) e monta o ambiente que a `JogoNativoAndroid` usa. Fora do APK (`window.KOFnesApk` não existe) tudo devolve "não".
import { apkTemNativo, type AmbienteAndroid, type ApkNativo } from '@kof/engine';

const apkAgora = (): ApkNativo | undefined => (globalThis as { KOFnesApk?: ApkNativo }).KOFnesApk;

const EXT_N64 = /\.(z64|n64|v64)$/i;
const EXT_PS1 = /\.(cue|chd|pbp|iso|img|exe)$/i;

/** Qual console nativo abre esse arquivo no celular (null = segue o caminho normal, WebAssembly). */
export function consoleNativoDoApk(nome: string, ps1NoWasm: boolean): 'ps1' | 'n64' | null {
  const apk = apkAgora();
  if (EXT_N64.test(nome) && apkTemNativo(apk, 'n64')) return 'n64';
  if (EXT_PS1.test(nome) && !ps1NoWasm && apkTemNativo(apk, 'ps1')) return 'ps1';
  return null;
}

export function ambienteDoApk(): AmbienteAndroid | null {
  const apk = apkAgora();
  if (!apk) return null;
  return {
    apk,
    janela: globalThis as unknown as Record<string, unknown>,
    area: () => document.getElementById('tela')?.getBoundingClientRect() ?? null,
  };
}

/** O "arquivo" que o app guarda no lugar do jogo (o CD nunca passa pela página): 16 bytes com o console e o nome. */
export const marcaNativa = (c: string, nome: string): Uint8Array =>
  new TextEncoder().encode(`${c} nativo ${nome}`.padEnd(16)).slice(0, 16);
