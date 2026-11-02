// Caso de uso: transformar um arquivo escolhido (ROM solta ou .zip) num jogo pronto pra rodar.
import { dadosDaEntrada, ehZip, extensao, listarZip, sistemaPorExtensao, SISTEMAS, type SistemaId } from '@kof/domain';
import { NUCLEOS } from '@kof/engine';

export interface JogoAberto {
  nome: string;
  /** nome do arquivo da ROM (o de dentro, num zip) */
  arquivo: string;
  sistema: SistemaId;
  rom: Uint8Array;
}

export class ErroDeArquivo extends Error {
  constructor(
    readonly code: 'NOT_A_GAME' | 'SYSTEM_NOT_YET' | 'BAD_ZIP',
    message: string,
  ) {
    super(message);
    this.name = 'ErroDeArquivo';
  }
}

const semExtensao = (n: string) => (n.split(/[\\/]/).pop() ?? n).replace(/\.[^.]+$/, '');
const roda = (s: SistemaId | null): s is SistemaId => !!s && !!NUCLEOS[s];

export async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  const fluxo = new Blob([dados as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

export async function lerArquivoDeJogo(nome: string, bytes: Uint8Array): Promise<JogoAberto> {
  if (extensao(nome) === 'zip' || ehZip(bytes)) {
    let lista;
    try {
      lista = listarZip(bytes);
    } catch (e) {
      throw new ErroDeArquivo('BAD_ZIP', `não consegui abrir esse zip: ${(e as Error).message}`);
    }
    const candidatas = lista.filter((e) => roda(sistemaPorExtensao(e.nome))).sort((a, b) => b.tamanho - a.tamanho);
    const e = candidatas[0];
    if (!e) {
      const outro = lista.map((x) => sistemaPorExtensao(x.nome)).find((s) => s);
      if (outro) throw naoAinda(outro);
      throw new ErroDeArquivo('NOT_A_GAME', `não achei nenhum jogo dentro de ${nome} (pode ser Neo Geo: chega no M11)`);
    }
    const dados = dadosDaEntrada(bytes, e);
    let rom: Uint8Array;
    if (e.metodo === 0) rom = dados.slice();
    else if (e.metodo === 8) rom = await inflar(dados);
    else throw new ErroDeArquivo('BAD_ZIP', `o zip usa uma compressão que eu não conheço (método ${e.metodo})`);
    return {
      nome: semExtensao(e.nome),
      arquivo: e.nome.split(/[\\/]/).pop() ?? e.nome,
      sistema: sistemaPorExtensao(e.nome) as SistemaId,
      rom,
    };
  }
  const s = sistemaPorExtensao(nome);
  if (!s) throw new ErroDeArquivo('NOT_A_GAME', `${nome} não parece um jogo (extensão .${extensao(nome) || '?'})`);
  if (!roda(s)) throw naoAinda(s);
  return { nome: semExtensao(nome), arquivo: nome.split(/[\\/]/).pop() ?? nome, sistema: s, rom: bytes };
}

function naoAinda(s: SistemaId): ErroDeArquivo {
  const nomeSis = SISTEMAS.find((x) => x.id === s)?.nome ?? s;
  return new ErroDeArquivo(
    'SYSTEM_NOT_YET',
    `${nomeSis} ainda não roda no app novo (chega no M11/M12); no app antigo funciona`,
  );
}
