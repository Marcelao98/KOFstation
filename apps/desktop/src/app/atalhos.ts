// Teclas globais (as mesmas do antigo; ver docs/PARIDADE.md). Cada uma vira uma ação; as que ainda não existem avisam
// a etapa em que chegam.
export interface Atalho {
  tecla: string; // KeyboardEvent.code
  ctrl?: boolean;
  alt?: boolean;
  acao: string;
  descricao: string;
}

export const ATALHOS: readonly Atalho[] = [
  { tecla: 'F1', acao: 'reiniciar', descricao: 'Reiniciar o jogo' },
  { tecla: 'F2', acao: 'rapido', descricao: 'Menu rápido' },
  { tecla: 'F3', acao: 'desempenho', descricao: 'Painel de desempenho' },
  { tecla: 'F4', acao: 'visual', descricao: 'Painel de imagem' },
  { tecla: 'F5', acao: 'salvar-estado', descricao: 'Salvar estado' },
  { tecla: 'F6', acao: 'estados', descricao: 'Estados salvos' },
  { tecla: 'F7', acao: 'guardar-musica', descricao: 'Guardar a música (jukebox)' },
  { tecla: 'F8', acao: 'carregar-ultimo', descricao: 'Carregar o último estado' },
  { tecla: 'F9', acao: 'bug', descricao: 'Reportar bug' },
  { tecla: 'F11', acao: 'cheia', descricao: 'Tela cheia' },
  { tecla: 'KeyO', ctrl: true, acao: 'abrir', descricao: 'Abrir arquivo' },
  { tecla: 'KeyL', ctrl: true, acao: 'biblioteca', descricao: 'Biblioteca' },
  { tecla: 'Home', acao: 'home', descricao: 'Início' },
  { tecla: 'ArrowLeft', alt: true, acao: 'voltar', descricao: 'Voltar' },
  { tecla: 'BrowserBack', acao: 'voltar', descricao: 'Voltar' },
];

/** Teclas do jogo e do emulador que não são atalho global (M2 em diante): mostradas no Guia. */
export const TECLAS_DO_JOGO: readonly [string, string][] = [
  ['P / Esc', 'Pausar (Esc também fecha a tela aberta)'],
  ['M', 'Mudo'],
  ['− / =', 'Volume'],
  ['Tab (segurar)', 'Turbo'],
  ['Backspace (segurar) · Select+Y', 'Rebobinar'],
  ['Botão direito', 'Voltar nas telas · menu rápido no jogo'],
];

export function atalhoDe(e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey'>): Atalho | undefined {
  return ATALHOS.find((a) => a.tecla === e.code && !!a.ctrl === e.ctrlKey && !!a.alt === e.altKey);
}

export const nomeDaTecla = (a: Atalho): string =>
  (a.ctrl ? 'Ctrl+' : '') + (a.alt ? 'Alt+' : '') + a.tecla.replace(/^Key/, '').replace('ArrowLeft', '←');
