// Catálogo das opções de emulação por console (M16.4): o que o app pode oferecer ao Marcelo, em português, com os
// perfis ⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel. Puro: só dados e funções. As chaves e os valores saem do que os núcleos
// nativos realmente declaram no `SET_VARIABLES` (conferido pelo teste Rust `crates/kof-nativo/tests/opcoes.rs`, que
// lê o JSON gerado em `packages/contracts/fixtures/opcoes-nucleo.json`).
//
// PS2: além das curadas, TODAS as outras que o núcleo declara (opcoes-lrps2.ts, gerado do cabeçalho do núcleo), em
// português quando opcoes-lrps2-pt.ts traduz, no Avançado: nada escondido. Fixas pelo app (fora do catálogo, a tela
// diz por quê): `pcsx2_bios` e `pcsx2_renderer` (FIXAS_PELO_APP).
import { OPCOES_DOLPHIN } from './opcoes-dolphin';
import { TRADUCAO_DOLPHIN } from './opcoes-dolphin-pt';
import { OPCOES_LRPS2, type OpcaoDeclarada } from './opcoes-lrps2';
import { TRADUCAO_LRPS2, type TraducaoDeOpcao } from './opcoes-lrps2-pt';
import { GB, GBA, GENPLUS, N64, NES, SNES } from './opcoes-nucleo-wasm';
import { OPCOES_PS1_DECLARADAS } from './opcoes-ps1-declaradas';
import { TRADUCAO_PCSX } from './opcoes-pcsx-pt';
import type { SistemaId } from './sistemas';

export type Perfil = 'rapido' | 'equilibrado' | 'fiel' | 'bonito';
export const PERFIS: readonly Perfil[] = ['rapido', 'equilibrado', 'fiel', 'bonito'];

export interface ValorDeOpcao {
  /** valor EXATO que o núcleo aceita */
  valor: string;
  nome: string;
}

/** Os grupos como no PCSX2 (Gráficos, Emulação, Som, Cartão de memória, Correções, Sistema) e o Controle. */
export type GrupoDeOpcao = 'graficos' | 'emulacao' | 'som' | 'cartao' | 'correcoes' | 'sistema' | 'controle';
export const GRUPOS_DE_OPCAO: readonly (readonly [GrupoDeOpcao, string])[] = [
  ['graficos', 'Gráficos'],
  ['emulacao', 'Emulação'],
  ['som', 'Som'],
  ['cartao', 'Cartão de memória'],
  ['correcoes', 'Correções do jogo'],
  ['sistema', 'Sistema'],
  ['controle', 'Controle'],
];

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
  /** pode quebrar o jogo ou derrubar o fps: a tela mostra ⚠ e o motivo */
  aviso?: string;
  /** sem tradução: nome e dica como o núcleo escreve */
  original?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------
// ajudantes pra escrever o catálogo sem repetir

const v = (valor: string, nome = valor): ValorDeOpcao => ({ valor, nome });
const simNao = (sim = 'enabled', nao = 'disabled'): ValorDeOpcao[] => [v(sim, 'Ligado'), v(nao, 'Desligado')];
const lista = (...valores: string[]): ValorDeOpcao[] => valores.map((x) => v(x));
/** ✨ Bonito: sem valor próprio, igual ao 🎯 Fiel (o máximo de gráfico liso é medido e anotado no docs/PS2-LISO.md) */
const perfis = (rapido: string, equilibrado: string, fiel: string, bonito = fiel): Record<Perfil, string> => ({
  rapido,
  equilibrado,
  fiel,
  bonito,
});
/** o mesmo valor nos três perfis (opção que não muda com o perfil, mas o jogador pode ajustar) */
const igual = (x: string): Record<Perfil, string> => perfis(x, x, x);

// ---------------------------------------------------------------------------------------------------------------------
// PS2 · LRPS2 (libretro/ps2, commit 38d3a83f). O Equilibrado é o que o app usa hoje: padrões do núcleo, só com o
// `pcsx2_ee_cycle_skip` em 'Mild Underclock' (deixou o jogo pesado A em 60 fps num Ryzen 5 4600H).

const PS2_CURADO: OpcaoDeNucleo[] = [
  {
    chave: 'pcsx2_upscale_multiplier',
    nome: 'Resolução interna',
    dica: 'Quantas vezes a resolução original do PS2 o jogo desenha; mais nítido, mas pesa muito na placa de vídeo.',
    grupo: 'graficos',
    valores: [v('1x (Native)', 'Original (1x)'), v('2x'), v('4x'), v('8x')],
    padrao: '1x (Native)',
    naHora: false,
    perfis: perfis('1x (Native)', '1x (Native)', '2x', '2x'),
  },
  {
    chave: 'pcsx2_ee_cycle_skip',
    nome: 'Pular ciclos do processador',
    dica: 'Deixa o processador do PS2 um pouco mais lento de propósito pra ganhar quadros; use se o jogo não chega aos 60 fps.',
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('enabled', 'disabled', 'disabled', 'enabled'),
  },
  {
    chave: 'pcsx2_instant_vu1',
    nome: 'VU1 instantâneo',
    dica: 'Roda o VU1 de uma vez só, sem contar os ciclos; é mais rápido e funciona na maioria dos jogos, mas pode errar o tempo em alguns.',
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'graficos',
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
    grupo: 'graficos',
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
    grupo: 'graficos',
    valores: [v('disabled', 'Desligado'), v('2x'), v('4x'), v('8x'), v('16x')],
    padrao: 'disabled',
    naHora: true,
    perfis: perfis('disabled', 'disabled', '4x', '8x'),
  },
  {
    chave: 'pcsx2_blending_accuracy',
    nome: 'Precisão das transparências',
    dica: 'Mais alto acerta melhor fumaça, luz e névoa, e pesa mais na placa; se o jogo parecer errado nas transparências, suba.',
    grupo: 'emulacao',
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
    // ✨ Bonito em Básica (4.3, 19/11): a Alta junto com a resolução 2x engasgava (jogo pesado A: 133 → 39–60
    // engasgos/min trocando só ela; o MTVU e o anisotrópico quase não mudavam). O Fiel continua Alta (o 1x aguenta)
    perfis: perfis('Minimum', 'Basic', 'High', 'Basic'),
  },
  {
    chave: 'pcsx2_dithering',
    nome: 'Pontilhado (dithering)',
    dica: 'A textura de pontinhos que o PS2 usava pra disfarçar degradês; "Sem escala" é o visual original.',
    grupo: 'graficos',
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
    grupo: 'emulacao',
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
    grupo: 'graficos',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'sistema',
    valores: simNao(),
    padrao: 'enabled',
    naHora: false,
    perfis: igual('enabled'),
  },
  {
    chave: 'pcsx2_widescreen_hint',
    nome: 'Aviso de tela larga',
    dica: 'Avisa o jogo que a tela é larga, pra os que têm modo widescreen usarem; só funciona com jogos que suportam.',
    grupo: 'graficos',
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
    grupo: 'graficos',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'graficos',
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

const PS1_CURADO: OpcaoDeNucleo[] = [
  {
    chave: 'pcsx_rearmed_drc',
    nome: 'Recompilador (dynarec)',
    dica: 'Traduz o código do PS1 em vez de interpretar; é muito mais rápido, desligue só pra achar um defeito.',
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'enabled',
    naHora: true,
    perfis: igual('enabled'),
  },
  {
    chave: 'pcsx_rearmed_frameskip_type',
    nome: 'Pular quadros',
    dica: 'Quando a máquina não aguenta, desenha menos imagens pra manter a velocidade; "Automático" só pula quando precisa.',
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'graficos',
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
    grupo: 'graficos',
    valores: [v('enabled', 'Ligado'), v('disabled', 'Desligado'), v('force', 'Forçar')],
    padrao: 'enabled',
    naHora: true,
    perfis: perfis('disabled', 'enabled', 'enabled'),
  },
  {
    chave: 'pcsx_rearmed_icache_emulation',
    nome: 'Cache de instruções',
    dica: 'Imita o cache do processador do PS1: mais exato em jogos sensíveis ao tempo, um pouco mais lento.',
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'emulacao',
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
    grupo: 'sistema',
    valores: [v('auto', 'Automática'), v('NTSC'), v('PAL')],
    padrao: 'auto',
    naHora: false,
    perfis: igual('auto'),
    avancada: true,
  },
];

/** Do app, fixas: não entram no catálogo (a tela lista com o motivo). */
export const FIXAS_PELO_APP: Readonly<Record<string, { nome: string; motivo: string }>> = {
  pcsx2_bios: { nome: 'BIOS', motivo: 'o app escolhe a BIOS que você guardou em Sistema → BIOS' },
  pcsx2_renderer: {
    nome: 'Renderizador',
    motivo: 'o app desenha com OpenGL (o único que funciona com a imagem levada pra janela do app)',
  },
  pcsx_rearmed_bios: {
    nome: 'BIOS',
    motivo: 'o app usa a BIOS que você guardou em Sistema → BIOS (sem ela, a do PCSX)',
  },
  dolphin_renderer: {
    nome: 'Renderizador',
    motivo: 'o app desenha com OpenGL pela placa (o único que funciona com a imagem levada pra janela do app)',
  },
  dolphin_libretro_vfs_enabled: {
    nome: 'Sistema de arquivos do libretro',
    motivo: 'o processo do jogo lê o disco direto do disco',
  },
  dolphin_save_load_settings: {
    nome: 'Configurações salvas pelo Dolphin',
    motivo: 'quem guarda as opções é o app (perfis, console e jogo)',
  },
  pcsx_rearmed_memcard1: {
    nome: 'Cartão de memória 1',
    motivo: 'é o cartão que o app guarda como o save do jogo (e leva no backup .kofsave)',
  },
};

const SIM_NAO: Record<string, string> = { enabled: 'Ligado', disabled: 'Desligado' };
const GRUPO_DA_CATEGORIA: Record<string, GrupoDeOpcao> = {
  system: 'sistema',
  video: 'graficos',
  emulation: 'emulacao',
  hw_hacks: 'correcoes',
  input: 'controle',
  audio: 'som',
};

/**
 * Uma opção que o núcleo declara e o catálogo curado não detalha: vai pro Avançado, com o padrão do núcleo nos perfis
 * (os perfis não mexem nela), em português quando há tradução. "(Restart)" no nome = só vale ao reabrir.
 */
export function opcaoDeclarada(
  d: OpcaoDeclarada,
  grupo?: GrupoDeOpcao,
  traducao: Readonly<Record<string, TraducaoDeOpcao>> = TRADUCAO_LRPS2,
): OpcaoDeNucleo {
  const t = traducao[d.chave];
  const nomeOriginal = d.descricao.replace(/^[^>]*>\s*/, '').replace(/\s*\(Restart\)\s*$/, '');
  return {
    chave: d.chave,
    nome: t?.nome ?? nomeOriginal,
    dica: t?.dica ?? d.info,
    grupo:
      grupo ??
      (d.chave === 'pcsx2_shared_memory_cards' ? 'cartao' : (GRUPO_DA_CATEGORIA[d.categoria ?? ''] ?? 'correcoes')),
    valores: d.valores.map((x) => ({
      valor: x.valor,
      nome: t?.valores?.[x.valor] ?? SIM_NAO[x.valor] ?? x.rotulo ?? x.valor,
    })),
    padrao: d.padrao,
    naHora: !d.descricao.includes('(Restart)'),
    perfis: igual(d.padrao),
    avancada: true,
    ...(t?.aviso ? { aviso: t.aviso } : {}),
    ...(t ? {} : { original: true }),
  };
}

/** O PS1: o curado + tudo o que o PCSX declara de verdade (4.2), no Avançado, em português, cada uma no grupo dela. */
const PS1: OpcaoDeNucleo[] = [
  ...PS1_CURADO,
  ...OPCOES_PS1_DECLARADAS.filter(
    (d) => !FIXAS_PELO_APP[d.chave] && d.valores.length && !PS1_CURADO.some((c) => c.chave === d.chave),
  ).map((d) => opcaoDeclarada(d, TRADUCAO_PCSX[d.chave]?.grupo, TRADUCAO_PCSX)),
];

const PS2: OpcaoDeNucleo[] = [
  ...PS2_CURADO,
  ...OPCOES_LRPS2.filter(
    (d) => !FIXAS_PELO_APP[d.chave] && d.valores.length && !PS2_CURADO.some((c) => c.chave === d.chave),
  ).map((d) => opcaoDeclarada(d)),
];

// ---------------------------------------------------------------------------------------------------------------------
// Wii e GameCube · Dolphin do libretro (dolphin-emu 2609.0.168+0863ee3700, tarefa W.5). ⚖ Equilibrado = o padrão do
// núcleo; as do controle (ponteiro no mouse, Wiimote com Nunchuk) e o motor JIT64 são o jeito do app nos quatro perfis.
// O que mais pesa no Dolphin: shader na 1ª vez (engasgo clássico) e o processador (dual core).

const DOLPHIN_CURADO: OpcaoDeNucleo[] = [
  {
    chave: 'dolphin_efb_scale',
    nome: 'Resolução interna',
    dica: 'Quantas vezes a resolução original o jogo desenha; mais nítido, mas pesa muito na placa de vídeo.',
    grupo: 'graficos',
    valores: Array.from({ length: 12 }, (_, i) => v(String(i + 1), i ? `${i + 1}x` : 'Original (1x)')),
    padrao: '1',
    naHora: true,
    perfis: perfis('1', '1', '1', '2'),
  },
  {
    chave: 'dolphin_shader_compilation_mode',
    nome: 'Shaders (o engasgo da 1ª vez)',
    dica: 'O Dolphin monta um shader cada vez que vê um efeito novo, e isso dá um tranco. Com os ubershaders o jogo não para, mas pesa mais na placa.',
    grupo: 'graficos',
    valores: [
      v('0', 'Monta e espera (padrão)'),
      v('1', 'Ubershaders, espera'),
      v('2', 'Ubershaders sem esperar'),
      v('3', 'Não desenha até montar'),
    ],
    padrao: '0',
    naHora: true,
    perfis: perfis('2', '0', '0', '2'),
  },
  {
    chave: 'dolphin_wait_for_shaders',
    nome: 'Esperar os shaders ao abrir',
    dica: 'Monta os shaders já conhecidos antes de começar: abre mais devagar e engasga menos depois.',
    grupo: 'graficos',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('disabled', 'disabled', 'disabled', 'enabled'),
  },
  {
    chave: 'dolphin_max_anisotropy',
    nome: 'Filtro anisotrópico',
    dica: 'Texturas do chão e das paredes nítidas de longe; pesa um pouco na placa.',
    grupo: 'graficos',
    valores: [v('0', '1x (desligado)'), v('1', '2x'), v('2', '4x'), v('3', '8x'), v('4', '16x')],
    padrao: '0',
    naHora: true,
    perfis: perfis('0', '0', '0', '2'),
  },
  {
    chave: 'dolphin_main_cpu_thread',
    nome: 'Dois núcleos (dual core)',
    dica: 'O Dolphin usa uma linha pro processador do console e outra pro vídeo: bem mais rápido, mas alguns jogos travam ou piscam.',
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'enabled',
    naHora: false,
    perfis: perfis('enabled', 'enabled', 'disabled', 'enabled'),
    aviso: 'desligado é mais fiel e bem mais pesado no processador',
  },
  {
    chave: 'dolphin_sync_gpu',
    nome: 'Sincronizar o vídeo com o processador',
    dica: 'Com dois núcleos, mantém o vídeo no passo do processador: conserta alguns jogos e pesa.',
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('disabled', 'disabled', 'enabled', 'disabled'),
  },
  {
    chave: 'dolphin_main_mmu',
    nome: 'MMU (memória completa)',
    dica: 'Emula a memória do console por inteiro; precisa em poucos jogos e pesa.',
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('disabled', 'disabled', 'enabled', 'disabled'),
  },
  {
    chave: 'dolphin_cpu_clock_rate',
    nome: 'Velocidade do processador',
    dica: 'Abaixo de 1,00 alivia jogos pesados (podem ficar lentos); acima tira lentidão que o console já tinha.',
    grupo: 'emulacao',
    valores: OPCOES_DOLPHIN.find((d) => d.chave === 'dolphin_cpu_clock_rate')?.valores.map((x) =>
      v(x.valor, x.valor.replace('.', ',')),
    ) ?? [v('1.00', '1,00')],
    padrao: '1.00',
    naHora: true,
    perfis: igual('1.00'),
    avancada: true,
  },
  {
    chave: 'dolphin_fast_disc_speed',
    nome: 'Disco rápido',
    dica: 'Lê o disco mais rápido que o console: telas de carregar mais curtas.',
    grupo: 'emulacao',
    valores: simNao(),
    padrao: 'disabled',
    naHora: false,
    perfis: perfis('enabled', 'disabled', 'disabled', 'disabled'),
    aviso: 'alguns jogos contam com o tempo do disco e podem travar',
  },
  {
    chave: 'dolphin_cpu_core',
    nome: 'Motor do processador',
    dica: 'JIT64 é o rápido; o interpretador é só pra testar.',
    grupo: 'emulacao',
    valores: [v('1', 'JIT64 (rápido)'), v('0', 'Interpretador (lento)'), v('5', 'Interpretador com cache')],
    padrao: '1',
    naHora: false,
    perfis: igual('1'),
    avancada: true,
  },
  {
    chave: 'dolphin_ir_mode',
    nome: 'Ponteiro do Wiimote',
    dica: 'De onde vem a mira do Wii: o mouse sobre a imagem (o jeito do app) ou o analógico direito do controle.',
    grupo: 'controle',
    valores: [v('2', 'Mouse'), v('1', 'Analógico direito (absoluto)'), v('0', 'Analógico direito (relativo)')],
    padrao: '1',
    naHora: false,
    perfis: igual('2'),
  },
  {
    chave: 'dolphin_wiimote_default_device',
    nome: 'Controle do Wii',
    dica: 'O Wiimote com o Nunchuk serve na maioria; alguns jogos pedem o Wiimote de lado ou o Classic (escolha por jogo).',
    grupo: 'controle',
    valores: (OPCOES_DOLPHIN.find((d) => d.chave === 'dolphin_wiimote_default_device')?.valores ?? []).map((x) =>
      v(x.valor, TRADUCAO_DOLPHIN.dolphin_wiimote_default_device?.valores?.[x.valor] ?? x.valor),
    ),
    padrao: 'frontend',
    naHora: false,
    perfis: igual('nunchuk'),
  },
];

const DOLPHIN: OpcaoDeNucleo[] = [
  ...DOLPHIN_CURADO,
  ...OPCOES_DOLPHIN.filter(
    (d) =>
      !FIXAS_PELO_APP[d.chave] &&
      d.valores.length > 1 &&
      !/^dolphin_(log_|debug_|dsu_)/.test(d.chave) &&
      !DOLPHIN_CURADO.some((c) => c.chave === d.chave),
  ).map((d) => opcaoDeclarada(d, TRADUCAO_DOLPHIN[d.chave]?.grupo, TRADUCAO_DOLPHIN)),
];

export const OPCOES_DE_NUCLEO: Partial<Record<SistemaId, OpcaoDeNucleo[]>> = {
  ps2: PS2,
  wii: DOLPHIN,
  gc: DOLPHIN,
  ps1: PS1,
  // núcleos em WebAssembly (opcoes-nucleo-wasm.ts)
  n64: N64,
  snes: SNES,
  gb: GB,
  nes: NES,
  md: GENPLUS,
  sms: GENPLUS,
  gg: GENPLUS,
  gba: GBA,
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
