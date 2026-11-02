// Arquivo .spc: a "foto" do chip de som do SNES (o formato padrão das trilhas): SPC700, 64 KB de RAM de som, os 128
// registradores do DSP e a etiqueta ID666. No antigo (web/spc.js) o .spc tocava no chip de som do núcleo Kof; aqui toca
// no Snes9x: o .spc entra no bloco "SND" de um estado do Snes9x (com uma ROM que não mexe no som) e as vozes que estavam
// soando são religadas por um pedacinho de código do SPC700 (como o `konPending` do antigo). O caminho de volta (estado
// do Snes9x → .spc) é o `gravarSpc` do web/nucleo.js.
const ASSINATURA = 'SNES-SPC700 Sound File Data';
const TAM = 0x10200;
/** Tamanho do bloco SND do Snes9x: RAM (64 KB) + inteiros do SPC700 + DSP (registradores em +65700). */
const TAM_SND = 66560;
const REGS_DSP = 65700;

export interface EtiquetaSpc {
  titulo: string;
  jogo: string;
  artista: string;
  segundos: number;
  fadeMs: number;
}

const texto = (u8: Uint8Array, ini: number, n: number) => {
  let t = '';
  for (let i = ini; i < ini + n && u8[i]; i++) t += String.fromCharCode(u8[i] ?? 0);
  return t.trim();
};
const escrever = (u8: Uint8Array, ini: number, n: number, t?: string) => {
  const s = String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');
  for (let i = 0; i < n; i++) u8[ini + i] = i < s.length ? s.charCodeAt(i) : 0;
};

export function ehSpc(u8: Uint8Array | null | undefined): u8 is Uint8Array {
  return !!u8 && u8.length >= 0x10180 && texto(u8, 0, 27) === ASSINATURA;
}

/** Etiqueta ID666 (a de texto, a comum; ou a binária, a antiga). */
export function etiquetasSpc(u8: Uint8Array): EtiquetaSpc {
  const t: EtiquetaSpc = { titulo: '', jogo: '', artista: '', segundos: 0, fadeMs: 0 };
  if (u8[0x23] !== 26) return t;
  t.titulo = texto(u8, 0x2e, 32);
  t.jogo = texto(u8, 0x4e, 32);
  const digitos = (i: number, n: number) => {
    for (let k = i; k < i + n; k++) {
      const c = u8[k] ?? 0;
      if (c && (c < 48 || c > 57)) return false;
    }
    return true;
  };
  if (digitos(0xa9, 3) && digitos(0xac, 5)) {
    t.segundos = +texto(u8, 0xa9, 3) || 0;
    t.fadeMs = +texto(u8, 0xac, 5) || 0;
    t.artista = texto(u8, 0xb1, 32);
  } else {
    const b = (i: number) => u8[i] ?? 0;
    t.segundos = b(0xa9) | (b(0xaa) << 8) | (b(0xab) << 16);
    t.fadeMs = (b(0xac) | (b(0xad) << 8) | (b(0xae) << 16) | (b(0xaf) << 24)) >>> 0;
    t.artista = texto(u8, 0xb0, 32);
  }
  if (t.segundos > 999) t.segundos = 0;
  return t;
}

/** Onde começa o bloco SND num estado do Snes9x (-1 = não achou). */
export function blocoSnd(st: Uint8Array): number {
  const txt = (a: number, n: number) => String.fromCharCode(...st.subarray(a, a + n));
  let p = txt(0, 14).startsWith('#!s9xsnp') ? 14 : -1;
  while (p > 0 && p + 11 < st.length) {
    const nome = txt(p, 3);
    const len = parseInt(txt(p + 4, 6), 10);
    if (!(len >= 0)) break;
    if (nome === 'SND') return len >= TAM_SND ? p + 11 : -1;
    p += 11 + len;
  }
  return -1;
}

/** Os 128 registradores do DSP dentro de um estado do Snes9x (a jukebox lê o envelope de cada voz). */
export function regsDoDsp(st: Uint8Array, snd = blocoSnd(st)): Uint8Array | null {
  return snd < 0 ? null : st.subarray(snd + REGS_DSP, snd + REGS_DSP + 128);
}

/** .spc tirado de um estado do Snes9x (o `gravarSpc` + `KofSpc.gravar` do antigo). */
export function spcDoEstado(st: Uint8Array, tag: Partial<EtiquetaSpc> & { comentario?: string } = {}): Uint8Array {
  const snd = blocoSnd(st);
  if (snd < 0) throw new Error('não achei o estado do chip de som');
  const dv = new DataView(st.buffer, st.byteOffset + snd, TAM_SND);
  const I = (k: number) => dv.getInt32(65536 + 4 * k, true);
  const ram = st.subarray(snd, snd + 65536);
  const regs = st.subarray(snd + REGS_DSP, snd + REGS_DSP + 128);
  const u8 = new Uint8Array(TAM);
  escrever(u8, 0, 33, ASSINATURA + ' v0.30');
  u8[0x21] = 26;
  u8[0x22] = 26;
  u8[0x23] = 26;
  u8[0x24] = 30;
  const pc = I(3) & 0xffff;
  let psw = 0;
  for (let k = 0; k < 8; k++) psw |= (I(8 + k) ? 1 : 0) << (7 - k);
  u8.set([pc & 0xff, pc >> 8, I(5) & 0xff, I(6) & 0xff, I(7) & 0xff, psw, I(4) & 0xff], 0x25);
  escrever(u8, 0x2e, 32, tag.titulo);
  escrever(u8, 0x4e, 32, tag.jogo);
  escrever(u8, 0x6e, 16, 'KOFstation');
  escrever(u8, 0x7e, 32, tag.comentario ?? 'capturado no KOFstation');
  const dt = new Date();
  escrever(
    u8,
    0x9e,
    11,
    `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`,
  );
  escrever(u8, 0xa9, 3, String(Math.min(999, Math.round(tag.segundos || 180))));
  escrever(u8, 0xac, 5, String(Math.min(99999, Math.round(tag.fadeMs || 8000))));
  escrever(u8, 0xb1, 32, tag.artista);
  u8.set(ram, 0x100);
  // registradores de controle ($F0-$FF) tirados dos timers e das portas
  let f1 = I(16) ? 0x80 : 0;
  for (let i = 0; i < 3; i++) {
    if (I(20 + 5 * i)) f1 |= 1 << i;
    u8[0x100 + 0xfa + i] = I(21 + 5 * i) & 0xff;
    u8[0x100 + 0xfd + i] = I(24 + 5 * i) & 15;
  }
  u8[0x100 + 0xf1] = f1;
  u8[0x100 + 0xf2] = I(17) & 0xff;
  u8.set(regs, 0x10100);
  u8.set(ram.subarray(0xffc0, 0x10000), 0x101c0);
  return u8;
}

/** Acha `n` bytes iguais seguidos (área sem uso) na RAM de som, fora da página 0/1, do eco e da ROM de boot. */
function lugarDoStub(ram: Uint8Array, regs: Uint8Array, n: number): number {
  const ecoLigado = !((regs[0x6c] ?? 0) & 0x20);
  const eco0 = (regs[0x6d] ?? 0) << 8;
  const eco1 = eco0 + Math.max(4, ((regs[0x7d] ?? 0) & 15) * 2048);
  let melhor = -1;
  let tamMelhor = 0;
  let ini = 0x200;
  for (let i = 0x201; i <= 0xffc0; i++) {
    if (i < 0xffc0 && ram[i] === ram[ini]) continue;
    const tam = i - ini;
    const noEco = ecoLigado && ini < eco1 && i > eco0;
    if (tam >= n && tam > tamMelhor && !noEco) {
      melhor = ini + ((tam - n) >> 1); // no meio da área
      tamMelhor = tam;
    }
    ini = i;
  }
  return melhor;
}

/**
 * Põe um .spc dentro de um estado do Snes9x (`base`: estado de uma ROM que não mexe no som). As vozes que estavam
 * soando (envelope > 0) são religadas: o SPC700 começa num pedaço de código que escreve o KON do DSP e pula pro PC do
 * .spc (sem mexer nos registradores nem nos flags). Sem lugar livre pra esse código, a música entra na próxima nota.
 */
export function estadoDoSpc(spc: Uint8Array, base: Uint8Array): Uint8Array {
  if (!ehSpc(spc)) throw new Error('isso não parece um arquivo .spc');
  const st = base.slice();
  const snd = blocoSnd(st);
  if (snd < 0) throw new Error('o estado do Snes9x não tem o chip de som');
  const dv = new DataView(st.buffer, st.byteOffset + snd, TAM_SND);
  const S = (k: number, v: number) => dv.setInt32(65536 + 4 * k, v, true);
  const ram = st.subarray(snd, snd + 65536);
  ram.set(spc.subarray(0x100, 0x10100));
  ram.set(spc.subarray(0x101c0, 0x10200), 0xffc0); // a RAM que fica embaixo da ROM de boot
  const regs = st.subarray(snd + REGS_DSP, snd + REGS_DSP + 128);
  regs.set(spc.subarray(0x10100, 0x10180));
  let kon = 0;
  for (let v = 0; v < 8; v++) if ((regs[v * 16 + 8] ?? 0) > 0) kon |= 1 << v;
  regs[0x4c] = 0;
  const f1 = ram[0xf1] ?? 0;
  let pc = (spc[0x25] ?? 0) | ((spc[0x26] ?? 0) << 8);
  const psw = spc[0x2a] ?? 0;
  const dspAddr = ram[0xf2] ?? 0;
  let pswInicio = psw;
  if (kon) {
    // MOV $F2,#$4C · MOV $F3,#kon · MOV $F2,#endereço · (SETP) · JMP !pc — página direta 0 (P = 0) durante o código
    const P = (psw & 0x20) !== 0;
    const stub = [
      0x8f,
      0x4c,
      0xf2,
      0x8f,
      kon,
      0xf3,
      0x8f,
      dspAddr,
      0xf2,
      ...(P ? [0x40] : []),
      0x5f,
      pc & 0xff,
      pc >> 8,
    ];
    const onde = lugarDoStub(ram, regs, stub.length);
    if (onde >= 0) {
      ram.set(stub, onde);
      pc = onde;
      pswInicio = psw & ~0x20;
    }
  }
  S(1, 0); // opcode_number
  S(2, 0); // opcode_cycle = 0: busca uma instrução nova no PC
  S(3, pc);
  S(4, spc[0x2b] ?? 0);
  S(5, spc[0x27] ?? 0);
  S(6, spc[0x28] ?? 0);
  S(7, spc[0x29] ?? 0);
  for (let k = 0; k < 8; k++) S(8 + k, (pswInicio >> (7 - k)) & 1);
  S(16, f1 & 0x80 ? 1 : 0);
  S(17, dspAddr);
  S(18, ram[0xf8] ?? 0);
  S(19, ram[0xf9] ?? 0);
  for (let i = 0; i < 3; i++) {
    S(20 + 5 * i, f1 & (1 << i) ? 1 : 0);
    S(21 + 5 * i, ram[0xfa + i] ?? 0);
    S(22 + 5 * i, 0);
    S(23 + 5 * i, 0);
    S(24 + 5 * i, (ram[0xfd + i] ?? 0) & 15);
  }
  return st;
}

/** ROM de SNES que só liga a tela e fica parada (não fala com o chip de som): a base pra tocar um .spc no Snes9x. */
export function romQuieta(): Uint8Array {
  const r = new Uint8Array(0x8000);
  r.set([0x78, 0x18, 0xfb, 0x80, 0xfe], 0); // SEI; CLC; XCE; BRA -2
  'KOFSTATION SPC'.split('').forEach((c, i) => (r[0x7fc0 + i] = c.charCodeAt(0)));
  for (let i = 14; i < 21; i++) r[0x7fc0 + i] = 0x20;
  r[0x7fd5] = 0x20;
  r[0x7fd7] = 0x05;
  r[0x7ffc] = 0x00;
  r[0x7ffd] = 0x80;
  let s = 0x1fe;
  for (let i = 0; i < r.length; i++) if (i < 0x7fdc || i > 0x7fdf) s = (s + (r[i] ?? 0)) & 0xffff;
  r[0x7fde] = s & 0xff;
  r[0x7fdf] = s >> 8;
  r[0x7fdc] = (s ^ 0xffff) & 0xff;
  r[0x7fdd] = (s ^ 0xffff) >> 8;
  return r;
}

/** Arquivo .wav (PCM 16 bits estéreo) — o cabeçalho do `exportarWav` do antigo. */
export function montarWav(pcm: Int16Array, taxa: number): Uint8Array {
  const cab = new DataView(new ArrayBuffer(44));
  const txt = (o: number, t: string) => {
    for (let i = 0; i < 4; i++) cab.setUint8(o + i, t.charCodeAt(i));
  };
  txt(0, 'RIFF');
  cab.setUint32(4, 36 + pcm.byteLength, true);
  txt(8, 'WAVE');
  txt(12, 'fmt ');
  cab.setUint32(16, 16, true);
  cab.setUint16(20, 1, true);
  cab.setUint16(22, 2, true);
  cab.setUint32(24, taxa, true);
  cab.setUint32(28, taxa * 4, true);
  cab.setUint16(32, 4, true);
  cab.setUint16(34, 16, true);
  txt(36, 'data');
  cab.setUint32(40, pcm.byteLength, true);
  const r = new Uint8Array(44 + pcm.byteLength);
  r.set(new Uint8Array(cab.buffer), 0);
  r.set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), 44);
  return r;
}
