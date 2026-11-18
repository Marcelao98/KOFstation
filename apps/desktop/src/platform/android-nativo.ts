// PS1 e N64 nativos do APK (M14.4): quem decide se um arquivo vai pro núcleo nativo da casca (window.KOFnesApk, as `.so` do
// antigo) e monta o ambiente que a `JogoNativoAndroid` usa. Fora do APK (`window.KOFnesApk` não existe) tudo devolve "não".
import { cdPs1 } from '@kof/domain';
import { apkTemNativo, type AmbienteAndroid, type ApkNativo } from '@kof/engine';

const apkAgora = (): ApkNativo | undefined => (globalThis as { KOFnesApk?: ApkNativo }).KOFnesApk;

/** Quais consoles a casca roda nativo (o NATIVO do android.js do antigo). */
export function nativosDoApk(): ('ps1' | 'n64')[] {
  const apk = apkAgora();
  return (['ps1', 'n64'] as const).filter((c) => apkTemNativo(apk, c));
}

/**
 * Os nomes e tamanhos dos arquivos de dentro de um zip, lendo SÓ o diretório do fim do arquivo (o `itensDoZip` do antigo,
 * app.js 1875): o zip (um CD de centenas de MB) nunca vai inteiro pra memória.
 */
export async function nomesDoZip(arq: Blob): Promise<{ name: string; size: number }[]> {
  const ini = Math.max(0, arq.size - 65557);
  const fim = new DataView(await arq.slice(ini).arrayBuffer());
  let e = -1;
  for (let i = fim.byteLength - 22; i >= 0; i--)
    if (fim.getUint32(i, true) === 0x06054b50) {
      e = i;
      break;
    }
  if (e < 0) throw new Error('zip inválido');
  const total = fim.getUint16(e + 10, true);
  const tamDir = fim.getUint32(e + 12, true);
  const ofsDir = fim.getUint32(e + 16, true);
  const dir = await arq.slice(ofsDir, ofsDir + tamDir).arrayBuffer();
  const v = new DataView(dir);
  const u8 = new Uint8Array(dir);
  const itens: { name: string; size: number }[] = [];
  let p = 0;
  for (let k = 0; k < total && p + 46 <= dir.byteLength; k++) {
    const tam = v.getUint32(p + 24, true);
    const nl = v.getUint16(p + 28, true);
    const xl = v.getUint16(p + 30, true);
    const cl = v.getUint16(p + 32, true);
    const nome = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)).replace(/^.*[\\/]/, '');
    p += 46 + nl + xl + cl;
    if (nome) itens.push({ name: nome, size: tam });
  }
  return itens;
}

/** Zip com CD de PlayStation dentro (o `cdDoZip` do antigo, app.js 1904): .cue/.chd/.pbp/.iso, ou .bin/.img de mais de 16 MB. */
async function zipComCd(arq: Blob): Promise<boolean> {
  let itens: { name: string; size: number }[];
  try {
    itens = await nomesDoZip(arq);
  } catch {
    return false; // zip quebrado: segue o caminho normal (que avisa)
  }
  if (itens.some((f) => /\.cue$/i.test(f.name) || /\.(chd|pbp|iso)$/i.test(f.name))) return true;
  return itens.some((f) => /\.(bin|img)$/i.test(f.name) && f.size > 16 << 20); // ROM de Mega Drive não passa de uns 10 MB
}

/**
 * Qual console nativo abre esse arquivo no celular (null = segue o caminho normal, WebAssembly). É o `consoleNativo` do
 * android.js do antigo, linha por linha: N64 pela extensão; PS1 pela extensão do CD; `.bin` pelo conteúdo (o começo do
 * arquivo); `.zip` pelo que tem dentro (só o diretório). Tudo isso ANTES de ler o arquivo: o CD não passa pela página.
 */
export async function consoleNativoDoApk(
  arq: Blob & { name: string },
  ps1NoWasm: boolean,
): Promise<'ps1' | 'n64' | null> {
  const nativo = nativosDoApk();
  const n = arq.name.toLowerCase();
  const ps1 = nativo.includes('ps1') && !ps1NoWasm;
  const n64 = nativo.includes('n64');
  if (n64 && /\.(z64|n64|v64)$/.test(n)) return 'n64';
  if (ps1 && /\.(cue|chd|pbp|iso|img|exe)$/.test(n)) return 'ps1';
  if (ps1 && n.endsWith('.bin') && cdPs1(new Uint8Array(await arq.slice(0, 0x9000).arrayBuffer()))) return 'ps1';
  if (n.endsWith('.zip')) {
    if (ps1 && (await zipComCd(arq))) return 'ps1';
    if (n64)
      try {
        if ((await nomesDoZip(arq)).some((f) => /\.(z64|n64|v64)$/i.test(f.name))) return 'n64';
      } catch {
        // zip quebrado: segue o caminho normal
      }
  }
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
