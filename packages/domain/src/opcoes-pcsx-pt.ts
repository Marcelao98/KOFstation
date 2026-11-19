// O PS1 (PCSX-ReARMed) em português: as opções que o núcleo declara (opcoes-ps1-declaradas.ts, gerado) e o catálogo
// curado não detalha. Vão pro Avançado do ⚙ Opções de emulação, cada uma no grupo dela.
import type { GrupoDeOpcao } from './opcoes-nucleo';
import type { TraducaoDeOpcao } from './opcoes-lrps2-pt';

export interface TraducaoComGrupo extends TraducaoDeOpcao {
  grupo: GrupoDeOpcao;
}

const MIRA = { disabled: 'Sem mira', blue: 'Azul', green: 'Verde', red: 'Vermelha', white: 'Branca' };
const PISTOLA = 'pra pistola de luz (GunCon/Konami): só muda algo nos jogos de tiro com pistola';

export const TRADUCAO_PCSX: Readonly<Record<string, TraducaoComGrupo>> = {
  pcsx_rearmed_alt_flip: {
    grupo: 'correcoes',
    nome: 'Leitura da imagem (momento)',
    dica: 'Quando o núcleo pega a imagem pronta: "cedo" ou "tarde" conserta tremidos em alguns jogos.',
    valores: { auto: 'Automático', early: 'Cedo', late: 'Tarde' },
  },
  pcsx_rearmed_analog_axis_modifier: {
    grupo: 'controle',
    nome: 'Limite do analógico',
    dica: 'Quadrado deixa chegar no canto (como o controle original); círculo limita num círculo.',
    valores: { square: 'Quadrado', circle: 'Círculo' },
  },
  pcsx_rearmed_analog_combo: {
    grupo: 'controle',
    nome: 'Combinação pra ligar o analógico (DualShock)',
    dica: 'Os botões que, juntos, ligam e desligam o modo analógico do controle, como o botão ANALOG do original.',
    valores: { disabled: 'Desligado' },
  },
  pcsx_rearmed_cd_readahead: {
    grupo: 'sistema',
    nome: 'Leitura antecipada do CD (setores)',
    dica: 'Quantos setores ler adiantado. Mais pode suavizar jogos que leem muito do CD; 0 desliga.',
  },
  pcsx_rearmed_crosshair1: {
    grupo: 'controle',
    nome: 'Mira da pistola do jogador 1',
    dica: 'Desenha uma mira na tela ' + PISTOLA + '.',
    valores: MIRA,
  },
  pcsx_rearmed_crosshair2: {
    grupo: 'controle',
    nome: 'Mira da pistola do jogador 2',
    dica: 'Desenha uma mira na tela ' + PISTOLA + '.',
    valores: MIRA,
  },
  pcsx_rearmed_display_fps_v2: {
    grupo: 'sistema',
    nome: 'Mostrar os quadros por segundo do núcleo',
    dica: 'O contador do próprio PCSX na imagem (o painel F3 do app já mostra isso com mais detalhe).',
    valores: { extra: 'Com detalhes' },
  },
  pcsx_rearmed_display_info: {
    grupo: 'sistema',
    nome: 'Avisos do núcleo',
    dica: 'Mensagens que o PCSX manda (troca de disco, cartão...).',
  },
  pcsx_rearmed_fractional_framerate: {
    grupo: 'emulacao',
    nome: 'Quadros por segundo fracionários',
    dica: 'Usa 59,94 em vez de 60 (o valor exato da TV). Automático decide pelo jogo.',
    valores: { auto: 'Automático' },
  },
  pcsx_rearmed_gpu_slow_llists: {
    grupo: 'correcoes',
    nome: 'Listas da GPU do jeito lento',
    dica: 'Processa as listas de desenho como o console de verdade; conserta poucos jogos e custa desempenho.',
    valores: { auto: 'Automático' },
  },
  pcsx_rearmed_gunconadjustratiox: {
    grupo: 'controle',
    nome: 'GunCon: sensibilidade horizontal',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_gunconadjustratioy: {
    grupo: 'controle',
    nome: 'GunCon: sensibilidade vertical',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_gunconadjustx: {
    grupo: 'controle',
    nome: 'GunCon: deslocamento horizontal',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_gunconadjusty: {
    grupo: 'controle',
    nome: 'GunCon: deslocamento vertical',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_input_sensitivity: {
    grupo: 'controle',
    nome: 'Sensibilidade do mouse',
    dica: 'Pros jogos que usam o mouse do PlayStation.',
  },
  pcsx_rearmed_konamigunadjustx: {
    grupo: 'controle',
    nome: 'Pistola Konami: deslocamento horizontal',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_konamigunadjusty: {
    grupo: 'controle',
    nome: 'Pistola Konami: deslocamento vertical',
    dica: 'Ajuste fino ' + PISTOLA + '.',
  },
  pcsx_rearmed_memcard2: {
    grupo: 'cartao',
    nome: 'Cartão de memória 2',
    dica: 'O segundo cartão: compartilhado entre os jogos, um por jogo ou nenhum. O cartão 1 é o que o app guarda.',
    valores: { shared: 'Compartilhado', serial: 'Um por jogo', none: 'Nenhum' },
  },
  pcsx_rearmed_multitap: {
    grupo: 'controle',
    nome: 'Multitap (mais de 2 jogadores)',
    dica: 'Liga o adaptador de 4 controles numa porta (ou nas duas) pros jogos que aceitam.',
    valores: { disabled: 'Desligado', 'port 1': 'Porta 1', 'port 2': 'Porta 2', 'ports 1 and 2': 'Portas 1 e 2' },
  },
  pcsx_rearmed_negcon_deadzone: {
    grupo: 'controle',
    nome: 'NeGcon: zona morta da torção',
    dica: 'Pro controle de corrida NeGcon: quanto torcer antes de começar a virar.',
  },
  pcsx_rearmed_negcon_response: {
    grupo: 'controle',
    nome: 'NeGcon: resposta da torção',
    dica: 'Como a torção vira o volante: reta, mais suave no começo (quadrática) ou ainda mais (cúbica).',
    valores: { linear: 'Reta', quadratic: 'Quadrática', cubic: 'Cúbica' },
  },
  pcsx_rearmed_neon_enhancement_no_main: {
    grupo: 'graficos',
    nome: 'Resolução maior: atalho de velocidade',
    dica: 'Com a resolução maior ligada, pula um passo pra ir mais rápido; pode dar defeito em alguns jogos.',
    aviso: 'pode dar defeito de imagem em alguns jogos',
  },
  pcsx_rearmed_neon_enhancement_tex_adj_v2: {
    grupo: 'graficos',
    nome: 'Resolução maior: ajuste de texturas',
    dica: 'Corrige costuras nas texturas quando a resolução maior está ligada.',
  },
  pcsx_rearmed_neon_interlace_enable_v2: {
    grupo: 'graficos',
    nome: 'Mostrar o vídeo entrelaçado',
    dica: 'Desenha as duas metades da imagem entrelaçada como a TV fazia (pode tremer).',
    valores: { auto: 'Automático' },
  },
  pcsx_rearmed_nocdaudio: {
    grupo: 'som',
    nome: 'Música do CD',
    dica: 'As faixas de áudio do CD (a trilha de muitos jogos). Desligar deixa sem música.',
  },
  pcsx_rearmed_noxadecoding: {
    grupo: 'som',
    nome: 'Som XA (vozes e músicas comprimidas)',
    dica: 'O áudio comprimido do CD (falas, cenas e músicas). Desligar deixa mudo nesses trechos.',
  },
  pcsx_rearmed_psxclock: {
    grupo: 'emulacao',
    nome: 'Velocidade do processador do PS1 (%)',
    dica: 'Abaixo de 100 deixa o console mais lento que o original (alguns jogos ficam mais leves). Automático é o certo.',
    valores: { auto: 'Automático' },
    aviso: 'longe do automático, jogos podem ficar lentos ou travar',
  },
  pcsx_rearmed_rgb32_output: {
    grupo: 'graficos',
    nome: 'Cores em 32 bits',
    dica: 'A imagem sai com mais bits de cor (o app desenha os dois formatos).',
  },
  pcsx_rearmed_scale_hires: {
    grupo: 'graficos',
    nome: 'Reduzir as telas de alta resolução',
    dica: 'Diminui as telas em alta resolução pro tamanho normal (deixa o tamanho da imagem estável).',
  },
  pcsx_rearmed_screen_centering: {
    grupo: 'graficos',
    nome: 'Centralizar a imagem',
    dica: 'Como pôr a imagem no meio: automático, como o jogo pede, sem bordas ou na mão (as três abaixo).',
    valores: { auto: 'Automático', game: 'Como o jogo pede', borderless: 'Sem bordas', manual: 'Na mão' },
  },
  pcsx_rearmed_screen_centering_h_adj: {
    grupo: 'graficos',
    nome: 'Centralizar na mão: altura',
    dica: 'Só vale com "Centralizar a imagem: na mão".',
  },
  pcsx_rearmed_screen_centering_x: {
    grupo: 'graficos',
    nome: 'Centralizar na mão: horizontal',
    dica: 'Só vale com "Centralizar a imagem: na mão".',
  },
  pcsx_rearmed_screen_centering_y: {
    grupo: 'graficos',
    nome: 'Centralizar na mão: vertical',
    dica: 'Só vale com "Centralizar a imagem: na mão".',
  },
  pcsx_rearmed_show_bios_bootlogo: {
    grupo: 'sistema',
    nome: 'Mostrar a abertura da BIOS',
    dica: 'A tela do PlayStation antes do jogo (com a BIOS de verdade).',
    valores: { enabled_no_pcsx: 'Ligado (sem o logo do PCSX)' },
  },
  pcsx_rearmed_show_overscan: {
    grupo: 'graficos',
    nome: 'Borda horizontal (overscan)',
    dica: 'Mostra as bordas dos lados que a TV escondia.',
    valores: { auto: 'Automático', hack: 'Forçado' },
  },
  pcsx_rearmed_vibration: {
    grupo: 'controle',
    nome: 'Vibração',
    dica: 'A vibração do DualShock, no controle que tiver motor.',
  },
};
