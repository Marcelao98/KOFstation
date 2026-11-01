// Backup .kofsave (app.js `exportarSaves`/`importarSaves` do antigo): saves, estatísticas, configurações (opcional,
// nunca mudo/volume) e savestates (opcional). É a ponte de dados do app antigo pro novo, e vice-versa.
import {
  abrirSave,
  criarPacote,
  decidir,
  juntarStats,
  lerPacote,
  migrarStats,
  NAO_LEVAR,
  type CopiaSave,
  type PacoteKofsave,
  type RegistroSave,
  type RegistroStats,
} from '@kof/domain';
import type { Armazem } from './armazem';
import type { Configuracao } from './config';
import { chaveDoEstado, gravarSaveGuardado, lerSaveGuardado, listarSaves, type MetaEstado } from './saves';

export interface Aparelho {
  id: string;
  nome: string;
}

/** O código deste aparelho (como o APARELHO do antigo: 8 letras guardadas em `aparelho`). */
export function aparelhoDe(cfg: Configuracao): Aparelho {
  let id = cfg.ler('aparelho');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    cfg.guardar('aparelho', id);
  }
  return { id, nome: cfg.ler('aparelhoNome') || 'PC' };
}

export const hojeTexto = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function exportarBackup(
  arm: Armazem,
  cfg: Configuracao,
  comEstados: boolean,
): Promise<{ nome: string; bytes: Uint8Array }> {
  const ap = aparelhoDe(cfg);
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg.todas())) if (!NAO_LEVAR.test(k)) config[k] = v;
  const estados: PacoteKofsave['estados'] = [];
  if (comEstados)
    for (const e of await arm.listar<MetaEstado>('estados')) {
      const dados = await arm.pegar('estados', e.key);
      if (dados) estados.push({ ...e.meta, dados });
    }
  const stats = (await arm.listar<RegistroStats>('stats')).map((r) =>
    r.meta.partes ? r.meta : migrarStats(r.meta, ap.id, r.key, r.key),
  );
  const pacote: PacoteKofsave = {
    versao: 1,
    aparelho: ap.id,
    nome: ap.nome,
    quando: Date.now(),
    saves: await listarSaves(arm),
    stats,
    config,
    estados,
  };
  const bytes = await criarPacote(pacote);
  return { nome: `KOFstation ${ap.nome} ${hojeTexto(Date.now())}.kofsave`, bytes };
}

export interface ResumoImport {
  trazidos: number;
  mantidos: number;
  iguais: number;
  stats: number;
  estados: number;
  config: number;
  /** chaves dos saves trazidos (o jogo aberto pode precisar recarregar o dele) */
  chavesTrazidas: string[];
}

export async function importarBackup(
  arm: Armazem,
  cfg: Configuracao,
  u8: Uint8Array,
  comConfig: boolean,
): Promise<ResumoImport> {
  const p = await lerPacote<Partial<PacoteKofsave>>(u8);
  const ap = aparelhoDe(cfg);
  const r: ResumoImport = { trazidos: 0, mantidos: 0, iguais: 0, stats: 0, estados: 0, config: 0, chavesTrazidas: [] };
  const copia = (x: RegistroSave | null | undefined): CopiaSave | null => {
    if (!x) return null;
    const c: CopiaSave = { dados: x.dados, cheio: x.cheio, hash: x.hash };
    if (x.quando !== undefined) c.quando = x.quando;
    if (x.aparelho !== undefined) c.aparelho = x.aparelho;
    return c;
  };
  for (const fora of p.saves ?? []) {
    if (!fora?.chave || !(fora.dados instanceof Uint8Array)) continue;
    const aqui = await lerSaveGuardado(arm, fora.chave);
    const d = decidir(aqui, fora);
    if (d === 'trazer') {
      await gravarSaveGuardado(arm, { ...fora, anterior: copia(aqui) ?? fora.anterior ?? null });
      r.trazidos++;
      r.chavesTrazidas.push(fora.chave);
    } else if (d === 'manter' && aqui) {
      if (!aqui.anterior || aqui.anterior.hash !== fora.hash)
        await gravarSaveGuardado(arm, { ...aqui, anterior: copia(fora) ?? null });
      r.mantidos++;
    } else r.iguais++;
  }
  for (const s of p.stats ?? []) {
    if (!s) continue;
    const fora = 'partes' in s ? s : migrarStats(s, p.aparelho || 'outro', s.id ?? '', s.nome ?? '');
    if (!fora.id) continue;
    let aqui = await arm.meta<RegistroStats>('stats', fora.id);
    if (aqui && !aqui.partes) aqui = migrarStats(aqui, ap.id, aqui.id, aqui.nome);
    const junto = juntarStats(aqui, fora);
    if (junto) await arm.por('stats', fora.id, junto);
    r.stats++;
  }
  if (p.estados?.length) {
    const ja = new Set((await arm.listar<MetaEstado>('estados')).map((e) => e.key));
    for (const e of p.estados) {
      if (!e?.jogo || !(e.dados instanceof Uint8Array)) continue;
      const k = chaveDoEstado(e.jogo, e.quando);
      if (ja.has(k)) continue;
      const meta: MetaEstado = { jogo: e.jogo, nome: e.nome, quando: e.quando };
      if (e.capa) meta.capa = e.capa;
      await arm.por('estados', k, meta, e.dados);
      r.estados++;
    }
  }
  if (comConfig)
    for (const [k, v] of Object.entries(p.config ?? {}))
      if (!NAO_LEVAR.test(k) && typeof v === 'string') {
        cfg.guardar(k, v);
        r.config++;
      }
  return r;
}

export function resumoDoImport(r: ResumoImport): string {
  return (
    `📥 backup trazido: ${r.trazidos} save(s) novo(s)` +
    (r.mantidos ? `, ${r.mantidos} mais velho(s) guardado(s) como cópia` : '') +
    `, ${r.stats} jogo(s) nas estatísticas` +
    (r.estados ? `, ${r.estados} savestate(s)` : '') +
    (r.config ? `, ${r.config} configuração(ões) (vale ao reabrir)` : '')
  );
}

/** Os bytes de bateria de um save trazido (pra pôr no jogo aberto). */
export async function bytesDoSave(arm: Armazem, chave: string): Promise<Uint8Array | null> {
  const s = await lerSaveGuardado(arm, chave);
  return s ? abrirSave(s) : null;
}
