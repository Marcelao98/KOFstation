// Catálogo das opções de emulação por console (M16.4): o que o app pode oferecer ao Marcelo, em português, com os
// perfis ⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel. Puro: só dados e funções. As chaves e os valores saem do que os núcleos
// nativos realmente declaram no `SET_VARIABLES` (conferido pelo teste Rust `crates/kof-nativo/tests/opcoes.rs`, que
// lê o JSON gerado em `packages/contracts/fixtures/opcoes-nucleo.json`).
//
// Fora do catálogo de propósito (são do app, fixas): `pcsx2_bios`, `pcsx2_renderer`. As opções do renderizador
// paraLLEl (`pcsx2_pgs_*`) também ficam de fora: o app usa o renderizador OpenGL, que não lê essas.
import type { SistemaId } from './sistemas';

export type Perfil = 'rapido' | 'equilibrado' | 'fiel';
export const PERFIS: readonly Perfil[] = ['rapido', 'equilibrado', 'fiel'];

export interface ValorDeOpcao {
  /** valor EXATO que o núcleo aceita */
  valor: string;
  nome: string;
}

export type GrupoDeOpcao = 'imagem' | 'velocidade' | 'som' | 'precisao' | 'outros';

export interface OpcaoDeNucleo {
  chave: string;
  nome: string;
  dica: string;
  grupo: GrupoDeOpcao;
  valores: ValorDeOpcao[];
  /** o padrão do núcleo (o primeiro valor do `SET_VARIABLES`) */
  padrao: string;
  /** o núcleo relê sem reabrir o jogo (`GET_VARIABLE_UPDATE`)? Falso nas que o próprio núcleo marca "(Restart)" */
  naHora: boolean;
  perfis: Record<Perfil, string>;
  /** só aparece no Avançado */
  avancada?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------
// ajudantes pra escrever o catálogo sem repetir

const v = (valor: string, nome = valor): ValorDeOpcao => ({ valor, nome });
const simNao = (sim = 'enabled', nao = 'disabled'): ValorDeOpcao[] => [v(sim, 'Ligado'), v(nao, 'Desligado')];
const lista = (...valores: string[]): ValorDeOpcao[] => valores.map((x) => v(x));
const perfis = (rapido: string, equilibrado: string, fiel: string): Record<Perfil, string> => ({
  rapido,
  equilibrado,
  fiel,
});
/** o mesmo valor nos três perfis (opção que não muda com o perfil, mas o jogador pode ajustar) */
const igual = (x: string): Record<Perfil, string> => perfis(x, x, x);

// ---------------------------------------------------------------------------------------------------------------------
// PS2 · LRPS2 (libretro/ps2, commit 38d3a83f). O Equilibrado é o que o app usa hoje: padrões do núcleo, só com o
// `pcsx2_ee_cycle_skip` em 'Mild Underclock' (deixou o Shadow of the Colossus em 60 fps num Ryzen 5 4600H).

const PS2: OpcaoDeNucleo[] = [
  {
    chave: 'pcsx2_upscale_multiplier',
    nome: 'Resolução interna',
    dica: 'Quantas vezes a resolução original do PS2 o jogo desenha; mais nítido, mas pesa muito na placa de vídeo.',
    grupo: 'imagem',
    valores: [v('1x (Native)', 'Original (1x)'), v('2x'), v('4x'), v('8x')],
    padrao: '1x (Native)',
    naHora: false,
    perfis: perfis('1x (Native)', '1x (Native)', '2x'),
  },
  {
    chave: 'pcsx2_ee_cycle_skip',
    nome: 'Pular ciclos do processador',
    dica: 'Deixa o processador do PS2 um pouco mais lento de propósito pra ganhar quadros; use se o jogo não chega aos 60 fps.',
    grupo: 'velocidade',
    valores: [
      v('disabled', 'Desligado'),
      v('Mild Underclock', 'Leve'),
      v('Moderate Underclock', 'Moderado'),
      v('Maximum Underclock', 'Máximo'),
    ],
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('Moderate Underclock', 'Mild Underclock', 'disabled'),
  },
  {
    chave: 'pcsx2_ee_cycle_rate',
    nome: 'Velocidade do processador (EE)',
    dica: 'Abaixo de 100% alivia jogos pesados (mas pode quebrar o ritmo); acima de 100% tira lentidão que o PS2 de verdade também tinha.',
    grupo: 'velocidade',
    valores: [
      v('100% (Normal Speed)', '100% (normal)'),
      v('50% (Underclock)', '50%'),
      v('60% (Underclock)', '60%'),
      v('75% (Underclock)', '75%'),
      v('130% (Overclock)', '130%'),
      v('180% (Overclock)', '180%'),
      v('300% (Overclock)', '300%'),
    ],
    padrao: '100% (Normal Speed)',
    naHora: true,
    perfis: igual('100% (Normal Speed)'),
    avancada: true,
  },
  {
    chave: 'pcsx2_mtvu',
    nome: 'VU1 em outro núcleo do processador (MTVU)',
    dica: 'Usa mais um núcleo do seu processador pra dar conta do VU1; ajuda em quase todo jogo se você tem 4 núcleos ou mais.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('enabled', 'disabled', 'disabled'),
  },
  {
    chave: 'pcsx2_instant_vu1',
    nome: 'VU1 instantâneo',
    dica: 'Roda o VU1 de uma vez só, sem contar os ciclos; é mais rápido e funciona na maioria dos jogos, mas pode errar o tempo em alguns.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'enabled',
    naHora: false,
    perfis: perfis('enabled', 'enabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_fastcdvd',
    nome: 'Leitura rápida do DVD',
    dica: 'Tira a espera da leitura do disco; acelera telas de carregamento, mas alguns jogos travam sem ela.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('enabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_texture_filtering',
    nome: 'Filtro de textura',
    dica: 'Como as texturas são suavizadas: "Padrão do PS2" é o fiel; "Mais próximo" deixa pixelado e é o mais leve.',
    grupo: 'imagem',
    valores: [
      v('Bilinear (PS2)', 'Padrão do PS2'),
      v('Nearest', 'Mais próximo (pixelado)'),
      v('Bilinear (Forced)', 'Bilinear forçado'),
      v('Bilinear (Forced excluding sprite)', 'Bilinear forçado (sem sprites)'),
    ],
    padrao: 'Bilinear (PS2)',
    naHora: true,
    perfis: perfis('Nearest', 'Bilinear (PS2)', 'Bilinear (PS2)'),
  },
  {
    chave: 'pcsx2_trilinear_filtering',
    nome: 'Filtro trilinear (mipmap)',
    dica: 'Suaviza a troca de detalhe das texturas ao longe; "Automático" deixa o núcleo decidir por jogo.',
    grupo: 'imagem',
    valores: [
      v('Automatic', 'Automático'),
      v('disabled', 'Desligado'),
      v('Trilinear (PS2)', 'Trilinear do PS2'),
      v('Trilinear (Forced)', 'Trilinear forçado'),
    ],
    padrao: 'Automatic',
    naHora: true,
    perfis: perfis('disabled', 'Automatic', 'Trilinear (PS2)'),
    avancada: true,
  },
  {
    chave: 'pcsx2_anisotropic_filtering',
    nome: 'Filtro anisotrópico',
    dica: 'Deixa nítidas as texturas vistas de lado (chão, estrada); custa um pouco da placa de vídeo.',
    grupo: 'imagem',
    valores: [v('disabled', 'Desligado'), v('2x'), v('4x'), v('8x'), v('16x')],
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('disabled', 'disabled', '4x'),
  },
  {
    chave: 'pcsx2_blending_accuracy',
    nome: 'Precisão das transparências',
    dica: 'Mais alto acerta melhor fumaça, luz e névoa, e pesa mais na placa; se o jogo parecer errado nas transparências, suba.',
    grupo: 'precisao',
    valores: [
      v('Basic', 'Básica'),
      v('Minimum', 'Mínima'),
      v('Medium', 'Média'),
      v('High', 'Alta'),
      v('Full', 'Total'),
      v('Maximum', 'Máxima'),
    ],
    padrao: 'Basic',
    naHora: true,
    perfis: perfis('Minimum', 'Basic', 'High'),
  },
  {
    chave: 'pcsx2_dithering',
    nome: 'Pontilhado (dithering)',
    dica: 'A textura de pontinhos que o PS2 usava pra disfarçar degradês; "Sem escala" é o visual original.',
    grupo: 'imagem',
    valores: [
      v('Unscaled', 'Sem escala (original)'),
      v('disabled', 'Desligado'),
      v('Scaled', 'Com escala'),
      v('Force 32bit', 'Forçar 32 bits'),
    ],
    padrao: 'Unscaled',
    naHora: true,
    perfis: perfis('disabled', 'Unscaled', 'Unscaled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_hw_download_mode',
    nome: 'Leitura de volta da imagem (placa → processador)',
    dica: 'Alguns efeitos precisam ler a imagem de volta da placa de vídeo; desligar acelera, mas pode sumir algum efeito.',
    grupo: 'velocidade',
    valores: [
      v('Accurate', 'Precisa'),
      v('Disable Readbacks', 'Sem leituras'),
      v('Unsynchronized', 'Sem sincronizar'),
      v('Disabled', 'Desligada'),
    ],
    padrao: 'Accurate',
    naHora: true,
    perfis: perfis('Disable Readbacks', 'Accurate', 'Accurate'),
    avancada: true,
  },
  {
    chave: 'pcsx2_deinterlace_mode',
    nome: 'Desentrelaçamento',
    dica: 'Como a imagem entrelaçada (linhas alternadas) vira imagem inteira; "Automático" funciona na maioria dos jogos.',
    grupo: 'imagem',
    valores: [
      v('Automatic', 'Automático'),
      v('Off', 'Desligado'),
      v('Weave TFF'),
      v('Weave BFF'),
      v('Bob TFF'),
      v('Bob BFF'),
      v('Blend TFF'),
      v('Blend BFF'),
      v('Adaptive TFF'),
      v('Adaptive BFF'),
    ],
    padrao: 'Automatic',
    naHora: true,
    perfis: igual('Automatic'),
    avancada: true,
  },
  {
    chave: 'pcsx2_ee_accurate_fpu',
    nome: 'Contas de ponto flutuante exatas (EE)',
    dica: 'Imita as contas do PS2 com mais exatidão; desligar acelera um pouco e quase nunca muda nada.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'enabled',
    naHora: true,
    perfis: perfis('disabled', 'enabled', 'enabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_fpu_softfloat',
    nome: 'Ponto flutuante por software (EE)',
    dica: 'Mais exato e bem mais lento; só ligue se um jogo tiver bug de física ou de câmera.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: igual('disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_vu_exact_mul',
    nome: 'Multiplicação exata (VU)',
    dica: 'Corrige gráficos tremendo ou sumindo em alguns jogos; custa velocidade.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('disabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_vu_exact_div',
    nome: 'Divisão exata (VU)',
    dica: 'Corrige gráficos que somem ou distorcem em alguns jogos; custa velocidade.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('disabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_fastboot',
    nome: 'Pular a tela de abertura do PS2',
    dica: 'Vai direto pro jogo sem passar pela animação da BIOS; só vale na hora de abrir o jogo.',
    grupo: 'outros',
    valores: simNao(),
    padrao: 'enabled',
    naHora: false,
    perfis: igual('enabled'),
  },
  {
    chave: 'pcsx2_widescreen_hint',
    nome: 'Aviso de tela larga',
    dica: 'Avisa o jogo que a tela é larga, pra os que têm modo widescreen usarem; só funciona com jogos que suportam.',
    grupo: 'imagem',
    valores: [
      v('disabled', 'Desligado'),
      v('enabled (16:9)', '16:9'),
      v('enabled (16:10)', '16:10'),
      v('enabled (21:9)', '21:9'),
      v('enabled (32:9)', '32:9'),
    ],
    padrao: 'disabled',
    naHora: false,
    perfis: igual('disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_nointerlacing_hint',
    nome: 'Aviso de "sem entrelaçamento"',
    dica: 'Pede ao jogo que não use imagem entrelaçada, quando ele permite; dá uma imagem mais firme.',
    grupo: 'imagem',
    valores: simNao(),
    padrao: 'enabled',
    naHora: false,
    perfis: igual('enabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_disable_shader_cache',
    nome: 'Desligar o cache de shaders',
    dica: 'O cache evita engasgos quando um efeito aparece pela primeira vez; só desligue pra testar um defeito.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: igual('disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_preload_frame_data',
    nome: 'Pré-carregar dados do quadro',
    dica: 'Carrega antes o que o jogo vai desenhar; dá menos engasgos em alguns jogos, mas gasta mais memória de vídeo.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('enabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx2_pgs_disable_mipmaps',
    nome: 'Sem mipmap (textura sempre no detalhe máximo)',
    dica: 'Usa sempre o maior detalhe das texturas; deixa mais nítido ao longe, mas pode brilhar ou cintilar.',
    grupo: 'imagem',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: igual('disabled'),
    avancada: true,
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// PS1 · PCSX-ReARMed (commit c8816799). O Equilibrado é o que o app usa hoje: frameskip 'auto', intervalo 3
// (e o recompilador ligado no nativo).

const PS1: OpcaoDeNucleo[] = [
  {
    chave: 'pcsx_rearmed_drc',
    nome: 'Recompilador (dynarec)',
    dica: 'Traduz o código do PS1 em vez de interpretar; é muito mais rápido, desligue só pra achar um defeito.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'enabled',
    naHora: true,
    perfis: igual('enabled'),
  },
  {
    chave: 'pcsx_rearmed_frameskip_type',
    nome: 'Pular quadros',
    dica: 'Quando a máquina não aguenta, desenha menos imagens pra manter a velocidade; "Automático" só pula quando precisa.',
    grupo: 'velocidade',
    valores: [
      v('disabled', 'Desligado'),
      v('auto', 'Automático'),
      v('auto_threshold', 'Automático (por limite)'),
      v('fixed_interval', 'Intervalo fixo'),
    ],
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('auto', 'auto', 'disabled'),
  },
  {
    chave: 'pcsx_rearmed_frameskip_interval',
    nome: 'Intervalo do pulo de quadros',
    dica: 'No modo de intervalo fixo, pula 1 quadro a cada N; no automático, é o máximo de quadros seguidos que ele pula.',
    grupo: 'velocidade',
    valores: lista('1', '2', '3', '4', '5', '6', '7', '8', '9', '10'),
    padrao: '3',
    naHora: true,
    perfis: perfis('3', '3', '3'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_frameskip_threshold',
    nome: 'Limite do pulo automático (%)',
    dica: 'No modo "Automático (por limite)", pula quadros quando o buffer de som cai abaixo dessa porcentagem.',
    grupo: 'velocidade',
    valores: lista(
      '15',
      '18',
      '21',
      '24',
      '27',
      '30',
      '33',
      '36',
      '39',
      '42',
      '45',
      '48',
      '51',
      '54',
      '57',
      '60',
      '65',
      '70',
      '75',
      '80',
    ),
    padrao: '33',
    naHora: true,
    perfis: igual('33'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_gpu_thread_rendering',
    nome: 'Desenho em outro núcleo do processador',
    dica: 'Passa o desenho pra outra thread do processador; ajuda em máquinas fracas e pode dar um pouco de atraso na imagem.',
    grupo: 'velocidade',
    valores: [v('auto', 'Automático'), v('disabled', 'Desligado'), v('enabled', 'Ligado')],
    padrao: 'auto',
    naHora: true,
    perfis: perfis('enabled', 'auto', 'disabled'),
  },
  {
    chave: 'pcsx_rearmed_spu_thread',
    nome: 'Som em outro núcleo do processador',
    dica: 'Processa o som numa thread separada; alivia o processador, mas pode dessincronizar o som em alguns jogos.',
    grupo: 'som',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('enabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_spu_interpolation',
    nome: 'Suavização do som',
    dica: 'Como as amostras de som são suavizadas; "Gaussiana" soa como o PS1 de verdade, "Simples" é a mais leve.',
    grupo: 'som',
    valores: [v('simple', 'Simples'), v('gaussian', 'Gaussiana'), v('cubic', 'Cúbica'), v('off', 'Desligada')],
    padrao: 'simple',
    naHora: true,
    perfis: perfis('off', 'simple', 'gaussian'),
  },
  {
    chave: 'pcsx_rearmed_spu_reverb',
    nome: 'Eco e reverberação do som',
    dica: 'Os efeitos de eco (cavernas, salões); desligar alivia um pouco o processador mas empobrece o som.',
    grupo: 'som',
    valores: simNao(),
    padrao: 'enabled',
    naHora: true,
    perfis: perfis('disabled', 'enabled', 'enabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_neon_enhancement_enable',
    nome: 'Resolução melhorada',
    dica: 'Desenha em resolução maior que a original do PS1 (só no desenhador NEON, que o PC não usa na maioria dos casos).',
    grupo: 'imagem',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: igual('disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_dithering',
    nome: 'Pontilhado (dithering)',
    dica: 'A textura de pontinhos que o PS1 usava pra disfarçar degradês; ligado é o visual original.',
    grupo: 'imagem',
    valores: [v('enabled', 'Ligado'), v('disabled', 'Desligado'), v('force', 'Forçar')],
    padrao: 'enabled',
    naHora: true,
    perfis: perfis('disabled', 'enabled', 'enabled'),
  },
  {
    chave: 'pcsx_rearmed_icache_emulation',
    nome: 'Cache de instruções',
    dica: 'Imita o cache do processador do PS1: mais exato em jogos sensíveis ao tempo, um pouco mais lento.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'enabled',
    naHora: true,
    perfis: perfis('disabled', 'enabled', 'enabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_exception_emulation',
    nome: 'Exceções e pontos de parada',
    dica: 'Imita erros do processador como o PS1 de verdade; só ajuda em uns poucos jogos e custa velocidade.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('disabled', 'disabled', 'enabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_nostalls',
    nome: 'Sem esperas do processador e da GTE',
    dica: 'Tira as esperas de ciclo do processador e do chip de geometria; acelera, mas alguns jogos perdem o ritmo.',
    grupo: 'precisao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('enabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_cd_turbo',
    nome: 'CD turbo',
    dica: 'Lê o CD mais rápido: telas de carregamento bem mais curtas, mas alguns jogos se perdem no tempo.',
    grupo: 'velocidade',
    valores: simNao(),
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('enabled', 'disabled', 'disabled'),
    avancada: true,
  },
  {
    chave: 'pcsx_rearmed_region',
    nome: 'Região',
    dica: 'Força NTSC (60 Hz) ou PAL (50 Hz); "Auto" lê do disco, que é o certo na maioria dos casos.',
    grupo: 'outros',
    valores: [v('auto', 'Automática'), v('NTSC'), v('PAL')],
    padrao: 'auto',
    naHora: false,
    perfis: igual('auto'),
    avancada: true,
  },
];

export const OPCOES_DE_NUCLEO: Partial<Record<SistemaId, OpcaoDeNucleo[]>> = {
  ps2: PS2,
  ps1: PS1,
};

/** As chaves e os valores de um sistema num perfil, prontos pra mandar ao núcleo. Sistema sem catálogo: vazio. */
export function valoresDoPerfil(sistema: SistemaId, perfil: Perfil): Record<string, string> {
  const r: Record<string, string> = {};
  for (const o of OPCOES_DE_NUCLEO[sistema] ?? []) r[o.chave] = o.perfis[perfil];
  return r;
}

/** Confere um conjunto de opções contra o catálogo (chave e valor existem). Mensagens em português. */
export function conferirOpcoes(sistema: SistemaId, valores: Record<string, string>): { ok: boolean; erros: string[] } {
  const catalogo = OPCOES_DE_NUCLEO[sistema];
  const erros: string[] = [];
  if (!catalogo) {
    return { ok: false, erros: [`O sistema "${sistema}" ainda não tem opções de emulação no catálogo.`] };
  }
  for (const [chave, valor] of Object.entries(valores)) {
    const o = catalogo.find((x) => x.chave === chave);
    if (!o) {
      erros.push(`A opção "${chave}" não existe no catálogo de ${sistema}.`);
    } else if (!o.valores.some((x) => x.valor === valor)) {
      erros.push(
        `O valor "${valor}" não é aceito pela opção "${chave}" (aceitos: ${o.valores.map((x) => x.valor).join(', ')}).`,
      );
    }
  }
  return { ok: erros.length === 0, erros };
}
