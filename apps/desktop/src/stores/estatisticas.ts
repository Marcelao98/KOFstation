// 📊 Estatísticas: conta o tempo jogando de verdade (jogo aberto e não pausado), soma a cada 10 s na parte deste
// aparelho, conta uma sessão por jogo aberto, e a tela (mostrarEstat do antigo) com o Espaço usado.
import {
  aparelhoDe,
  espacoUsado,
  listarEstatisticas,
  listarJogos,
  mudarJogo,
  registrar,
  somarSessao,
  somarTempo,
  textoDoErro,
  type EspacoDaLoja,
} from '@kof/app-core';
import type { VisaoStats } from '@kof/domain';
import { create } from 'zustand';
import { pausaAtual } from '../hooks/usePausa';
import { config } from './config';
import { usarJogo } from './jogo';
import { servicos } from './servicos';
import { usarTelas } from './telas';

let jogando = 0;
let jogoAtual: { id: string; nome: string } | null = null;
let antes = performance.now();

/** Grava o tempo acumulado do jogo atual (o registrarTempo do antigo: só a partir de 1 s). */
async function gravarTempo(): Promise<void> {
  if (!jogoAtual || jogando < 1000) return;
  const ms = Math.round(jogando);
  jogando = 0;
  const { id, nome } = jogoAtual;
  try {
    await somarTempo(servicos().armazem, aparelhoDe(config()).id, id, nome, ms);
  } catch (e) {
    registrar('warn', 'estatisticas', textoDoErro(e));
  }
}

setInterval(() => {
  const agora = performance.now();
  const dt = Math.min(agora - antes, 2000);
  antes = agora;
  if (jogoAtual && !pausaAtual.pausado && document.visibilityState === 'visible') jogando += dt;
}, 500);
setInterval(() => void gravarTempo(), 10000);
addEventListener('pagehide', () => void gravarTempo());

// jogo novo: grava o tempo do anterior e conta uma sessão
usarJogo.subscribe((s, a) => {
  const id = s.registro?.id ?? null;
  if (id === (a.registro?.id ?? null)) return;
  void gravarTempo();
  jogoAtual = id && s.registro ? { id, nome: s.registro.nome } : null;
  jogando = 0;
  if (jogoAtual) {
    const { id: i, nome } = jogoAtual;
    void somarSessao(servicos().armazem, aparelhoDe(config()).id, i, nome).catch((e: unknown) =>
      registrar('warn', 'estatisticas', textoDoErro(e)),
    );
  }
});

export interface Estatisticas {
  lista: VisaoStats[];
  espaco: EspacoDaLoja[] | null;
  mostrar: () => Promise<void>;
  calcularEspaco: () => Promise<void>;
  limparAutos: () => Promise<void>;
}

export const usarEstatisticas = create<Estatisticas>()((set, get) => ({
  lista: [],
  espaco: null,
  mostrar: async () => {
    usarTelas.getState().abrir('estatisticas');
    await gravarTempo();
    try {
      set({ lista: await listarEstatisticas(servicos().armazem), espaco: null });
    } catch (e) {
      registrar('warn', 'estatisticas', textoDoErro(e));
      set({ lista: [] });
    }
  },
  calcularEspaco: async () => {
    set({ espaco: await espacoUsado(servicos().backend) });
  },
  limparAutos: async () => {
    const { armazem } = servicos();
    for (const r of await armazem.listar('autos')) await armazem.apagar('autos', r.key);
    for (const j of await listarJogos(armazem))
      if (j.temAuto) await mudarJogo(armazem, j.id, (x) => ({ ...x, temAuto: false }));
    await get().calcularEspaco();
  },
}));
