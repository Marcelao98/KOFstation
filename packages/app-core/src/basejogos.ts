// Carrega a base de jogos (nucleos/jogos.js, o mesmo arquivo do antigo: `var KofJogosDb = '<gzip em base64>'`).
import { criarBaseDeJogos, type BaseDeJogos, type DadosDaBase } from '@kof/domain';

export async function abrirBaseDeJogos(textoDoArquivo: string): Promise<BaseDeJogos> {
  const m = /KofJogosDb\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/.exec(textoDoArquivo);
  if (!m?.[1]) throw new Error('arquivo da base de jogos sem o KofJogosDb');
  const bin = atob(m[1]);
  const gz = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) gz[i] = bin.charCodeAt(i);
  const fluxo = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  const db = JSON.parse(await new Response(fluxo).text()) as DadosDaBase;
  return criarBaseDeJogos(db);
}

let carregando: Promise<BaseDeJogos | null> | null = null;

/** A base, baixada uma vez (null = não deu: a busca fica só pelo nome). */
export function carregarBaseDeJogos(url: URL, buscar: typeof fetch = fetch): Promise<BaseDeJogos | null> {
  carregando ??= (async () => {
    const r = await buscar(url);
    if (!r.ok) throw new Error(`base de jogos: ${r.status}`);
    return abrirBaseDeJogos(await r.text());
  })().catch((e: unknown) => {
    carregando = null;
    console.warn('base de jogos indisponível:', e); // a busca continua pelo nome
    return null;
  });
  return carregando;
}
