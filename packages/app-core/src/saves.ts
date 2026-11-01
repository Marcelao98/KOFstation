// Saves de bateria e estados nas lojas do Rust, no MESMO formato de registro do antigo (KofGuarda): na loja `saves`
// a chave é a do antigo (sram.<título>.<tamanho>); os metadados vão no JSON e os bytes comprimidos (o save + a cópia
// anterior, se tem) no binário. Estados: chave "<jogoId>/<quando>", metadados {jogo, nome, quando, capa}.
import type { CopiaSave, RegistroSave } from '@kof/domain';
import type { Armazem } from './armazem';

interface MetaSave extends Omit<RegistroSave, 'dados' | 'anterior'> {
  /** tamanho do save comprimido dentro do binário (o resto é a cópia anterior) */
  n: number;
  anterior?: Omit<CopiaSave, 'dados'> | null;
}

export async function lerSaveGuardado(arm: Armazem, chave: string): Promise<RegistroSave | null> {
  const meta = await arm.meta<MetaSave>('saves', chave);
  if (!meta) return null;
  const bin = (await arm.pegar('saves', chave)) ?? new Uint8Array(0);
  const { n, anterior, ...resto } = meta;
  const r: RegistroSave = { ...resto, dados: bin.slice(0, n) };
  if (anterior) r.anterior = { ...anterior, dados: bin.slice(n) };
  return r;
}

export async function gravarSaveGuardado(arm: Armazem, r: RegistroSave): Promise<void> {
  const { dados, anterior, ...resto } = r;
  const meta: MetaSave = { ...resto, n: dados.length };
  let bin = dados;
  if (anterior) {
    const { dados: ad, ...am } = anterior;
    meta.anterior = am;
    bin = new Uint8Array(dados.length + ad.length);
    bin.set(dados);
    bin.set(ad, dados.length);
  }
  await arm.por('saves', r.chave, meta, bin);
}

export async function listarSaves(arm: Armazem): Promise<RegistroSave[]> {
  const l = await arm.listar<MetaSave>('saves');
  const r: RegistroSave[] = [];
  for (const x of l) {
    const s = await lerSaveGuardado(arm, x.key);
    if (s) r.push(s);
  }
  return r;
}

export interface MetaEstado {
  jogo: string;
  nome: string;
  quando: number;
  /** print do momento (data URL) */
  capa?: string;
}

export const chaveDoEstado = (jogo: string, quando: number) => `${jogo}/${quando}`;
