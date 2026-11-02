// Estatísticas (registrarTempo/contarSessao/carregarEstat do antigo): cada aparelho soma na sua parte do registro (o
// KofGuarda, em domain/guarda.ts); a tela vê a soma. Loja `stats`, chave = id do jogo. E o Espaço usado de cada loja.
import { contarSessao, registrarTempo, visao, type RegistroStats, type VisaoStats } from '@kof/domain';
import type { Armazem } from './armazem';
import type { Backend } from './backend';

/** Uma mudança por jogo de cada vez (o tempo e a sessão podem chegar juntos). */
const fila = new Map<string, Promise<unknown>>();
function mudar(arm: Armazem, id: string, f: (r: RegistroStats | null) => RegistroStats): Promise<void> {
  const antes = fila.get(id) ?? Promise.resolve();
  const p = antes
    .catch(() => undefined) // a anterior falhou: esta tenta mesmo assim
    .then(async () => arm.por('stats', id, f(await arm.meta<RegistroStats>('stats', id))));
  fila.set(id, p);
  return p;
}

export const somarTempo = (arm: Armazem, aparelho: string, id: string, nome: string, ms: number, t = Date.now()) =>
  mudar(arm, id, (r) => registrarTempo(r, id, nome, aparelho, ms, t));

export const somarSessao = (arm: Armazem, aparelho: string, id: string, nome: string, t = Date.now()) =>
  mudar(arm, id, (r) => contarSessao(r, id, nome, aparelho, t));

export async function listarEstatisticas(arm: Armazem): Promise<VisaoStats[]> {
  const l = await arm.listar<RegistroStats>('stats');
  return l
    .filter((r) => r.meta && r.meta.partes)
    .map((r) => visao(r.meta))
    .filter((e) => e.sessoes || e.tempo)
    .sort((a, b) => b.tempo - a.tempo);
}

/** "0 min", "menos de 1 min", "42 min", "3h 07min" (o duracao do antigo). */
export function duracao(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return ms > 0 ? 'menos de 1 min' : '0 min';
  return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'min';
}

export interface EspacoDaLoja {
  store: string;
  nome: string;
  bytes: number;
  items: number;
}

const NOMES: Record<string, string> = {
  roms: 'ROMs (cartuchos)',
  estados: 'Savestates',
  autos: 'Estados automáticos',
  jogos: 'Biblioteca e prints',
  capas: 'Capas baixadas',
  saves: 'Saves',
  stats: 'Estatísticas',
  musicas: 'Jukebox',
  visual: 'Imagem (predefinições)',
  bios: 'BIOS',
};

export async function espacoUsado(b: Backend): Promise<EspacoDaLoja[]> {
  const l = await b.chamar<{ store: string; bytes: number; items: number }[]>('store.space', {});
  return l.filter((x) => x.items).map((x) => ({ ...x, nome: NOMES[x.store] ?? x.store }));
}

/** "1,5 MB" */
export function tamanhoTexto(n: number): string {
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return v.toLocaleString('pt-BR', { maximumFractionDigits: v < 10 ? 1 : 0 }) + ' ' + u[i];
}
