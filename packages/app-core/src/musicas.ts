// As músicas da jukebox (loja `musicas`, como no antigo): a faixa guardada no jogo (F7) leva o estado do núcleo daquele
// momento (os bytes) e toca numa instância separada do núcleo, com a ROM do jogo; o .spc importado leva o arquivo.
import type { SistemaId } from '@kof/domain';
import type { Armazem } from './armazem';

export interface MetaMusica {
  origem: 'jogo' | 'spc';
  titulo: string;
  /** nome do jogo (agrupa a lista) */
  jogo: string;
  /** id do jogo na biblioteca ("título|tamanho"): de onde vem a ROM pra tocar */
  jogoId?: string;
  sistema?: SistemaId;
  artista?: string;
  segundos?: number;
  fadeMs?: number;
  quando: number;
  /** print do jogo no momento (data URL), a capa quando não tem capa oficial */
  capa?: string;
}

export interface Faixa extends MetaMusica {
  key: string;
}

export async function listarMusicas(arm: Armazem): Promise<Faixa[]> {
  const l = await arm.listar<MetaMusica>('musicas');
  return l
    .filter((r) => r.meta && r.meta.titulo)
    .map((r) => ({ ...r.meta, key: r.key }))
    .sort((a, b) => (a.jogo || '').localeCompare(b.jogo || '', 'pt-BR') || a.quando - b.quando);
}

export async function guardarMusica(arm: Armazem, meta: MetaMusica, bytes: Uint8Array): Promise<string> {
  const key = String(meta.quando);
  await arm.por('musicas', key, meta, bytes);
  return key;
}

export async function bytesDaMusica(arm: Armazem, key: string): Promise<Uint8Array> {
  const b = await arm.pegar('musicas', key);
  if (!b) throw new Error('essa música não está mais guardada');
  return b;
}

export async function renomearMusica(arm: Armazem, f: Faixa, titulo: string): Promise<void> {
  const bytes = await bytesDaMusica(arm, f.key);
  const meta: Partial<Faixa> = { ...f, titulo };
  delete meta.key;
  await arm.por('musicas', f.key, meta, bytes);
}

export const apagarMusica = (arm: Armazem, key: string) => arm.apagar('musicas', key);

/** Nome de arquivo sem os caracteres que o Windows não aceita. */
export const nomeDeArquivo = (t: string): string => t.replace(/[\\/:*?"<>|]+/g, '_');
