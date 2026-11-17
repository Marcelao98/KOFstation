// O formato do estado salvo (o mesmo do antigo): o JSON {lr: núcleo, d: base64 do estado} (o Snes9x também com s9x: 1),
// em gzip na loja `estados` e sem gzip na `autos`. Só funções puras: o Worker (estado-worker.ts) usa as mesmas.
import { gz, ungz } from '@kof/domain';

export interface EstadoDoNucleo {
  lr?: string;
  d?: string;
  s9x?: number;
  /** os bytes já decodificados (quem leu pelo Worker recebe assim, sem o base64): não é gravado */
  bytes?: Uint8Array;
}

// O estado do PS2 tem ~48 MB: montar uma string gigante byte a byte e passar pelo btoa travava a tela ~2 s ao salvar
// (Chrome 157). O navegador tem a conversão nativa (toBase64/fromBase64, ~60/100 ms); sem ela, pedaços de 96 KB (múltiplo
// de 3, então as partes juntas dão o mesmo base64), ~6× mais rápido que a string inteira.
type ComBase64 = { toBase64?: () => string };
type DeBase64 = { fromBase64?: (t: string) => Uint8Array };
export const b64 = (u8: Uint8Array): string => {
  const nativo = (u8 as ComBase64).toBase64;
  if (nativo) return nativo.call(u8);
  const P = 3 * 0x8000;
  const partes: string[] = [];
  for (let i = 0; i < u8.length; i += P) {
    const c = u8.subarray(i, i + P);
    let s = '';
    for (let j = 0; j < c.length; j += 0x2000)
      s += String.fromCharCode.apply(null, Array.from(c.subarray(j, j + 0x2000)));
    partes.push(btoa(s));
  }
  return partes.join('');
};
export const deB64 = (t: string): Uint8Array => {
  const nativo = (Uint8Array as unknown as DeBase64).fromBase64;
  if (nativo) return nativo(t);
  const s = atob(t);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
};

/** O objeto que o antigo guardava (KofEstado.capturar de um núcleo libretro). */
export function capturado(nucleo: string, estado: Uint8Array): EstadoDoNucleo {
  return Object.assign(nucleo === 'snes9x' ? { s9x: 1 } : {}, { lr: nucleo, d: b64(estado) });
}

/**
 * O JSON do estado como texto, sem passar o base64 (dezenas de MB) pelo JSON.stringify: o base64 não tem nada que precise
 * de escape. Mesmo texto que `JSON.stringify(capturado(...))`.
 */
export function textoDoCapturado(nucleo: string, estado: Uint8Array): string {
  return `{${nucleo === 'snes9x' ? '"s9x":1,' : ''}"lr":${JSON.stringify(nucleo)},"d":"${b64(estado)}"}`;
}

/**
 * Lê o JSON do estado. Quando o base64 é o último campo (como o app grava), ele é recortado sem o JSON.parse percorrer os
 * MB dele; qualquer outro formato vai pelo JSON.parse.
 */
export function capturadoDoTexto(t: string): EstadoDoNucleo {
  const i = t.indexOf('"d":"');
  if (i > 0 && t.endsWith('"}') && t.indexOf('"', i + 5) === t.length - 2) {
    const o = JSON.parse(t.slice(0, i) + '"d":""}') as EstadoDoNucleo;
    o.d = t.slice(i + 5, -2);
    return o;
  }
  return JSON.parse(t) as EstadoDoNucleo;
}

/** Os bytes do estado, se for do mesmo núcleo (o KofEstado.restaurar do antigo). */
export function bytesDoCapturado(o: EstadoDoNucleo, nucleo: string): Uint8Array {
  const de = o.lr ?? (o.s9x ? 'snes9x' : 'kof');
  if (de !== nucleo)
    throw new Error(
      de === 'kof'
        ? 'esse estado é do núcleo Kof do SNES (ele entra no app novo quando a Mel liberar a licença dele)'
        : 'esse estado é de outro núcleo',
    );
  if (o.bytes?.length) return o.bytes;
  if (!o.d) throw new Error('estado vazio');
  return deB64(o.d);
}

/** Estado → bytes da loja (gzip na `estados`, texto puro na `autos`). */
export async function empacotarEstado(nucleo: string, estado: Uint8Array, comprimir: boolean): Promise<Uint8Array> {
  const t = new TextEncoder().encode(textoDoCapturado(nucleo, estado));
  return comprimir ? gz(t) : t;
}

/** Bytes da loja → estado, já com os bytes decodificados (sem o base64, que não precisa sair daqui). */
export async function desempacotarEstado(dados: Uint8Array, comprimido: boolean): Promise<EstadoDoNucleo> {
  const o = capturadoDoTexto(new TextDecoder().decode(comprimido ? await ungz(dados) : dados));
  const { d, ...resto } = o;
  return d ? { ...resto, bytes: deB64(d) } : o;
}
