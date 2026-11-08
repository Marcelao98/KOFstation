// 📡 Rede entre aparelhos (o `rede` do web/rede.js do antigo): o estado que a tela Aparelhos e o Início mostram, e os
// pedidos pro serviço de rede. Liga sozinho na abertura e religa a cada 10 s se cair. Quem quiser ouvir mensagens de
// um canal (celular como controle, Jogar no PC) usa `ouvirRede`.
import { ligarRede, type AchadoRede, type AparelhoRede, type EventoRede, type PedidoRede } from '@kof/app-core';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { servicos } from './servicos';

export interface JanelaPar {
  codigo: string;
  qr: string;
  ip: string;
  porta: number;
  /** ms (Date.now) */
  ate: number;
}

export interface EstadoRede {
  ok: boolean;
  eu: { id: string; nome: string; visivel: boolean } | null;
  aparelhos: AparelhoRede[];
  achados: AchadoRede[] | null;
  janela: JanelaPar | null;
  msg: string;
  mandar: (p: PedidoRede) => boolean;
  setMsg: (m: string) => void;
}

const ouvintes = new Set<(m: EventoRede) => void>();
/** Ouve os eventos da rede (devolve como parar). */
export function ouvirRede(f: (m: EventoRede) => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

let mandar: (p: PedidoRede) => boolean = () => false;

export const usarRede = create<EstadoRede>()((set) => ({
  ok: false,
  eu: null,
  aparelhos: [],
  achados: null,
  janela: null,
  msg: '',
  mandar: (p) => mandar(p),
  setMsg: (msg) => set({ msg }),
}));

function evento(m: EventoRede) {
  const set = usarRede.setState;
  switch (m.t) {
    case 'lista':
      set({ ok: true, eu: m.eu, aparelhos: m.aparelhos ?? [] });
      break;
    case 'achados':
      set({ achados: m.lista ?? [] });
      break;
    case 'parear':
      set({ janela: { codigo: m.codigo, qr: m.qr, ip: m.ip, porta: m.porta, ate: Date.now() + m.seg * 1000 } });
      break;
    case 'parear-fim':
      set({ janela: null, ...(m.motivo ? { msg: '⏱ Pareamento encerrado: ' + m.motivo } : {}) });
      break;
    case 'pareado':
      set({ janela: null, msg: '✅ Pareado com ' + m.aparelho.nome });
      usarAvisos.getState().avisar('📡 Pareado com ' + m.aparelho.nome, 4000);
      break;
    case 'par-erro':
      set({ msg: '⚠ ' + m.texto });
      break;
    default:
      break;
  }
  for (const f of [...ouvintes])
    try {
      f(m);
    } catch (e) {
      console.warn('ouvinte da rede falhou', e); // um ouvinte com problema não cala os outros
    }
}

/** Liga na abertura do app (main.tsx), meio segundo depois, como o antigo. */
export function ligarARede(): void {
  setTimeout(() => {
    mandar = ligarRede(servicos().backend, evento, (ok) => usarRede.setState(ok ? { ok: true } : { ok: false }));
  }, 500);
}
