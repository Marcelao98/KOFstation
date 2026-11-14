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
import { usarPainel } from '../stores/painel';
import '../stores/emulacao'; // registra as opções de emulação no jogo (efeito colateral)
import { usarMoldura } from '../stores/moldura';
import { usarJukebox } from '../stores/jukebox';
import { usarAbertura } from '../stores/abertura';
import { usarBug } from '../stores/bug';
import { usarDiagnostico } from '../stores/diagnostico';
import { usarBios } from '../stores/bios';
import { menuControleCelular } from '../stores/celular';
import { procurar as procurarAtualizacao } from '../stores/atualizacao';

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
export const ETAPA: Readonly<Record<string, string>> = {};

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
    case 'controle-celular':
      menuControleCelular();
      return true;
    case 'atualizacao':
      void procurarAtualizacao(true);
      return true;
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
    case 'jogadores-fechar':
    case 'fechar-teclas':
      telas.sair();
      return true;
    case 'fechar-estados':
      telas.sair();
      return true;
    case 'visual':
      usarPainel.getState().alternar();
      return true;
    case 'visual-temas':
      telas.fecharTemas();
      usarPainel.getState().abrir();
      return true;
    case 'fechar-visual':
      usarPainel.getState().fechar();
      return true;
    case 'molduras':
      usarJogo.getState().fecharRapido();
      usarMoldura.getState().set({ galeria: true });
      return true;
    case 'fechar-molduras':
      usarMoldura.getState().set({ galeria: false });
      return true;
    case 'moldura':
      usarMoldura.getState().mudar(valor ?? 'nenhuma');
      return true;
    case 'paleta-gb':
      usarMoldura.getState().mudarPaletaGb(valor ?? 'auto');
      return true;
    case 'paleta-nes':
      usarMoldura.getState().mudarPaletaNes(valor ?? 'default');
      return true;
    case 'filtro':
      usarVisual.getState().filtro(valor ?? 'original');
      return true;
    case 'capas':
      usarCapas.getState().alternarCapas();
      usarAvisos.getState().avisar(`🖼 capas oficiais ${usarCapas.getState().ligadas ? 'ligadas' : 'desligadas'}`);
      return true;
    case 'fechar-estat':
      telas.sair();
      return true;
    case 'nucleo-snes':
      // o núcleo Kof é da Mel e fica fora deste repositório até ela definir a licença (AGENTS.md): por enquanto só o
      // Snes9x. A escolha já existe pra quando ele chegar (adaptador KofCore)
      usarAvisos
        .getState()
        .avisar(
          'SNES: Snes9x (o mais rápido). O núcleo Kof entra no app novo quando a Mel liberar a licença dele',
          4500,
        );
      return true;
    case 'bios-tela':
      void usarBios.getState().mostrar();
      return true;
    case 'bios':
      usarBios.getState().escolher();
      return true;
    case 'bios-fechar':
      usarBios.getState().fechar();
      return true;
    case 'bug':
      usarBug.getState().abrir();
      return true;
    case 'bug-fechar':
      usarBug.getState().fechar();
      return true;
    case 'diagnostico':
      usarDiagnostico.getState().abrir();
      return true;
    case 'diagnostico-fechar':
      usarDiagnostico.getState().fechar();
      return true;
    case 'cacador-toggle':
      usarBug.getState().alternarCacador();
      return true;
    case 'traducao':
      void import('../stores/traducao').then((m) => m.escolherTraducao());
      return true;
    case 'boas-vindas':
      usarAbertura.getState().abrir();
      return true;
    case 'jukebox':
      void usarJukebox.getState().abrir();
      return true;
    case 'fechar-jukebox':
      telas.sair();
      return true;
    case 'guardar-musica':
      void usarJukebox.getState().guardarDoJogo();
      return true;
    case 'musica-inicio':
      usarJukebox.getState().mudarMusicaInicio();
      return true;
    case 'jk-tocar':
      usarJukebox.getState().alternar();
      return true;
    case 'jk-prox':
      usarJukebox.getState().proxima(1);
      return true;
    case 'jk-parar':
      usarJukebox.getState().fechar();
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
