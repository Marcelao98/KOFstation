// BIOS do usuário (escolherBios/biosGuardadas/carregarBios do antigo): loja `bios` na pasta de dados do app (a chave é
// o nome que o núcleo procura no /sistema: gba_bios.bin, neogeo.zip, scph5501.bin...). Vai pro núcleo antes de cada jogo.
import { arquivoDaBios, BIOS, faltaBios, SISTEMAS, sistemaDaBios, type SistemaId } from '@kof/domain';
import type { ArquivoDoNucleo } from '@kof/engine';
import type { Armazem } from './armazem';

export interface BiosGuardada {
  arquivo: string;
  sistema: SistemaId;
  /** nome do arquivo que a pessoa escolheu */
  nome: string;
  tamanho: number;
}

export class ErroDeBios extends Error {
  readonly code = 'UNKNOWN_BIOS';
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeBios';
  }
}

export async function listarBios(arm: Armazem): Promise<BiosGuardada[]> {
  return (await arm.listar<BiosGuardada>('bios')).map((r) => r.meta).filter((b) => b && b.sistema);
}

const nomeDo = (s: SistemaId) => SISTEMAS.find((x) => x.id === s)?.nome ?? s;

/** Guarda a BIOS escolhida. `pedido` = o botão de um console na tela de BIOS (aceita qualquer nome). */
export async function guardarBios(
  arm: Armazem,
  nome: string,
  dados: Uint8Array,
  pedido?: SistemaId,
): Promise<BiosGuardada> {
  const sistema = pedido ?? sistemaDaBios(nome, dados);
  if (!sistema) throw new ErroDeBios(`não reconheci essa BIOS (${nome})`);
  const arquivo = arquivoDaBios(sistema, nome, dados);
  if (!arquivo)
    throw new ErroDeBios(
      `esse arquivo não parece a BIOS do ${nomeDo(sistema)} (${nome}, ${(dados.length / 1048576).toFixed(1)} MB)` +
        (sistema === 'ps2'
          ? ': a do PS2 é o arquivo .bin de 4 MB (não o .DIFF, .rom1, .rom2, .erom, .nvm ou .mec)'
          : ''),
    );
  const b: BiosGuardada = { arquivo, sistema, nome: nome.replace(/^.*[\\/]/, ''), tamanho: dados.length };
  // um console, uma BIOS: a troca apaga a anterior do mesmo console (PS1 pode ter guardado outro scph)
  for (const x of await listarBios(arm))
    if (x.sistema === sistema && x.arquivo !== arquivo) await arm.apagar('bios', x.arquivo);
  await arm.por('bios', arquivo, b, dados);
  return b;
}

/** As BIOS que vão pro /sistema desse jogo. */
export async function biosDoSistema(arm: Armazem, sistema: SistemaId): Promise<ArquivoDoNucleo[]> {
  const nomes = new Set((BIOS[sistema] ?? []).map((b) => b.arquivo));
  const r: ArquivoDoNucleo[] = [];
  for (const b of await listarBios(arm)) {
    if (!nomes.has(b.arquivo)) continue;
    const bytes = await arm.pegar('bios', b.arquivo);
    if (bytes) r.push({ nome: b.arquivo, bytes });
  }
  return r;
}

/** Falta a BIOS obrigatória (Neo Geo sem o neogeo.zip)? */
export async function faltaBiosDe(arm: Armazem, sistema: SistemaId): Promise<boolean> {
  return faltaBios(sistema, new Set((await listarBios(arm)).map((b) => b.arquivo)));
}
