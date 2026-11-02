// Caçador de bugs: a assinatura da imagem e o replay do pacote (bugs/reproduzir.cjs do antigo). O núcleo é
// determinístico: o estado do marco + os mesmos botões, quadro a quadro, chegam na mesma imagem.
import type { SessaoLibretro } from './libretro';
import type { ReplayDoBug } from './mensagens';

/** Assinatura da imagem (o `assinatura` do antigo, sobre os pixels que o app mostra) + quantos quadros. */
export function assinaturaDoQuadro(q: Uint32Array, quadros: number): string {
  let t = 0;
  for (let p = 0; p < q.length; p++) t = (Math.imul(t, 31) + ((q[p] ?? 0) & 0xffffff)) & 0x7fffffff;
  return `${t}:${quadros}`;
}

const deB64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

/** Roda o replay numa sessão já com a ROM carregada. Devolve a assinatura do fim (igual à do pacote = reproduzido). */
export function reproduzir(s: SessaoLibretro, r: ReplayDoBug): { assinatura: string; igual: boolean } {
  if (!r.estado) throw new Error('o pacote não tem replay (o caçador de bugs estava desligado)');
  s.carregarEstado(deB64(r.estado));
  const ent = new Uint16Array(deB64(r.entradas).slice().buffer);
  for (const b of ent) {
    s.pad[0] = b;
    s.rodar();
  }
  const assinatura = assinaturaDoQuadro(s.quadro, ent.length);
  return { assinatura, igual: assinatura === r.agora.assinatura };
}
