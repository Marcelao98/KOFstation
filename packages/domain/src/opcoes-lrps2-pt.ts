// Português das opções do LRPS2 que o catálogo curado (opcoes-nucleo.ts) não detalha: nome, dica e, quando pode
// quebrar o jogo ou derrubar o fps, o aviso (⚠ na tela). Os valores ficam com o nome do núcleo, menos ligado/desligado.
// A lista completa do que o núcleo declara está em opcoes-lrps2.ts (gerado); o que não estiver aqui aparece com o nome
// original em inglês (nada escondido).

export interface TraducaoDeOpcao {
  nome: string;
  dica: string;
  aviso?: string;
  /** nome em português de alguns valores (o resto fica como o núcleo escreve) */
  valores?: Record<string, string>;
}

const CORRECAO = 'correção manual do renderizador: pode consertar um jogo e estragar a imagem de outro';
const SO_PARALLEL = 'só vale com o renderizador paraLLEl-GS, que o app não usa (ele desenha com OpenGL)';

export const TRADUCAO_LRPS2: Readonly<Record<string, TraducaoDeOpcao>> = {
  // ---------- Sistema
  pcsx2_usb_camera: {
    nome: 'Câmera USB (EyeToy)',
    dica: 'Liga uma câmera do computador como a câmera USB do PS2, pros jogos que usam.',
  },
  pcsx2_shared_memory_cards: {
    nome: 'Cartão de memória compartilhado',
    dica: 'Ligado: todos os jogos usam os mesmos dois cartões (como um PS2 de verdade). Desligado: cada jogo tem os seus.',
    aviso: 'ao trocar, os saves que estão no outro modo não aparecem (eles continuam guardados)',
  },
  pcsx2_enable_cheats: {
    nome: 'Trapaças (cheats)',
    dica: 'Aplica as trapaças da pasta de cheats do núcleo, quando houver.',
    aviso: 'trapaça pode travar o jogo ou estragar o save',
  },
  pcsx2_hint_language_unlock: {
    nome: 'Liberar idioma',
    dica: 'Deixa escolher idiomas que o jogo esconde na versão da sua região, quando o núcleo conhece o remendo.',
  },
  pcsx2_dev9_hdd: {
    nome: 'HD do PS2 (DEV9)',
    dica: 'Liga o disco rígido do PS2, pros poucos jogos que instalam nele.',
  },
  pcsx2_dev9_hdd_size: {
    nome: 'Tamanho do HD do PS2',
    dica: 'O tamanho do disco rígido criado pro PS2 (só vale com o HD ligado).',
  },
  pcsx2_dev9_eth: {
    nome: 'Rede do PS2 (DEV9)',
    dica: 'Liga o adaptador de rede do PS2 (jogos online antigos, servidores da comunidade).',
  },

  // ---------- Gráficos
  pcsx2_native_scaling: {
    nome: 'Ampliação nativa',
    dica: 'Como desenhar efeitos de pós-processamento quando a resolução interna é maior que a original.',
  },
  pcsx2_pgs_ssaa: {
    nome: 'Supersampling (paraLLEl)',
    dica: 'Anti-serrilhado do renderizador paraLLEl.',
    aviso: SO_PARALLEL,
  },
  pcsx2_pgs_high_res_scanout: {
    nome: 'Saída em alta resolução (paraLLEl)',
    dica: 'Imagem acima da original no renderizador paraLLEl.',
    aviso: SO_PARALLEL,
  },
  pcsx2_pgs_ss_tex: {
    nome: 'Texturas com supersampling (paraLLEl)',
    dica: 'Experimental: supersampling também nas texturas.',
    aviso: SO_PARALLEL,
  },
  pcsx2_pgs_deblur: {
    nome: 'Desembaçar (paraLLEl)',
    dica: 'Experimental: imagem final mais nítida no paraLLEl.',
    aviso: SO_PARALLEL,
  },
  pcsx2_vr_mode: {
    nome: 'Modo VR',
    dica: 'Imagem lado a lado pra óculos de realidade virtual.',
    aviso: 'experimental; a imagem fica dividida em duas',
  },
  pcsx2_vr_depth: { nome: 'Profundidade do VR', dica: 'Quanto de 3D no modo VR (só com o VR ligado).' },
  pcsx2_pcrtc_antiblur: {
    nome: 'Antiembaçado da saída (PCRTC)',
    dica: 'Tira o embaçado que alguns jogos põem de propósito na imagem final.',
  },
  pcsx2_pcrtc_screen_offsets: {
    nome: 'Posição da tela (PCRTC)',
    dica: 'Respeita o deslocamento da imagem que o jogo pede (pode tremer em alguns jogos).',
  },
  pcsx2_disable_interlace_offset: {
    nome: 'Sem deslocamento do entrelaçado',
    dica: 'Tira o pulinho de meia linha entre os campos entrelaçados; pode deixar a imagem mais firme.',
  },
  pcsx2_auto_flush_software: {
    nome: 'Descarga automática (renderizador por software)',
    dica: 'Só vale no renderizador por software.',
  },
  pcsx2_sw_renderer_threads: {
    nome: 'Linhas extras do renderizador por software',
    dica: 'Quantas linhas do processador o renderizador por software usa a mais.',
  },

  // ---------- Emulação
  pcsx2_vu_accurate_addsub: {
    nome: 'Soma/subtração exata nas VUs',
    dica: 'Contas das unidades vetoriais como no PS2; conserta poucos jogos.',
    aviso: 'pesa no processador',
  },
  pcsx2_vu0_softfloat: {
    nome: 'Ponto flutuante por software na VU0',
    dica: 'Contas exatas na VU0; só pra jogo que precisa.',
    aviso: 'derruba o fps',
  },
  pcsx2_vu1_softfloat: {
    nome: 'Ponto flutuante por software na VU1',
    dica: 'Contas exatas na VU1; só pra jogo que precisa.',
    aviso: 'derruba o fps',
  },
  pcsx2_ee_cpu: {
    nome: 'Como o processador do PS2 é emulado (EE)',
    dica: 'Recompilador (rápido) ou interpretador (lento, pra caçar defeito).',
    aviso: 'o interpretador deixa quase todo jogo injogável de tão lento',
  },
  pcsx2_fastmem: {
    nome: 'Memória rápida (fastmem)',
    dica: 'Acesso direto à memória do PS2; desligar só pra caçar defeito.',
    aviso: 'desligado fica bem mais lento',
  },
  pcsx2_game_enhancements_hint: {
    nome: 'Melhorias do jogo (remendos)',
    dica: 'Aplica os remendos de melhoria que o núcleo conhece pro jogo.',
    aviso: 'pode quebrar o jogo; use por jogo',
  },
  pcsx2_uncapped_framerate_hint: {
    nome: 'Sem limite de quadros (remendo 60 fps)',
    dica: 'Remendo que destrava o fps do jogo (ex.: 30 → 60), quando o núcleo conhece pro jogo.',
    aviso: 'pode acelerar o jogo ou quebrar a física; use por jogo',
  },

  // ---------- Correções manuais do renderizador
  pcsx2_enable_hw_hacks: {
    nome: 'Ligar as correções manuais',
    dica: 'Sem isto ligado, as correções abaixo não valem. O núcleo já aplica as certas por jogo sozinho.',
    aviso: CORRECAO,
  },
  pcsx2_cpu_sprite_size: {
    nome: 'Tamanho do sprite pelo processador',
    dica: 'Desenha sprites pequenos no processador.',
    aviso: CORRECAO,
  },
  pcsx2_cpu_sprite_level: {
    nome: 'Nível do sprite pelo processador',
    dica: 'Quais sprites vão pro processador.',
    aviso: CORRECAO,
  },
  pcsx2_software_clut_render: {
    nome: 'Paleta (CLUT) por software',
    dica: 'Desenha paletas no processador.',
    aviso: CORRECAO,
  },
  pcsx2_auto_flush: {
    nome: 'Descarga automática',
    dica: 'Conserta efeitos de sombra/luz em alguns jogos.',
    aviso: CORRECAO,
  },
  pcsx2_texture_inside_rt: {
    nome: 'Textura dentro do alvo',
    dica: 'Conserta efeitos que leem a própria imagem.',
    aviso: CORRECAO,
  },
  pcsx2_disable_depth_conversion: {
    nome: 'Sem conversão de profundidade',
    dica: 'Pode tirar efeitos quebrados.',
    aviso: CORRECAO,
  },
  pcsx2_use_external_gameindex: {
    nome: 'Banco de jogos externo',
    dica: 'Usa um GameIndex.yaml da pasta do sistema em vez do embutido no núcleo.',
  },
  pcsx2_framebuffer_conversion: {
    nome: 'Conversão do framebuffer',
    dica: 'Conserta cores erradas em alguns jogos.',
    aviso: CORRECAO,
  },
  pcsx2_disable_partial_invalidation: {
    nome: 'Sem invalidação parcial',
    dica: 'Conserta texturas que piscam em alguns jogos.',
    aviso: CORRECAO,
  },
  pcsx2_gpu_palette_conversion: {
    nome: 'Paleta na placa de vídeo',
    dica: 'Converte paletas na placa.',
    aviso: CORRECAO,
  },
  pcsx2_half_pixel_offset: {
    nome: 'Meio pixel (alta resolução)',
    dica: 'Tira linhas e bordas borradas que aparecem ao aumentar a resolução interna.',
    aviso: CORRECAO,
  },
  pcsx2_round_sprite: {
    nome: 'Arredondar sprites (alta resolução)',
    dica: 'Tira listras em sprites e letras ao aumentar a resolução interna.',
    aviso: CORRECAO,
  },
  pcsx2_align_sprite: {
    nome: 'Alinhar sprites (alta resolução)',
    dica: 'Tira linhas verticais em alguns jogos ao aumentar a resolução interna.',
    aviso: CORRECAO,
  },
  pcsx2_merge_sprite: { nome: 'Juntar sprites (alta resolução)', dica: 'Junta sprites vizinhos.', aviso: CORRECAO },
  pcsx2_unscaled_palette_draw: {
    nome: 'Paleta sem ampliar',
    dica: 'Desenha texturas de paleta na resolução original.',
    aviso: CORRECAO,
  },
  pcsx2_force_sprite_position: {
    nome: 'Posição par dos sprites',
    dica: 'Tira tremidinhas de sprites em alta resolução.',
    aviso: CORRECAO,
  },

  // ---------- Controle (por porta)
  ...porta(1),
  ...porta(2),
};

function porta(n: 1 | 2): Record<string, TraducaoDeOpcao> {
  const p = `Controle ${n}`;
  return {
    [`pcsx2_axis_deadzone${n}`]: {
      nome: `${p}: zona morta do analógico`,
      dica: 'Quanto da alavanca é ignorado no centro; suba se o personagem anda sozinho.',
    },
    [`pcsx2_button_deadzone${n}`]: {
      nome: `${p}: zona morta dos gatilhos`,
      dica: 'Quanto do L2/R2 é ignorado antes de contar como apertado.',
    },
    [`pcsx2_axis_scale${n}`]: {
      nome: `${p}: sensibilidade do analógico`,
      dica: 'Acima de 100% a alavanca chega no máximo antes do fim do curso.',
    },
    [`pcsx2_invert_left_stick${n}`]: {
      nome: `${p}: inverter o analógico esquerdo`,
      dica: 'Inverte os eixos escolhidos.',
    },
    [`pcsx2_invert_right_stick${n}`]: {
      nome: `${p}: inverter o analógico direito`,
      dica: 'Inverte os eixos escolhidos.',
    },
    [`pcsx2_analog_mode${n}`]: {
      nome: `${p}: começar no modo analógico`,
      dica: 'Liga o modo analógico (a luz ANALOG do controle) ao abrir o jogo.',
    },
    [`pcsx2_enable_rumble${n}`]: { nome: `${p}: vibração`, dica: 'A força da vibração do controle.' },
  };
}
