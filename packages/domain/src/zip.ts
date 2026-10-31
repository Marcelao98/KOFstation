// Lê o diretório de um .zip (sem descompactar): nome, método e onde estão os dados de cada arquivo.
export interface EntradaZip {
  nome: string;
  /** 0 = guardado, 8 = deflate */
  metodo: number;
  tamanho: number;
  comprimido: number;
  crc: number;
  /** onde começa o cabeçalho local */
  local: number;
}

export const ehZip = (u8: Uint8Array): boolean => u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04;

export function listarZip(u8: Uint8Array): EntradaZip[] {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let fim = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      fim = i;
      break;
    }
  if (fim < 0) throw new Error('zip sem o diretório no fim (arquivo cortado?)');
  const lista: EntradaZip[] = [];
  let p = v.getUint32(fim + 16, true);
  for (let k = v.getUint16(fim + 10, true); k > 0; k--) {
    if (p + 46 > u8.length || v.getUint32(p, true) !== 0x02014b50) throw new Error('diretório do zip estragado');
    const n = v.getUint16(p + 28, true);
    lista.push({
      nome: new TextDecoder().decode(u8.subarray(p + 46, p + 46 + n)),
      metodo: v.getUint16(p + 10, true),
      crc: v.getUint32(p + 16, true),
      comprimido: v.getUint32(p + 20, true),
      tamanho: v.getUint32(p + 24, true),
      local: v.getUint32(p + 42, true),
    });
    p += 46 + n + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return lista;
}

/** Os bytes (ainda comprimidos, se metodo 8) de uma entrada. */
export function dadosDaEntrada(u8: Uint8Array, e: EntradaZip): Uint8Array {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (v.getUint32(e.local, true) !== 0x04034b50) throw new Error(`cabeçalho do ${e.nome} estragado`);
  const ini = e.local + 30 + v.getUint16(e.local + 26, true) + v.getUint16(e.local + 28, true);
  return u8.subarray(ini, ini + e.comprimido);
}
