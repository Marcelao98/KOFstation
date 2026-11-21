// Português das opções do Dolphin (Wii e GameCube, tarefa W.5) que o catálogo curado não detalha. Os números dos
// valores saem do código do núcleo (Source/Core/DolphinLibretro/Common/Options.cpp). O que não estiver aqui aparece com
// o nome original em inglês, no Avançado (nada escondido).
import type { TraducaoDeOpcao } from './opcoes-lrps2-pt';
import type { GrupoDeOpcao } from './opcoes-nucleo';

const HACK = 'atalho do Dolphin: deixa mais rápido, mas pode estragar a imagem de algum jogo';

export const TRADUCAO_DOLPHIN: Readonly<Record<string, TraducaoDeOpcao & { grupo?: GrupoDeOpcao }>> = {
  // ---------- Gráficos
  dolphin_aspect_ratio: {
    nome: 'Proporção da imagem',
    dica: 'Como o Dolphin entrega a imagem; o app ainda ajusta a proporção na janela.',
    valores: {
      '0': 'Automática',
      '1': 'Forçar larga (16:9)',
      '2': 'Forçar 4:3',
      '3': 'Esticar',
      '4': 'Personalizada',
      '5': 'Personalizada esticada',
      '6': 'Crua',
    },
  },
  dolphin_anti_aliasing: {
    nome: 'Antisserrilhado',
    dica: 'Suaviza as bordas serrilhadas; pesa na placa de vídeo.',
    valores: { '0': 'Desligado' },
  },
  dolphin_crop_overscan: { nome: 'Cortar as bordas (overscan)', dica: 'Tira a faixa da borda que a TV escondia.' },
  dolphin_disable_fog: { nome: 'Sem neblina', dica: 'Tira a neblina dos jogos (alguns ficam estranhos).', aviso: HACK },
  dolphin_fast_depth_calculation: {
    nome: 'Profundidade rápida',
    dica: 'Calcula a profundidade de um jeito mais rápido e quase sempre igual.',
  },
  dolphin_force_texture_filtering_mode: {
    nome: 'Filtro das texturas',
    dica: 'Padrão: como o jogo pede. Nítido: pixels marcados. Suave: tudo filtrado.',
    valores: { '0': 'Padrão', '1': 'Nítido', '2': 'Suave' },
  },
  dolphin_force_true_color: {
    nome: 'Cor verdadeira',
    dica: 'Tira as faixas de cor (dithering) que o console fazia.',
  },
  dolphin_gpu_texture_decoding: {
    nome: 'Texturas decodificadas na placa',
    dica: 'Passa o trabalho de abrir as texturas pra placa de vídeo; ajuda quando o processador é o gargalo.',
  },
  dolphin_pixel_lighting: { nome: 'Luz por pixel', dica: 'Iluminação mais bonita; pesa na placa.' },
  dolphin_texture_cache_accuracy: {
    nome: 'Precisão do cache de texturas',
    dica: 'Mais preciso evita texturas erradas em poucos jogos; mais rápido serve pra quase todos.',
    valores: { '0': 'Rápida', '128': 'Média', '512': 'Segura' },
  },
  dolphin_widescreen_hack: {
    nome: 'Tela larga forçada',
    dica: 'Abre a imagem em 16:9 mesmo em jogo que não foi feito pra isso; as bordas podem aparecer cortadas.',
    aviso: HACK,
  },
  dolphin_vr_mode: { nome: 'Modo de realidade virtual', dica: 'Imagem em 3D estéreo; não serve na tela comum.' },
  dolphin_enhance_output_resampling: {
    nome: 'Redimensionar a saída',
    dica: 'Como a imagem é aumentada no fim; o app já faz isso na janela.',
  },
  dolphin_mipmap_detection: { nome: 'Detectar mipmaps', dica: 'Pra pacotes de texturas; deixe desligado.' },
  dolphin_load_custom_textures: {
    nome: 'Texturas personalizadas',
    dica: 'Carrega pacotes de texturas da pasta do Dolphin.',
  },
  dolphin_cache_custom_textures: { nome: 'Pré-carregar texturas personalizadas', dica: 'Só com pacotes de texturas.' },
  dolphin_enhance_hdr_output: { nome: 'Saída HDR', dica: 'Só em tela HDR; o app mostra em cor comum.' },
  dolphin_mods_enabled: { nome: 'Mods gráficos', dica: 'Liga os mods gráficos da pasta do Dolphin.' },
  // ---------- Correções (atalhos de vídeo)
  dolphin_efb_to_texture: {
    nome: 'Cópias do EFB só na placa',
    dica: 'Mais rápido; alguns efeitos (reflexos, filtros) podem sumir.',
    aviso: HACK,
  },
  dolphin_xfb_to_texture_enable: { nome: 'Cópias do XFB só na placa', dica: 'Mais rápido; vídeos raros podem falhar.' },
  dolphin_efb_access_enable: {
    nome: 'Processador lê o EFB',
    dica: 'Alguns jogos leem a imagem pra mirar ou detectar coisas; ligue se algo assim não funcionar.',
  },
  dolphin_efb_scaled_copy: { nome: 'Cópias do EFB em alta resolução', dica: 'Efeitos na resolução interna.' },
  dolphin_skip_dupe_frames: {
    nome: 'Pular quadros repetidos',
    dica: 'Não manda de novo um quadro igual ao anterior.',
  },
  dolphin_immediate_xfb: {
    nome: 'XFB imediato',
    dica: 'Mostra o quadro assim que fica pronto: menos atraso, mas pode piscar.',
    aviso: HACK,
  },
  dolphin_vi_skip: { nome: 'Pular VI', dica: 'Pula quadros quando atrasa.', aviso: HACK },
  dolphin_bbox_enabled: { nome: 'Caixa de limites', dica: 'Precisa em poucos jogos (alguns de RPG); pesa.' },
  dolphin_vertex_rounding: { nome: 'Arredondar vértices', dica: 'Conserta linhas finas em alguns jogos 2D.' },
  dolphin_defer_efb_copies: { nome: 'Adiar cópias do EFB', dica: 'Mais rápido em quase todo jogo.' },
  // ---------- Emulação
  dolphin_cpu_clock_rate: {
    nome: 'Velocidade do processador',
    dica: 'Abaixo de 1,00 alivia jogos pesados (pode deixar lento); acima tira lentidão que o console já tinha.',
  },
  dolphin_cpu_core: {
    nome: 'Motor do processador',
    dica: 'JIT64 é o rápido; o interpretador é só pra testar.',
    valores: { '0': 'Interpretador (lento)', '1': 'JIT64 (rápido)', '5': 'Interpretador com cache' },
  },
  dolphin_fastmem: {
    nome: 'Memória rápida',
    dica: 'Acesso direto à memória do console; deixe ligado (é bem mais rápido).',
  },
  dolphin_fastmem_arena: { nome: 'Área da memória rápida', dica: 'Reserva a área da memória rápida; deixe ligado.' },
  dolphin_main_accurate_cpu_cache: {
    nome: 'Cache do processador preciso',
    dica: 'Precisa em poucos jogos; pesa.',
  },
  dolphin_main_load_game_into_memory: {
    nome: 'Carregar o jogo inteiro na memória',
    dica: 'Lê o disco todo pra memória ao abrir.',
    aviso: 'o disco do Wii tem até 8 GB: num PC com pouca memória, a máquina vai pra troca',
  },
  dolphin_precision_frame_timing: { nome: 'Ritmo de quadro preciso', dica: 'Tempo de quadro mais certinho.' },
  dolphin_rush_presentation: { nome: 'Mostrar o quadro antes', dica: 'Menos atraso; pode tremer.' },
  dolphin_early_presentation: { nome: 'Mostrar cedo, suave', dica: 'Menos atraso sem tremer tanto.' },
  dolphin_skip_gc_bios: {
    nome: 'Pular a abertura do GameCube',
    dica: 'Vai direto pro jogo, sem a animação do console.',
  },
  dolphin_emulation_speed: { nome: 'Velocidade da emulação', dica: '0 = sem limite (o app controla o ritmo).' },
  dolphin_fast_disc_speed: {
    nome: 'Disco rápido',
    dica: 'Lê o disco mais rápido que o console: telas de carregar mais curtas.',
    aviso: 'alguns jogos contam com o tempo do disco e podem travar',
  },
  dolphin_cheats_enabled: { nome: 'Trapaças (cheats)', dica: 'Aplica os códigos da pasta do Dolphin.' },
  // ---------- Som
  dolphin_dsp_hle: { nome: 'Som simplificado (DSP HLE)', dica: 'Bem mais leve; o completo (LLE) só em poucos jogos.' },
  dolphin_dsp_jit: { nome: 'Som completo com JIT', dica: 'Só vale com o som completo (LLE).' },
  dolphin_call_back_audio_method: {
    nome: 'Como o som sai',
    dica: 'Por quadro é o que combina com o app; deixe no padrão.',
    valores: { '0': 'O Dolphin empurra', '1': 'Por quadro', '2': 'Pela fila' },
  },
  // ---------- Sistema
  dolphin_language: {
    nome: 'Idioma do console',
    dica: 'O idioma que os jogos usam quando têm vários.',
    valores: {
      '0': 'Japonês',
      '1': 'Inglês',
      '2': 'Alemão',
      '3': 'Francês',
      '4': 'Espanhol',
      '5': 'Italiano',
      '6': 'Holandês',
      '7': 'Chinês simplificado',
      '8': 'Chinês tradicional',
      '9': 'Coreano',
    },
  },
  dolphin_pal60: { nome: 'PAL a 60 Hz', dica: 'Jogos europeus a 60 Hz quando eles deixam.' },
  dolphin_progressive_scan: { nome: 'Varredura progressiva', dica: 'Imagem sem entrelaçar, quando o jogo deixa.' },
  dolphin_widescreen: { nome: 'Tela larga (Wii)', dica: 'O Wii diz aos jogos que a TV é 16:9.' },
  dolphin_sensor_bar_position: {
    nome: 'Barra de sensores',
    dica: 'Onde fica a barra do Wii (embaixo ou em cima da TV).',
    valores: { '0': 'Embaixo', '1': 'Em cima' },
  },
  dolphin_disc_based_games_boot_to_wii_menu: {
    nome: 'Abrir o menu do Wii antes',
    dica: 'Começa pelo menu do Wii (precisa da NAND do console).',
  },
  dolphin_osd_enabled: { nome: 'Mensagens do Dolphin na tela', dica: 'Os avisos do Dolphin por cima da imagem.' },
  dolphin_enable_rumble: { nome: 'Vibração', dica: 'Liga a vibração do controle quando o jogo pede.' },
  // ---------- Controle
  dolphin_ir_mode: {
    nome: 'Ponteiro do Wiimote',
    dica: 'De onde vem a mira: o mouse sobre a imagem (o padrão do app) ou o analógico direito.',
    valores: {
      '0': 'Analógico direito (relativo)',
      '1': 'Analógico direito (absoluto)',
      '2': 'Mouse',
    },
    grupo: 'controle',
  },
  dolphin_wiimote_default_device: {
    nome: 'Controle do Wii',
    dica: 'O Wiimote com o Nunchuk serve na maioria; alguns jogos pedem o Wiimote de lado ou o Classic.',
    valores: {
      frontend: 'Pelo app',
      upright: 'Wiimote em pé',
      sideways: 'Wiimote de lado',
      nunchuk: 'Wiimote + Nunchuk',
      classic: 'Classic Controller',
      classic_pro: 'Classic Controller Pro',
      motionplus: 'Wiimote + MotionPlus',
      motionplus_sideways: 'MotionPlus de lado',
      motionplus_nunchuk: 'MotionPlus + Nunchuk',
      motionplus_classic: 'MotionPlus + Classic',
      motionplus_classic_pro: 'MotionPlus + Classic Pro',
      real: 'Wiimote de verdade (Bluetooth)',
      gamecube: 'Controle de GameCube',
    },
    grupo: 'controle',
  },
  dolphin_ir_deadzone: { nome: 'Zona morta do ponteiro', dica: 'Quanto mexer antes da mira andar.', grupo: 'controle' },
  dolphin_ir_offset: { nome: 'Ajuste vertical do ponteiro', dica: 'Sobe ou desce a mira.', grupo: 'controle' },
  dolphin_ir_pitch: {
    nome: 'Alcance vertical do ponteiro',
    dica: 'Quanto a mira anda pra cima e pra baixo.',
    grupo: 'controle',
  },
  dolphin_ir_yaw: { nome: 'Alcance horizontal do ponteiro', dica: 'Quanto a mira anda pros lados.', grupo: 'controle' },
  dolphin_default_mouse_bindings_enabled: {
    nome: 'Botões do mouse no Wiimote',
    dica: 'Esquerdo = A, direito = B, do meio = chacoalhar.',
    grupo: 'controle',
  },
  dolphin_swing_angle: {
    nome: 'Ângulo do balanço',
    dica: 'Quanto o Wiimote "balança" ao chacoalhar.',
    grupo: 'controle',
  },
  dolphin_alt_gc_ports_on_wii: {
    nome: 'Portas do GameCube no Wii',
    dica: 'Usa as portas 5 a 8 pros controles de GameCube nos jogos de Wii.',
    grupo: 'controle',
  },
  dolphin_wiimote_continuous_scanning: {
    nome: 'Procurar Wiimotes de verdade',
    dica: 'Fica procurando Wiimotes pelo Bluetooth.',
    grupo: 'controle',
  },
  dolphin_bluetooth_passthrough: {
    nome: 'Bluetooth direto',
    dica: 'Entrega um adaptador Bluetooth inteiro ao Wii emulado.',
    grupo: 'controle',
  },
};
