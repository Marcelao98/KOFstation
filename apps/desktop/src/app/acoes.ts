// Todas as ações dos menus do antigo (os data-acao do pagina.html). As que já existem no app novo fazem a coisa; as
// outras avisam em que etapa do roadmap chegam (docs/ROADMAP.md). Assim os menus ficam completos desde o M1 e nada
// some sem aviso.
import { usarAvisos } from '../stores/avisos';
import { usarTelas, type TelaId } from '../stores/telas';

/** Telas que já existem como lugar no app (algumas ainda vazias, mostrando a etapa em que chegam). */
const TELAS: Partial<Record<string, TelaId>> = {
  home: 'home',
  biblioteca: 'biblioteca',
  estados: 'estados',
  jukebox: 'jukebox',
  estatisticas: 'estatisticas',
  guia: 'guia',
  teclas: 'teclas',
  controles: 'guia',
  'bios-tela': 'bios-tela',
  aparelhos: 'aparelhos',
  jogadores: 'jogadores',
};

/** Etapa em que cada ação ainda não feita chega. */
export const ETAPA: Readonly<Record<string, string>> = {
  pasta: 'M3',
  abrir: 'M2',
  traducao: 'M10',
  'exportar-saves': 'M4',
  'importar-saves': 'M4',
  'controle-celular': 'M13',
  reiniciar: 'M2',
  pausar: 'M2',
  'nucleo-snes': 'M11',
  rapido: 'M2',
  'salvar-estado': 'M5',
  'carregar-ultimo': 'M5',
  'auto-toggle': 'M5',
  'emu-opcoes': 'M5',
  molduras: 'M7',
  visual: 'M7',
  'visual-temas': 'M7',
  sofa: 'M3',
  'vol-menos': 'M2',
  'vol-mais': 'M2',
  mudo: 'M2',
  'pausa-auto': 'M2',
  'musica-inicio': 'M9',
  'guardar-musica': 'M9',
  'boas-vindas': 'M9',
  bug: 'M10',
  'cacador-toggle': 'M10',
  atualizacao: 'M15',
  'voltar-jogo': 'M2',
  biblioteca: 'M3',
  estados: 'M5',
  jukebox: 'M9',
  estatisticas: 'M10',
  teclas: 'M8',
  'bios-tela': 'M11',
  aparelhos: 'M13',
  jogadores: 'M8',
  escala: 'M2',
  prop: 'M2',
  moldura: 'M7',
  filtro: 'M7',
  'paleta-gb': 'M7',
  'paleta-nes': 'M7',
};

export const avisoEtapa = (acao: string): string =>
  `⏳ Isso ainda não chegou no app novo: vem na etapa ${ETAPA[acao] ?? '?'} (o app antigo continua tendo).`;

function telaCheia() {
  const b = document.body;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    b.classList.remove('cheia');
  } else {
    void document.documentElement
      .requestFullscreen?.()
      .catch(() => usarAvisos.getState().avisar('tela cheia bloqueada'));
    b.classList.add('cheia');
  }
}

/** Executa uma ação de menu. Devolve false se ela ainda não existe (e avisa). */
export function acao(nome: string): boolean {
  const telas = usarTelas.getState();
  const tela = TELAS[nome];
  if (tela) {
    telas.abrir(tela);
    return true;
  }
  switch (nome) {
    case 'temas':
      telas.abrirTemas();
      return true;
    case 'fechar-temas':
      telas.fecharTemas();
      return true;
    case 'voltar':
      telas.voltar();
      return true;
    case 'cheia':
      telaCheia();
      return true;
    case 'fechar-guia':
    case 'fechar-tela':
      telas.sair();
      return true;
    default:
      usarAvisos.getState().avisar(avisoEtapa(nome), 3200);
      return false;
  }
}
