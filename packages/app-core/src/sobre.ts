// B.3: a ficha do jogo pela internet (o Rust fala com o Wikidata e a Wikipédia e guarda em cache).
import { titulosParaBuscar, type SobreOJogo } from '@kof/domain';
import type { Backend } from './backend';

/** Os consoles que o Rust sabe procurar no Wikidata. */
export const CONSOLES_COM_FICHA = new Set([
  'snes',
  'nes',
  'gb',
  'gbc',
  'gba',
  'md',
  'sms',
  'gg',
  'neogeo',
  'ps1',
  'n64',
  'ps2',
]);

/** Sinopse e notas do jogo; null = não achou (ou console sem ficha). Erro de rede sobe (a tela diz "sem internet"). */
export async function sobreOJogo(b: Backend, sistema: string, titulo: string): Promise<SobreOJogo | null> {
  const titulos = titulosParaBuscar(titulo);
  if (!CONSOLES_COM_FICHA.has(sistema) || !titulos.length) return null;
  return b.chamar<SobreOJogo | null>('jogo.sobre', { sistema, titulos });
}
