// Savestates do jogo (F5 salva, F8 carrega o último, F6 abre a tela), com o print do momento e o limite por jogo.
import {
  bytesDaPasta,
  bytesDoCapturado,
  bytesDoJogo,
  estadosDe,
  guardarEstado,
  LIMITES_ESTADOS,
  lerEstado,
  limitarEstados,
  mudarJogo,
  registrar,
  textoDoErro,
  type EstadoDoNucleo,
  type EstadoSalvo,
} from '@kof/app-core';
import { quando as quandoTexto, type RegistroJogo } from '@kof/domain';
import { NUCLEOS } from '@kof/engine';
import { create } from 'zustand';
import { fotoDoQuadro } from '../app/foto';
import { usarAvisos } from './avisos';
import { config } from './config';
import { nativoLigado, usarJogo } from './jogo';
import { servicos } from './servicos';
import { usarTelas } from './telas';

export const maxEstados = (): number => {
  const v = config().ler('maxEstados');
  return v !== null && (LIMITES_ESTADOS as readonly number[]).includes(Number(v)) ? Number(v) : 20;
};

/** O modo de jogo deixa ter estados? (Hardcore não: M5.4) */
export let podeTerEstados = (): boolean => true;
export function trocarRegraDeEstados(f: () => boolean) {
  podeTerEstados = f;
}
const semEstados = () =>
  usarAvisos.getState().avisar('💀 modo Hardcore: sem estados salvos (troque o modo no menu rápido)', 3000);

export interface Estados {
  /** jogo mostrado na tela de estados */
  jogoDaTela: string | null;
  lista: EstadoSalvo[];
  jogosComEstados: { id: string; nome: string }[];
  /** registro do jogo mostrado (o automático aparece como o 1º cartão: M5.3) */
  registroDaTela: RegistroJogo | null;
  aba: 'estados' | 'emu';
  salvar: () => Promise<void>;
  carregarUltimo: () => Promise<void>;
  carregar: (e: EstadoSalvo) => Promise<void>;
  apagar: (e: EstadoSalvo) => Promise<void>;
  mostrar: (jogo?: string | null, aba?: 'estados' | 'emu') => Promise<void>;
  mudarAba: (a: 'estados' | 'emu') => void;
}

/** Abre o jogo do registro (pela Kof Games ou pela cópia guardada). */
export async function abrirDoRegistro(j: RegistroJogo): Promise<boolean> {
  const { backend, armazem } = servicos();
  const aberto = await bytesDoJogo(backend, armazem, j, { soCabeca: !!j.path && (await nativoLigado(j.sistema)) });
  return usarJogo.getState().abrirJogo(aberto, j.path ? { path: j.path } : {});
}
export { bytesDaPasta };

/** Põe um estado (o objeto do antigo) no jogo aberto. */
export async function restaurar(o: EstadoDoNucleo): Promise<void> {
  const j = usarJogo.getState();
  const sis = j.info?.sistema;
  const nucleo = sis ? NUCLEOS[sis]?.nucleo : undefined;
  if (!j.jogo || !nucleo) throw new Error('nenhum jogo aberto');
  await j.jogo.carregarEstado(bytesDoCapturado(o, nucleo));
  aoCarregarEstado.forEach((f) => f());
}
/** Quem quer saber quando um estado foi carregado (o rebobinar zera: M6). */
export const aoCarregarEstado = new Set<() => void>();

export const usarEstados = create<Estados>()((set, get) => ({
  jogoDaTela: null,
  lista: [],
  jogosComEstados: [],
  registroDaTela: null,
  aba: 'estados',

  salvar: async () => {
    const j = usarJogo.getState();
    const av = usarAvisos.getState();
    if (!j.jogo || !j.registro || !j.info) return av.avisar('abra um jogo primeiro');
    if (!podeTerEstados()) return semEstados();
    try {
      const { armazem } = servicos();
      const max = maxEstados();
      const ja = max ? (await estadosDe(armazem, j.registro.id)).length : 0;
      const limitar =
        !max ||
        ja + 1 - max <= 1 ||
        confirm(
          `O limite agora é ${max} estados por jogo e este jogo tem ${ja}. Apagar os ${ja + 1 - max} mais antigos?`,
        );
      const nucleo = NUCLEOS[j.info.sistema]?.nucleo ?? '';
      const capa = fotoDoQuadro(256);
      const estado = await j.jogo.salvarEstado();
      await guardarEstado(armazem, { jogo: j.registro.id, nome: j.nome, quando: Date.now(), capa }, nucleo, estado);
      void mudarJogo(armazem, j.registro.id, (r) => ({ ...r, capa, ultimo: Date.now() }));
      const apagados = limitar ? await limitarEstados(armazem, j.registro.id, max) : 0;
      av.avisar(
        apagados
          ? `💾 estado salvo (limite de ${max} por jogo: apaguei ${apagados === 1 ? 'o mais antigo' : 'os ' + apagados + ' mais antigos'})`
          : '💾 estado salvo',
        apagados ? 3500 : 1500,
      );
      if (usarTelas.getState().atual === 'estados') await get().mostrar(j.registro.id);
    } catch (e) {
      av.avisar(`não consegui salvar o estado: ${e instanceof Error ? e.message : String(e)}`, 4000);
    }
  },

  carregarUltimo: async () => {
    const j = usarJogo.getState();
    if (!j.jogo || !j.registro) return usarAvisos.getState().avisar('abra um jogo primeiro');
    if (!podeTerEstados()) return semEstados();
    const l = await estadosDe(servicos().armazem, j.registro.id);
    const ultimo = l[0];
    if (ultimo) await get().carregar(ultimo);
    else usarAvisos.getState().avisar('nenhum estado salvo deste jogo (F5 salva)');
  },

  carregar: async (e) => {
    if (!podeTerEstados()) return semEstados();
    const { armazem } = servicos();
    try {
      if (e.jogo !== usarJogo.getState().registro?.id) {
        // estado de outro jogo: abre o jogo antes
        const reg = await armazem.meta<RegistroJogo>('jogos', e.jogo);
        if (!reg) return usarAvisos.getState().avisar('a ROM desse jogo não está na biblioteca', 4000);
        if (!(await abrirDoRegistro(reg))) return;
      }
      await restaurar(await lerEstado(armazem, e.key));
      usarTelas.getState().abrir('jogo');
      usarAvisos.getState().avisar('estado de ' + quandoTexto(e.quando) + ' carregado');
    } catch (er) {
      registrar('error', 'estados', textoDoErro(er));
      usarAvisos
        .getState()
        .avisarErro('não consegui carregar o estado: ' + (er instanceof Error ? er.message : String(er)));
    }
  },

  apagar: async (e) => {
    await servicos().armazem.apagar('estados', e.key);
    await get().mostrar(get().jogoDaTela);
  },

  mostrar: async (jogo, aba) => {
    const { armazem } = servicos();
    const todos = await estadosDe(armazem);
    const atual = jogo ?? usarJogo.getState().registro?.id ?? todos[0]?.jogo ?? null;
    const nomes = new Map<string, string>();
    for (const e of todos) if (!nomes.has(e.jogo)) nomes.set(e.jogo, e.nome);
    const reg = atual ? await armazem.meta<RegistroJogo>('jogos', atual) : null;
    if (atual && !nomes.has(atual))
      nomes.set(atual, reg?.nome ?? usarJogo.getState().nome ?? atual.split('|')[0] ?? atual);
    const ids = [...new Set([atual, ...todos.map((e) => e.jogo)].filter((x): x is string => !!x))];
    set({
      jogoDaTela: atual,
      registroDaTela: reg,
      lista: todos.filter((e) => e.jogo === atual),
      jogosComEstados: ids.map((id) => ({ id, nome: nomes.get(id) ?? id.split('|')[0] ?? id })),
      ...(aba ? { aba } : {}),
    });
    usarTelas.getState().abrir('estados');
  },
  mudarAba: (aba) => set({ aba }),
}));
