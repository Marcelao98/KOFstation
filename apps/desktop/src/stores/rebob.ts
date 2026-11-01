// Rebobinar na tela (app.js 1845–1875 do antigo): segurar Backspace (ou Select+Y no controle) volta no tempo em preto e
// branco; a ampulheta mostra os segundos voltando e, depois, a recarga. Quem guarda e volta é o Worker (engine).
import { nomeModo } from '@kof/domain';
import type { SituacaoRebob } from '@kof/engine';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { aoMudarRebob, depoisDeAbrirJogo, usarJogo } from './jogo';
import { usarModo } from './modo';

export interface EstadoRebob {
  r: SituacaoRebob | null;
  /** segurando a tecla de voltar */
  tecla: boolean;
  /** Select+Y no controle */
  pad: boolean;
}

export const usarRebob = create<EstadoRebob>()(() => ({ r: null, tecla: false, pad: false }));

/** O jogo recebe as regras do modo atual. */
export function configurarRebobinar() {
  const { regras } = usarModo.getState();
  usarJogo.getState().jogo?.configurarRebobinar(regras.rebobinar, regras.rebobLimite, regras.recargaX);
}

/** Texto e quanto a ampulheta está cheia. */
export function ampulheta(r: SituacaoRebob | null): { texto: string; enche: number } {
  if (!r) return { texto: '', enche: 0 };
  if (r.rebobinando)
    return { texto: '⏪ ' + r.segundos.toFixed(1).replace('.', ',') + ' s', enche: r.segundos / Math.max(1, r.limite) };
  if (r.recarga > 0) return { texto: '⏳ ' + Math.ceil(r.recarga / 60) + ' s', enche: 1 - r.recarga / r.recargaTotal };
  return { texto: '', enche: 0 };
}

let querAntes = false;
let avisoQuando = 0;

/** Chamado ~120×/s pela entrada do jogo: liga/desliga o voltar no Worker e dá os avisos. */
export function conferirRebobinar(noJogo: boolean) {
  const j = usarJogo.getState();
  const { tecla, pad, r } = usarRebob.getState();
  const quer = !!j.jogo && noJogo && !j.pausaManual && (tecla || pad);
  if (quer !== querAntes) {
    querAntes = quer;
    j.jogo?.rebobinar(quer);
  }
  if (!quer || Date.now() - avisoQuando < 900) return;
  const regras = usarModo.getState().regras;
  if (!regras.rebobinar) {
    avisoQuando = Date.now();
    usarAvisos.getState().avisar('modo ' + nomeModo(usarModo.getState().modo) + ': sem rebobinar', 1500);
  } else if (r && r.recarga > 0) {
    avisoQuando = Date.now();
    usarAvisos.getState().avisar('⏳ rebobinar recarregando: ' + Math.ceil(r.recarga / 60) + ' s de jogo', 900);
  }
}

/** A situação chegou do Worker. */
export function situacaoDoRebob(r: SituacaoRebob) {
  const antes = usarRebob.getState().r;
  usarRebob.setState({ r });
  document.body.classList.toggle('rebobinando', r.rebobinando);
  if (antes && antes.recarga > 0 && r.recarga === 0 && !r.rebobinando)
    usarAvisos.getState().avisar('⏳ rebobinar pronto', 1500);
}

depoisDeAbrirJogo.add(configurarRebobinar);
usarModo.subscribe((m, a) => {
  if (m.regras !== a.regras) configurarRebobinar();
});
aoMudarRebob.add(situacaoDoRebob);
