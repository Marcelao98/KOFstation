// Celular como controle (M13.3), os formatos do antigo:
// - pela rede pareada: canal `pad` com o texto "botões,eixos" (eixos = 4 int8 num inteiro de 32 bits) e o PC
//   responde no `pad-ok` {jogador, sis, nome} (jogadores.js do antigo)
// - pelo servidor do APK (ControleServidor, porta 8642): 6 bytes por mudança, botões (u16 LE) + 4 eixos int8; o PC
//   conecta com "KOF <senha> <nome>" e conta o jogo com "JOGO <sis>\t<nome>" (app.js 1000–1050 do antigo)

export interface PadCelular {
  /** botões no formato do SNES do app */
  b: number;
  /** 4 eixos de -32767 a 32767 */
  e: number[];
}

const escala = (x: number) => Math.round((x * 32767) / 127);

/** O texto "botões,eixos" do canal `pad`. */
export function padDaRede(dados: string): PadCelular {
  const [b, e] = String(dados).split(',');
  const ei = Number(e) | 0;
  return { b: Number(b) & 0xffff, e: [(ei << 24) >> 24, (ei << 16) >> 24, (ei << 8) >> 24, ei >> 24].map(escala) };
}

/** O que o celular manda no canal `pad` (o android.js do antigo). */
export function padPraRede(b: number, eixos: readonly number[]): string {
  const i8 = (v: number) => Math.max(-127, Math.min(127, Math.round((v * 127) / 32767))) & 255;
  const e = i8(eixos[0] ?? 0) | (i8(eixos[1] ?? 0) << 8) | (i8(eixos[2] ?? 0) << 16) | (i8(eixos[3] ?? 0) << 24) | 0;
  return `${b & 0xffff},${e}`;
}

/** Os 6 bytes do ControleServidor do APK, ou null se veio curto. */
export function padDoServidor(d: ArrayBuffer | Uint8Array): PadCelular | null {
  const u = new Int8Array(d instanceof Uint8Array ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d);
  if (u.length < 6) return null;
  return { b: ((u[0] ?? 0) & 255) | (((u[1] ?? 0) & 255) << 8), e: [2, 3, 4, 5].map((k) => escala(u[k] ?? 0)) };
}

/** "192.168.0.15 4821" ou "192.168.0.15:8642 4821" (o que o celular mostra) → endereço e senha. */
export function enderecoDoControle(texto: string): { url: string; senha: string } | null {
  const m = /^\s*(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?\s+(\d{4})\s*$/.exec(texto || '');
  if (!m) return null;
  return { url: `ws://${m[1]}:${m[2] || 8642}`, senha: m[3] ?? '' };
}

/** A linha que conta pro celular qual jogo está aberto (ele troca o controle pro daquele console). */
export function linhaDoJogo(sis: string, nome: string): string {
  return 'JOGO ' + sis + '\t' + nome.replace(/[\t\n]/g, ' ').slice(0, 80);
}
