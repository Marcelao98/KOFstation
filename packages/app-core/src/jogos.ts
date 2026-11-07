// Caso de uso: o registro dos jogos abertos (loja `jogos`) e de onde vêm os bytes de cada um pra jogar de novo.
// No antigo a ROM ficava dentro do banco do navegador; aqui ela fica na Kof Games (o registro guarda o caminho) e,
// sem a Kof Games escolhida, numa cópia na loja `roms` (como antes: abre sem diálogo nenhum da próxima vez).
import { crcRom, jogoIdDe, tituloInterno, type ArquivoDaPasta, type RegistroJogo, type SistemaId } from '@kof/domain';
import type { Armazem } from './armazem';
import { lerArquivoDeJogo, tamanhoDoJogo, type JogoAberto } from './arquivo';
import type { Backend } from './backend';
import { lerDaKofGames } from './kofgames';

/** Sistemas grandes demais pra guardar uma cópia na loja `roms` (CD/DVD). */
const GRANDES: SistemaId[] = ['ps1', 'ps2', 'neogeo'];
const MAX_COPIA = 64 << 20;

// gravações do registro de um jogo, uma de cada vez (abrir e salvar automático podem chegar juntos: um não pode
// apagar o que o outro escreveu)
const filas = new Map<string, Promise<unknown>>();
export function naFila<T>(id: string, f: () => Promise<T>): Promise<T> {
  const antes = filas.get(id) ?? Promise.resolve();
  const p = antes.then(f, f);
  const fim = p.catch(() => undefined);
  filas.set(id, fim);
  void fim.then(() => filas.get(id) === fim && filas.delete(id));
  return p;
}

/** Identidade do jogo aberto (as mesmas chaves do antigo). */
export function identidade(sistema: SistemaId, rom: Uint8Array, nome: string, tamanho = rom.length) {
  const titulo = tituloInterno(rom, sistema).trim();
  return { titulo, id: jogoIdDe(titulo || nome, tamanho) };
}

/** Grava/atualiza o registro do jogo que acabou de abrir. */
export async function registrarJogo(
  arm: Armazem,
  aberto: JogoAberto,
  extra: { path?: string; semCopia?: boolean } = {},
): Promise<RegistroJogo> {
  const { titulo, id } = identidade(aberto.sistema, aberto.rom, aberto.nome, tamanhoDoJogo(aberto));
  return naFila(id, () => registrarJogoJa(arm, aberto, extra, titulo, id));
}

async function registrarJogoJa(
  arm: Armazem,
  aberto: JogoAberto,
  extra: { path?: string; semCopia?: boolean },
  titulo: string,
  id: string,
): Promise<RegistroJogo> {
  const antigo = await arm.meta<RegistroJogo>('jogos', id);
  const novo: RegistroJogo = {
    ...(antigo ?? {}),
    id,
    nome: aberto.nome,
    arquivo: aberto.arquivo,
    sistema: aberto.sistema,
    titulo,
    tamanho: tamanhoDoJogo(aberto),
    ultimo: Date.now(),
  };
  if (!GRANDES.includes(aberto.sistema)) novo.crc = crcRom(aberto.sistema, aberto.rom);
  if (extra.path) novo.path = extra.path;
  await arm.por('jogos', id, novo);
  if (!novo.path && !extra.semCopia && !GRANDES.includes(aberto.sistema) && aberto.rom.length <= MAX_COPIA)
    await arm.por('roms', id, { id }, aberto.rom);
  return novo;
}

/** Muda campos do registro (capa, automático...). */
export function mudarJogo(arm: Armazem, id: string, f: (j: RegistroJogo) => RegistroJogo | null) {
  return naFila(id, async () => {
    const j = await arm.meta<RegistroJogo>('jogos', id);
    if (!j) return null;
    const n = f({ ...j });
    if (n) await arm.por('jogos', id, n);
    return n;
  });
}

export async function listarJogos(arm: Armazem): Promise<RegistroJogo[]> {
  return (await arm.listar<RegistroJogo>('jogos')).map((r) => r.meta).filter((j) => j && j.id);
}

export class JogoSemRom extends Error {
  readonly code = 'GAME_ROM_MISSING';
  constructor(nome: string) {
    super(`a ROM de ${nome} não está na biblioteca nem na Kof Games: abra o arquivo de novo (Ctrl+O)`);
    this.name = 'JogoSemRom';
  }
}

/** Os bytes de um jogo da biblioteca (pela Kof Games ou pela cópia guardada). */
/** O que ler do jogo: tudo (padrão) ou só a cabeça do CD de PS1 (vai pro núcleo nativo, que lê o disco sozinho). */
export interface ComoLer {
  soCabeca?: boolean;
}

/** Bytes do começo que bastam pra reconhecer um CD (o `cdPs1` olha até 0x9000) e o cabeçalho de um PS-X EXE. */
const CABECA = 64 << 10;
const CD_PS1 = /\.(cue|bin|img|iso|chd|pbp)$/i;

/**
 * Só a cabeça de um CD de PS1 da Kof Games: o `.cue` inteiro (é pequeno) ou os primeiros 64 KB da imagem. `tamanho` é
 * o do arquivo inteiro (entra na identidade e na chave do save, igual a quando a página lia tudo). null = não é CD de
 * PS1 (lê do jeito normal).
 */
export async function cabecaDoCd(b: Backend, path: string, tamanho: number): Promise<JogoAberto | null> {
  const nome = path.split('/').pop() ?? path;
  if (!CD_PS1.test(nome)) return null;
  const cue = /\.cue$/i.test(nome);
  const bytes = await lerDaKofGames(b, path, 0, cue ? undefined : Math.min(tamanho || CABECA, CABECA));
  const j = await lerArquivoDeJogo(nome, bytes);
  if (j.sistema !== 'ps1') return null; // um .bin de Mega Drive, por exemplo
  if (cue) return j; // o .cue foi lido inteiro: igual ao jeito normal (os .bin ficam pro núcleo)
  const r: JogoAberto = { ...j, parcial: true };
  // imagem única (.chd, .iso, .pbp): a rom era a imagem inteira; .bin sem .cue: a rom é o .cue montado (já certo)
  if (/\.(chd|pbp|iso|img)$/i.test(nome) || !j.arquivos) r.tamanho = tamanho;
  return r;
}

export async function bytesDoJogo(b: Backend, arm: Armazem, j: RegistroJogo, como: ComoLer = {}): Promise<JogoAberto> {
  if (j.path) {
    try {
      if (como.soCabeca && j.sistema === 'ps1') {
        const c = await cabecaDoCd(b, j.path, j.tamanho);
        if (c) return c;
      }
      const bytes = await lerDaKofGames(b, j.path);
      return await lerArquivoDeJogo(j.path.split('/').pop() ?? j.arquivo, bytes);
    } catch (e) {
      if (!(await arm.meta('roms', j.id))) throw e;
      // o arquivo saiu da Kof Games: cai pra cópia guardada
    }
  }
  const rom = await arm.pegar('roms', j.id);
  if (!rom) throw new JogoSemRom(j.nome);
  return { nome: j.nome, arquivo: j.arquivo, sistema: j.sistema, rom };
}

/** Os bytes de um arquivo da pasta (ainda não jogado). */
export async function bytesDaPasta(b: Backend, a: ArquivoDaPasta, como: ComoLer = {}): Promise<JogoAberto> {
  if (como.soCabeca) {
    const c = await cabecaDoCd(b, a.path, a.tamanho);
    if (c) return c;
  }
  return lerArquivoDeJogo(a.arquivo, await lerDaKofGames(b, a.path));
}
