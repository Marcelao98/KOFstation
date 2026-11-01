// Todas as ações dos menus do antigo (os data-acao do pagina.html). As que já existem no app novo fazem a coisa; as
// outras avisam em que etapa do roadmap chegam (docs/ROADMAP.md). Assim os menus ficam completos desde o M1 e nada
// some sem aviso.
import { usarAvisos } from '../stores/avisos';
import { usarBackup } from '../stores/backup';
import { usarBiblioteca } from '../stores/biblioteca';
import { usarCapas } from '../stores/capas';
import { config } from '../stores/config';
import { usarEstados } from '../stores/estados';
import { usarJogo } from '../stores/jogo';
import { usarTelas, type TelaId } from '../stores/telas';
import { usarVisual } from '../stores/visual';

/** Telas que já existem como lugar no app (algumas ainda vazias, mostrando a etapa em que chegam). */
const TELAS: Partial<Record<string, TelaId>> = {
  home: 'home',
  biblioteca: 'biblioteca',
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
  traducao: 'M10',
  'controle-celular': 'M13',
  'nucleo-snes': 'M11',
  molduras: 'M7',
  visual: 'M7',
  'visual-temas': 'M7',
  'musica-inicio': 'M9',
  'guardar-musica': 'M9',
  'boas-vindas': 'M9',
  bug: 'M10',
  'cacador-toggle': 'M10',
  atualizacao: 'M15',
  jukebox: 'M9',
  estatisticas: 'M10',
  teclas: 'M8',
  'bios-tela': 'M11',
  aparelhos: 'M13',
  jogadores: 'M8',
  moldura: 'M7',
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

const semJogo = () => {
  usarAvisos.getState().avisar('nenhum jogo aberto: abra uma ROM (Ctrl+O)');
  return true;
};

/** Executa uma ação de menu (`valor` = o dado do botão, ex.: escala 2). Devolve false se ainda não existe (e avisa). */
export function acao(nome: string, valor?: string): boolean {
  const telas = usarTelas.getState();
  const j = usarJogo.getState();
  switch (nome) {
    case 'abrir':
      document.getElementById('arquivo')?.click();
      return true;
    case 'voltar-jogo':
      if (!j.jogo) return semJogo();
      telas.abrir('jogo');
      return true;
    case 'pausar':
      if (!j.jogo) return semJogo();
      j.alternarPausa();
      return true;
    case 'reiniciar':
      if (!j.jogo) return semJogo();
      j.reiniciar();
      return true;
    case 'rapido':
      if (!j.jogo) return semJogo();
      if (j.rapidoAberto) j.fecharRapido();
      else {
        telas.abrir('jogo');
        j.abrirRapido();
      }
      return true;
    case 'mudo':
      j.alternarMudo();
      return true;
    case 'vol-menos':
      j.mudarVolume(-10);
      return true;
    case 'vol-mais':
      j.mudarVolume(10);
      return true;
    case 'desempenho':
      j.alternarDesempenho();
      return true;
    case 'escala':
      j.mudarEscala(Number(valor ?? 0));
      return true;
    case 'prop': {
      const alvo = valor ?? '43';
      for (let i = 0; i < 3 && usarJogo.getState().proporcao !== alvo; i++) usarJogo.getState().mudarProporcao(1);
      return true;
    }
    case 'pasta':
      usarBiblioteca.getState().abrirPedirPasta();
      return true;
    case 'reler-pasta':
      telas.abrir('biblioteca');
      void usarBiblioteca.getState().mostrar(true);
      return true;
    case 'fechar-biblioteca':
      telas.sair();
      return true;
    case 'exportar-saves':
    case 'importar-saves':
      usarBackup.getState().abrir();
      return true;
    case 'salvar-estado':
      void usarEstados.getState().salvar();
      return true;
    case 'carregar-ultimo':
      void usarEstados.getState().carregarUltimo();
      return true;
    case 'estados':
      void usarEstados.getState().mostrar(null, 'estados');
      return true;
    case 'estados-do-sel': {
      const b = usarBiblioteca.getState();
      const r = b.visiveis[b.selecionada];
      void usarEstados.getState().mostrar(r?.jogo?.id ?? null, 'estados');
      return true;
    }
    case 'auto-toggle':
      void import('../stores/auto').then((m) => m.alternarAuto());
      return true;
    case 'emu-opcoes':
      void usarEstados.getState().mostrar(null, 'emu');
      return true;
    case 'pausa-auto': {
      const liga = config().ler('pausaAuto') === '0';
      config().guardar('pausaAuto', liga ? '1' : '0');
      usarAvisos.getState().avisar('Pausar ao sair da janela: ' + (liga ? 'ligado' : 'desligado'));
      return true;
    }
    case 'fechar-estados':
      telas.sair();
      return true;
    case 'filtro':
      usarVisual.getState().filtro(valor ?? 'original');
      return true;
    case 'capas':
      usarCapas.getState().alternarCapas();
      usarAvisos.getState().avisar(`🖼 capas oficiais ${usarCapas.getState().ligadas ? 'ligadas' : 'desligadas'}`);
      return true;
    case 'sofa':
      usarCapas.getState().alternarSofa();
      if (usarCapas.getState().sofa) telas.abrir('biblioteca');
      return true;
  }
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
