// Rede entre aparelhos (M13; o web/rede.js do antigo): a página fala com o serviço de rede do kofstation pelo mesmo
// JSON da API local do antigo (third_party/kofrede/PROTOCOLO.md). Quem abre o caminho é a plataforma (`Backend.rede`):
// no app, uma WebSocket local com token; nos testes, um serviço de mentira em memória.
import type { Backend } from './backend';

export interface AparelhoRede {
  id: string;
  nome: string;
  tipo: string;
  online: boolean;
  /** segundos (relógio do PC) */
  visto: number;
  ip: string;
}

export interface AchadoRede {
  id: string;
  ip: string;
  porta: number;
  pareado: boolean;
  tipo: string;
  nome: string;
}

export type EventoRede =
  | { t: 'lista'; eu: { id: string; nome: string; visivel: boolean }; aparelhos: AparelhoRede[] }
  | { t: 'achados'; lista: AchadoRede[] }
  | { t: 'parear'; codigo: string; seg: number; ip: string; porta: number; qr: string }
  | { t: 'parear-fim'; motivo?: string }
  | { t: 'pareado'; aparelho: { id: string; nome: string; tipo: string } }
  | { t: 'par-erro'; texto: string }
  | { t: 'msg'; de: string; canal: string; dados: string }
  | { t: 'nao-enviou'; para: string };

export type PedidoRede =
  | { t: 'eu' | 'lista' | 'parear' | 'parear-fim' | 'achar' }
  | { t: 'nome'; nome: string }
  | { t: 'visivel'; sim: boolean }
  | { t: 'remover' | 'conectar'; id: string }
  | { t: 'parear-com'; ip: string; porta: number; senha: string; modo: 'c' | 'q' }
  | { t: 'enviar'; para: string; canal: string; dados: string };

/** Um caminho aberto até o serviço de rede. */
export interface CanalRede {
  mandar(p: PedidoRede): boolean;
  /** cada evento que chega; `fechou` quando o caminho cai */
  ouvir(evento: (m: EventoRede) => void, fechou: () => void): void;
}

/**
 * Liga na rede e religa a cada 10 s se cair (como o antigo). Devolve quem manda pedidos (false = sem rede agora).
 * `mudou(ok)` avisa quando liga e quando cai.
 */
export function ligarRede(
  backend: Backend,
  evento: (m: EventoRede) => void,
  mudou: (ok: boolean) => void,
  religar: (f: () => void) => unknown = (f) => setTimeout(f, 10000),
): (p: PedidoRede) => boolean {
  let canal: CanalRede | null = null;
  const tentar = () => {
    if (!backend.rede) return; // plataforma sem rede
    backend.rede().then(
      (c) => {
        canal = c;
        c.ouvir(evento, () => {
          canal = null;
          mudou(false);
          religar(tentar);
        });
        mudou(true);
        c.mandar({ t: 'eu' });
      },
      () => {
        mudou(false);
        religar(tentar);
      },
    );
  };
  tentar();
  return (p) => canal?.mandar(p) ?? false;
}

/** "agora há pouco", "há 5 min", "há 3 h", "há 2 dias" (o quandoFoi do antigo). */
export function quandoFoi(s: number, agoraSeg = Date.now() / 1000): string {
  if (!s) return 'nunca';
  const m = Math.round((agoraSeg - s) / 60);
  return m < 2
    ? 'agora há pouco'
    : m < 60
      ? `há ${m} min`
      : m < 48 * 60
        ? `há ${Math.round(m / 60)} h`
        : `há ${Math.round(m / 1440)} dias`;
}

/** A linha do cartão 📡 Aparelhos no Início. */
export function textoDoInicio(aparelhos: AparelhoRede[]): string {
  const on = aparelhos.filter((a) => a.online);
  if (!aparelhos.length) return 'parear o celular com o PC';
  return on.length
    ? '🟢 conectado: ' + on.map((a) => a.nome).join(', ')
    : `${aparelhos.length} pareado(s), nenhum na rede agora`;
}

/** O pedido de pareamento que o QR do PC traz (`kofstation://parear?ip=&p=&id=&s=&n=`), ou null. */
export function pedidoDoQr(texto: string): { ip: string; porta: number; senha: string; nome: string } | null {
  if (!/^kofstation:\/\/parear\?/.test(texto)) return null;
  const p = new URL(texto.replace(/^kofstation:/, 'http:')).searchParams;
  const ip = p.get('ip'),
    s = p.get('s');
  if (!ip || !s) return null;
  return { ip, porta: Number(p.get('p')) || 8650, senha: s, nome: p.get('n') || 'o PC' };
}
