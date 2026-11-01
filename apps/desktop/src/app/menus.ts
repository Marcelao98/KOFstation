// A barra de menus do antigo (pagina.html, #menu), item por item. `a` = ação, `k` = tecla mostrada.
export type ItemMenu = { a: string; t: string; k?: string; pc?: boolean; v?: string } | 'hr';
export interface Menu {
  titulo: string;
  acao?: string;
  itens: ItemMenu[];
}

export const MENUS: Menu[] = [
  {
    titulo: 'Arquivo',
    itens: [
      { a: 'home', t: '🏠 Início', k: 'Home' },
      { a: 'biblioteca', t: 'Biblioteca', k: 'Ctrl+L' },
      { a: 'pasta', t: '📁 Pasta Kof Games…' },
      { a: 'abrir', t: 'Adicionar arquivo…', k: 'Ctrl+O' },
      { a: 'traducao', t: 'Aplicar tradução (patch)…' },
      { a: 'bios-tela', t: '🔑 BIOS dos consoles…' },
      { a: 'estatisticas', t: '📊 Estatísticas' },
      { a: 'exportar-saves', t: '💾 Backup dos saves (.kofsave)' },
      { a: 'importar-saves', t: '📥 Trazer backup…' },
      { a: 'controle-celular', t: '📱 Celular como controle…' },
      { a: 'aparelhos', t: '📡 Aparelhos (PC e celular)…' },
      { a: 'jogadores', t: '🎮 Jogadores (2 a 4 controles)…' },
      'hr',
      { a: 'reiniciar', t: 'Reiniciar', k: 'F1' },
    ],
  },
  {
    titulo: 'Emulação',
    itens: [
      { a: 'pausar', t: 'Pausar / continuar', k: 'P' },
      { a: 'nucleo-snes', t: 'Núcleo do SNES: Snes9x', pc: true },
      { a: 'rapido', t: 'Menu rápido', k: 'F2' },
      'hr',
      { a: 'salvar-estado', t: 'Salvar estado', k: 'F5' },
      { a: 'carregar-ultimo', t: 'Carregar último estado', k: 'F8' },
      { a: 'estados', t: 'Estados salvos…', k: 'F6' },
      { a: 'auto-toggle', t: 'Salvar automático: ligado' },
      { a: 'emu-opcoes', t: '🎮 Modo de jogo e opções de emulação…' },
      'hr',
      { a: 'teclas', t: 'Controles e teclas…' },
    ],
  },
  {
    titulo: 'Imagem',
    itens: [
      { a: 'escala', t: 'Escala 2×', v: '2' },
      { a: 'escala', t: 'Escala 3×', v: '3' },
      { a: 'escala', t: 'Escala 4×', v: '4' },
      { a: 'escala', t: 'Encaixar na janela', v: '0' },
      'hr',
      { a: 'prop', t: 'Proporção 4:3 (como na TV)', v: '43' },
      { a: 'prop', t: 'Pixel perfeito (8:7)', v: '87' },
      { a: 'prop', t: 'Esticar', v: 'esticar' },
      'hr',
      { a: 'molduras', t: '🖼 Galeria de molduras…' },
      { a: 'moldura', t: 'Sem moldura' },
      'hr',
      { a: 'paleta-gb', t: 'Game Boy: cores do Game Boy Color' },
      { a: 'paleta-gb', t: 'Game Boy: verde (o original)' },
      { a: 'paleta-gb', t: 'Game Boy: cinza (Pocket)' },
      { a: 'paleta-nes', t: 'NES: cores padrão' },
      { a: 'paleta-nes', t: 'NES: TV de tubo' },
      { a: 'paleta-nes', t: 'NES: cores vivas' },
      'hr',
      { a: 'visual', t: '🎛 Painel de imagem…', k: 'F4' },
      { a: 'filtro', t: 'Filtro: Original', v: 'original' },
      { a: 'filtro', t: 'Filtro: TV de tubo da sala', v: 'tv' },
      { a: 'filtro', t: 'Filtro: Monitor de fliperama', v: 'fliperama' },
      { a: 'filtro', t: 'Filtro: Locadora 1996', v: 'locadora' },
      { a: 'filtro', t: 'Filtro: Game Boy tijolão', v: 'gameboy' },
      { a: 'filtro', t: 'Filtro: HD de mentirinha', v: 'hd' },
      'hr',
      { a: 'cheia', t: 'Tela cheia', k: 'F11' },
      { a: 'sofa', t: 'Modo sofá (tela cheia, controle)' },
    ],
  },
  {
    titulo: 'Som',
    itens: [
      { a: 'vol-menos', t: 'Volume −', k: '−' },
      { a: 'vol-mais', t: 'Volume +', k: '=' },
      { a: 'mudo', t: 'Mudo', k: 'M' },
      'hr',
      { a: 'pausa-auto', t: 'Pausar ao sair da janela: ligado' },
      { a: 'musica-inicio', t: 'Música no Início: ligada' },
      'hr',
      { a: 'jukebox', t: '🎵 Jukebox…' },
      { a: 'guardar-musica', t: 'Guardar a música do jogo', k: 'F7' },
    ],
  },
  { titulo: 'Tema', acao: 'temas', itens: [] },
  {
    titulo: 'Ajuda',
    itens: [
      { a: 'guia', t: '📖 Guia do KOFstation' },
      { a: 'boas-vindas', t: '✨ Boas-vindas' },
      { a: 'controles', t: 'Atalhos e controles' },
      'hr',
      { a: 'bug', t: '🐞 Reportar bug…', k: 'F9' },
      { a: 'cacador-toggle', t: 'Caçador de bugs: ligado' },
      'hr',
      { a: 'atualizacao', t: '🔄 Procurar atualização' },
    ],
  },
];

/** A barra da esquerda (#lateral). `tela` marca o botão da tela aberta. */
export const LATERAL = [
  { a: 'home', i: '🏠', t: 'Início', tela: 'home', dica: 'Início (tecla Home)' },
  { a: 'voltar', i: '←', t: 'Voltar', dica: 'Voltar (Alt+←)' },
  { a: 'voltar-jogo', i: '🎮', t: 'Voltar ao jogo', tela: 'jogo', dica: 'Voltar ao jogo', soComJogo: true },
  'hr',
  { a: 'biblioteca', i: '📚', t: 'Biblioteca', tela: 'biblioteca', dica: 'Biblioteca (Ctrl+L)' },
  { a: 'jukebox', i: '🎵', t: 'Jukebox', tela: 'jukebox', dica: 'Jukebox' },
  { a: 'estatisticas', i: '📊', t: 'Estatísticas', tela: 'estatisticas', dica: 'Estatísticas' },
  { a: 'temas', i: '🎨', t: 'Tema', dica: 'Mudar o tema' },
  { a: 'guia', i: '📖', t: 'Guia', tela: 'guia', dica: 'Guia do KOFstation' },
  'hr',
  { a: 'cheia', i: '⛶', t: 'Tela cheia', dica: 'Tela cheia (F11)' },
] as const;
