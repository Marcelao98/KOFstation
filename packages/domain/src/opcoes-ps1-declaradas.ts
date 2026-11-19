// GERADO por tools/opcoes-do-nucleo.mjs a partir do que o núcleo declarou rodando (PCSX-ReARMed c8816799).
// Não edite à mão: rode o teste Rust com KOF_LISTA_OPCOES e o gerador de novo quando o núcleo mudar.
import type { OpcaoDeclarada } from './opcoes-lrps2';

export const OPCOES_PS1_DECLARADAS: readonly OpcaoDeclarada[] = [
  {
    chave: 'pcsx_rearmed_alt_flip',
    descricao: 'Framebuffer readout',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'early',
        rotulo: null,
      },
      {
        valor: 'late',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_analog_axis_modifier',
    descricao: 'Analog Axis Bounds',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'square',
        rotulo: null,
      },
      {
        valor: 'circle',
        rotulo: null,
      },
    ],
    padrao: 'square',
  },
  {
    chave: 'pcsx_rearmed_analog_combo',
    descricao: 'DualShock Analog Mode Toggle Key Combo',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'l1+r1+select',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'l1+r1+start',
        rotulo: null,
      },
      {
        valor: 'l1+r1+l3',
        rotulo: null,
      },
      {
        valor: 'l1+r1+r3',
        rotulo: null,
      },
      {
        valor: 'l3+r3',
        rotulo: null,
      },
    ],
    padrao: 'l1+r1+select',
  },
  {
    chave: 'pcsx_rearmed_bios',
    descricao: 'BIOS Selection',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'HLE',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_cd_readahead',
    descricao: 'CD read-ahead',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '64',
        rotulo: null,
      },
      {
        valor: '128',
        rotulo: null,
      },
      {
        valor: '256',
        rotulo: null,
      },
      {
        valor: '512',
        rotulo: null,
      },
      {
        valor: '1024',
        rotulo: null,
      },
      {
        valor: '333000',
        rotulo: null,
      },
    ],
    padrao: '12',
  },
  {
    chave: 'pcsx_rearmed_cd_turbo',
    descricao: 'Turbo CD',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_crosshair1',
    descricao: 'Player 1 Lightgun Crosshair',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'blue',
        rotulo: null,
      },
      {
        valor: 'green',
        rotulo: null,
      },
      {
        valor: 'red',
        rotulo: null,
      },
      {
        valor: 'white',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_crosshair2',
    descricao: 'Player 2 Lightgun Crosshair',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'blue',
        rotulo: null,
      },
      {
        valor: 'green',
        rotulo: null,
      },
      {
        valor: 'red',
        rotulo: null,
      },
      {
        valor: 'white',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_display_fps_v2',
    descricao: 'Display Internal FPS',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'extra',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_display_info',
    descricao: 'Display Informational Notifications',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_dithering',
    descricao: 'Dithering Pattern',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'force',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_drc',
    descricao: 'Dynamic Recompiler',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_exception_emulation',
    descricao: 'Exception and Breakpoint Emulation',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_fractional_framerate',
    descricao: 'Use fractional frame rate',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_frameskip_interval',
    descricao: 'Frameskip Interval',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
    ],
    padrao: '3',
  },
  {
    chave: 'pcsx_rearmed_frameskip_threshold',
    descricao: 'Frameskip Threshold (%)',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '18',
        rotulo: null,
      },
      {
        valor: '21',
        rotulo: null,
      },
      {
        valor: '24',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '42',
        rotulo: null,
      },
      {
        valor: '45',
        rotulo: null,
      },
      {
        valor: '48',
        rotulo: null,
      },
      {
        valor: '51',
        rotulo: null,
      },
      {
        valor: '54',
        rotulo: null,
      },
      {
        valor: '57',
        rotulo: null,
      },
      {
        valor: '60',
        rotulo: null,
      },
      {
        valor: '65',
        rotulo: null,
      },
      {
        valor: '70',
        rotulo: null,
      },
      {
        valor: '75',
        rotulo: null,
      },
      {
        valor: '80',
        rotulo: null,
      },
    ],
    padrao: '33',
  },
  {
    chave: 'pcsx_rearmed_frameskip_type',
    descricao: 'Frameskip',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'auto_threshold',
        rotulo: null,
      },
      {
        valor: 'fixed_interval',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_gpu_slow_llists',
    descricao: '(GPU) Slow linked list processing',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_gpu_thread_rendering',
    descricao: 'Threaded Rendering',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_gunconadjustratiox',
    descricao: 'Guncon X Axis Response',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '1.00',
        rotulo: null,
      },
      {
        valor: '0.75',
        rotulo: null,
      },
      {
        valor: '0.76',
        rotulo: null,
      },
      {
        valor: '0.77',
        rotulo: null,
      },
      {
        valor: '0.78',
        rotulo: null,
      },
      {
        valor: '0.79',
        rotulo: null,
      },
      {
        valor: '0.80',
        rotulo: null,
      },
      {
        valor: '0.81',
        rotulo: null,
      },
      {
        valor: '0.82',
        rotulo: null,
      },
      {
        valor: '0.83',
        rotulo: null,
      },
      {
        valor: '0.84',
        rotulo: null,
      },
      {
        valor: '0.85',
        rotulo: null,
      },
      {
        valor: '0.86',
        rotulo: null,
      },
      {
        valor: '0.87',
        rotulo: null,
      },
      {
        valor: '0.88',
        rotulo: null,
      },
      {
        valor: '0.89',
        rotulo: null,
      },
      {
        valor: '0.90',
        rotulo: null,
      },
      {
        valor: '0.91',
        rotulo: null,
      },
      {
        valor: '0.92',
        rotulo: null,
      },
      {
        valor: '0.93',
        rotulo: null,
      },
      {
        valor: '0.94',
        rotulo: null,
      },
      {
        valor: '0.95',
        rotulo: null,
      },
      {
        valor: '0.96',
        rotulo: null,
      },
      {
        valor: '0.97',
        rotulo: null,
      },
      {
        valor: '0.98',
        rotulo: null,
      },
      {
        valor: '0.99',
        rotulo: null,
      },
      {
        valor: '1.01',
        rotulo: null,
      },
      {
        valor: '1.02',
        rotulo: null,
      },
      {
        valor: '1.03',
        rotulo: null,
      },
      {
        valor: '1.04',
        rotulo: null,
      },
      {
        valor: '1.05',
        rotulo: null,
      },
      {
        valor: '1.06',
        rotulo: null,
      },
      {
        valor: '1.07',
        rotulo: null,
      },
      {
        valor: '1.08',
        rotulo: null,
      },
      {
        valor: '1.09',
        rotulo: null,
      },
      {
        valor: '1.10',
        rotulo: null,
      },
      {
        valor: '1.11',
        rotulo: null,
      },
      {
        valor: '1.12',
        rotulo: null,
      },
      {
        valor: '1.13',
        rotulo: null,
      },
      {
        valor: '1.14',
        rotulo: null,
      },
      {
        valor: '1.15',
        rotulo: null,
      },
      {
        valor: '1.16',
        rotulo: null,
      },
      {
        valor: '1.17',
        rotulo: null,
      },
      {
        valor: '1.18',
        rotulo: null,
      },
      {
        valor: '1.19',
        rotulo: null,
      },
      {
        valor: '1.20',
        rotulo: null,
      },
      {
        valor: '1.21',
        rotulo: null,
      },
      {
        valor: '1.22',
        rotulo: null,
      },
      {
        valor: '1.23',
        rotulo: null,
      },
      {
        valor: '1.24',
        rotulo: null,
      },
      {
        valor: '1.25',
        rotulo: null,
      },
    ],
    padrao: '1.00',
  },
  {
    chave: 'pcsx_rearmed_gunconadjustratioy',
    descricao: 'Guncon Y Axis Response',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '1.00',
        rotulo: null,
      },
      {
        valor: '0.75',
        rotulo: null,
      },
      {
        valor: '0.76',
        rotulo: null,
      },
      {
        valor: '0.77',
        rotulo: null,
      },
      {
        valor: '0.78',
        rotulo: null,
      },
      {
        valor: '0.79',
        rotulo: null,
      },
      {
        valor: '0.80',
        rotulo: null,
      },
      {
        valor: '0.81',
        rotulo: null,
      },
      {
        valor: '0.82',
        rotulo: null,
      },
      {
        valor: '0.83',
        rotulo: null,
      },
      {
        valor: '0.84',
        rotulo: null,
      },
      {
        valor: '0.85',
        rotulo: null,
      },
      {
        valor: '0.86',
        rotulo: null,
      },
      {
        valor: '0.87',
        rotulo: null,
      },
      {
        valor: '0.88',
        rotulo: null,
      },
      {
        valor: '0.89',
        rotulo: null,
      },
      {
        valor: '0.90',
        rotulo: null,
      },
      {
        valor: '0.91',
        rotulo: null,
      },
      {
        valor: '0.92',
        rotulo: null,
      },
      {
        valor: '0.93',
        rotulo: null,
      },
      {
        valor: '0.94',
        rotulo: null,
      },
      {
        valor: '0.95',
        rotulo: null,
      },
      {
        valor: '0.96',
        rotulo: null,
      },
      {
        valor: '0.97',
        rotulo: null,
      },
      {
        valor: '0.98',
        rotulo: null,
      },
      {
        valor: '0.99',
        rotulo: null,
      },
      {
        valor: '1.01',
        rotulo: null,
      },
      {
        valor: '1.02',
        rotulo: null,
      },
      {
        valor: '1.03',
        rotulo: null,
      },
      {
        valor: '1.04',
        rotulo: null,
      },
      {
        valor: '1.05',
        rotulo: null,
      },
      {
        valor: '1.06',
        rotulo: null,
      },
      {
        valor: '1.07',
        rotulo: null,
      },
      {
        valor: '1.08',
        rotulo: null,
      },
      {
        valor: '1.09',
        rotulo: null,
      },
      {
        valor: '1.10',
        rotulo: null,
      },
      {
        valor: '1.11',
        rotulo: null,
      },
      {
        valor: '1.12',
        rotulo: null,
      },
      {
        valor: '1.13',
        rotulo: null,
      },
      {
        valor: '1.14',
        rotulo: null,
      },
      {
        valor: '1.15',
        rotulo: null,
      },
      {
        valor: '1.16',
        rotulo: null,
      },
      {
        valor: '1.17',
        rotulo: null,
      },
      {
        valor: '1.18',
        rotulo: null,
      },
      {
        valor: '1.19',
        rotulo: null,
      },
      {
        valor: '1.20',
        rotulo: null,
      },
      {
        valor: '1.21',
        rotulo: null,
      },
      {
        valor: '1.22',
        rotulo: null,
      },
      {
        valor: '1.23',
        rotulo: null,
      },
      {
        valor: '1.24',
        rotulo: null,
      },
      {
        valor: '1.25',
        rotulo: null,
      },
    ],
    padrao: '1.00',
  },
  {
    chave: 'pcsx_rearmed_gunconadjustx',
    descricao: 'Guncon X Axis Offset',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-40',
        rotulo: null,
      },
      {
        valor: '-39',
        rotulo: null,
      },
      {
        valor: '-38',
        rotulo: null,
      },
      {
        valor: '-37',
        rotulo: null,
      },
      {
        valor: '-36',
        rotulo: null,
      },
      {
        valor: '-35',
        rotulo: null,
      },
      {
        valor: '-34',
        rotulo: null,
      },
      {
        valor: '-33',
        rotulo: null,
      },
      {
        valor: '-32',
        rotulo: null,
      },
      {
        valor: '-31',
        rotulo: null,
      },
      {
        valor: '-30',
        rotulo: null,
      },
      {
        valor: '-29',
        rotulo: null,
      },
      {
        valor: '-28',
        rotulo: null,
      },
      {
        valor: '-27',
        rotulo: null,
      },
      {
        valor: '-26',
        rotulo: null,
      },
      {
        valor: '-25',
        rotulo: null,
      },
      {
        valor: '-24',
        rotulo: null,
      },
      {
        valor: '-23',
        rotulo: null,
      },
      {
        valor: '-22',
        rotulo: null,
      },
      {
        valor: '-21',
        rotulo: null,
      },
      {
        valor: '-20',
        rotulo: null,
      },
      {
        valor: '-19',
        rotulo: null,
      },
      {
        valor: '-18',
        rotulo: null,
      },
      {
        valor: '-17',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-15',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-13',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-11',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-9',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
      {
        valor: '17',
        rotulo: null,
      },
      {
        valor: '18',
        rotulo: null,
      },
      {
        valor: '19',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '21',
        rotulo: null,
      },
      {
        valor: '22',
        rotulo: null,
      },
      {
        valor: '23',
        rotulo: null,
      },
      {
        valor: '24',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '26',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '28',
        rotulo: null,
      },
      {
        valor: '29',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '31',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '34',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '37',
        rotulo: null,
      },
      {
        valor: '38',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_gunconadjusty',
    descricao: 'Guncon Y Axis Offset',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-40',
        rotulo: null,
      },
      {
        valor: '-39',
        rotulo: null,
      },
      {
        valor: '-38',
        rotulo: null,
      },
      {
        valor: '-37',
        rotulo: null,
      },
      {
        valor: '-36',
        rotulo: null,
      },
      {
        valor: '-35',
        rotulo: null,
      },
      {
        valor: '-34',
        rotulo: null,
      },
      {
        valor: '-33',
        rotulo: null,
      },
      {
        valor: '-32',
        rotulo: null,
      },
      {
        valor: '-31',
        rotulo: null,
      },
      {
        valor: '-30',
        rotulo: null,
      },
      {
        valor: '-29',
        rotulo: null,
      },
      {
        valor: '-28',
        rotulo: null,
      },
      {
        valor: '-27',
        rotulo: null,
      },
      {
        valor: '-26',
        rotulo: null,
      },
      {
        valor: '-25',
        rotulo: null,
      },
      {
        valor: '-24',
        rotulo: null,
      },
      {
        valor: '-23',
        rotulo: null,
      },
      {
        valor: '-22',
        rotulo: null,
      },
      {
        valor: '-21',
        rotulo: null,
      },
      {
        valor: '-20',
        rotulo: null,
      },
      {
        valor: '-19',
        rotulo: null,
      },
      {
        valor: '-18',
        rotulo: null,
      },
      {
        valor: '-17',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-15',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-13',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-11',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-9',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
      {
        valor: '17',
        rotulo: null,
      },
      {
        valor: '18',
        rotulo: null,
      },
      {
        valor: '19',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '21',
        rotulo: null,
      },
      {
        valor: '22',
        rotulo: null,
      },
      {
        valor: '23',
        rotulo: null,
      },
      {
        valor: '24',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '26',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '28',
        rotulo: null,
      },
      {
        valor: '29',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '31',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '34',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '37',
        rotulo: null,
      },
      {
        valor: '38',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_icache_emulation',
    descricao: 'Instruction Cache Emulation',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_input_sensitivity',
    descricao: 'Mouse Sensitivity',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '1.00',
        rotulo: null,
      },
      {
        valor: '0.05',
        rotulo: null,
      },
      {
        valor: '0.10',
        rotulo: null,
      },
      {
        valor: '0.15',
        rotulo: null,
      },
      {
        valor: '0.20',
        rotulo: null,
      },
      {
        valor: '0.25',
        rotulo: null,
      },
      {
        valor: '0.30',
        rotulo: null,
      },
      {
        valor: '0.35',
        rotulo: null,
      },
      {
        valor: '0.40',
        rotulo: null,
      },
      {
        valor: '0.45',
        rotulo: null,
      },
      {
        valor: '0.50',
        rotulo: null,
      },
      {
        valor: '0.55',
        rotulo: null,
      },
      {
        valor: '0.60',
        rotulo: null,
      },
      {
        valor: '0.65',
        rotulo: null,
      },
      {
        valor: '0.70',
        rotulo: null,
      },
      {
        valor: '0.75',
        rotulo: null,
      },
      {
        valor: '0.80',
        rotulo: null,
      },
      {
        valor: '0.85',
        rotulo: null,
      },
      {
        valor: '0.90',
        rotulo: null,
      },
      {
        valor: '0.95',
        rotulo: null,
      },
      {
        valor: '1.05',
        rotulo: null,
      },
      {
        valor: '1.10',
        rotulo: null,
      },
      {
        valor: '1.15',
        rotulo: null,
      },
      {
        valor: '1.20',
        rotulo: null,
      },
      {
        valor: '1.25',
        rotulo: null,
      },
      {
        valor: '1.30',
        rotulo: null,
      },
      {
        valor: '1.35',
        rotulo: null,
      },
      {
        valor: '1.40',
        rotulo: null,
      },
      {
        valor: '1.45',
        rotulo: null,
      },
      {
        valor: '1.50',
        rotulo: null,
      },
      {
        valor: '1.55',
        rotulo: null,
      },
      {
        valor: '1.60',
        rotulo: null,
      },
      {
        valor: '1.65',
        rotulo: null,
      },
      {
        valor: '1.70',
        rotulo: null,
      },
      {
        valor: '1.75',
        rotulo: null,
      },
      {
        valor: '1.80',
        rotulo: null,
      },
      {
        valor: '1.85',
        rotulo: null,
      },
      {
        valor: '1.90',
        rotulo: null,
      },
      {
        valor: '1.95',
        rotulo: null,
      },
      {
        valor: '2.00',
        rotulo: null,
      },
    ],
    padrao: '1.00',
  },
  {
    chave: 'pcsx_rearmed_konamigunadjustx',
    descricao: 'Konami Gun X Axis Offset',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-40',
        rotulo: null,
      },
      {
        valor: '-39',
        rotulo: null,
      },
      {
        valor: '-38',
        rotulo: null,
      },
      {
        valor: '-37',
        rotulo: null,
      },
      {
        valor: '-36',
        rotulo: null,
      },
      {
        valor: '-35',
        rotulo: null,
      },
      {
        valor: '-34',
        rotulo: null,
      },
      {
        valor: '-33',
        rotulo: null,
      },
      {
        valor: '-32',
        rotulo: null,
      },
      {
        valor: '-31',
        rotulo: null,
      },
      {
        valor: '-30',
        rotulo: null,
      },
      {
        valor: '-29',
        rotulo: null,
      },
      {
        valor: '-28',
        rotulo: null,
      },
      {
        valor: '-27',
        rotulo: null,
      },
      {
        valor: '-26',
        rotulo: null,
      },
      {
        valor: '-25',
        rotulo: null,
      },
      {
        valor: '-24',
        rotulo: null,
      },
      {
        valor: '-23',
        rotulo: null,
      },
      {
        valor: '-22',
        rotulo: null,
      },
      {
        valor: '-21',
        rotulo: null,
      },
      {
        valor: '-20',
        rotulo: null,
      },
      {
        valor: '-19',
        rotulo: null,
      },
      {
        valor: '-18',
        rotulo: null,
      },
      {
        valor: '-17',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-15',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-13',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-11',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-9',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
      {
        valor: '17',
        rotulo: null,
      },
      {
        valor: '18',
        rotulo: null,
      },
      {
        valor: '19',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '21',
        rotulo: null,
      },
      {
        valor: '22',
        rotulo: null,
      },
      {
        valor: '23',
        rotulo: null,
      },
      {
        valor: '24',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '26',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '28',
        rotulo: null,
      },
      {
        valor: '29',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '31',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '34',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '37',
        rotulo: null,
      },
      {
        valor: '38',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_konamigunadjusty',
    descricao: 'Konami Gun Y Axis Offset',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-40',
        rotulo: null,
      },
      {
        valor: '-39',
        rotulo: null,
      },
      {
        valor: '-38',
        rotulo: null,
      },
      {
        valor: '-37',
        rotulo: null,
      },
      {
        valor: '-36',
        rotulo: null,
      },
      {
        valor: '-35',
        rotulo: null,
      },
      {
        valor: '-34',
        rotulo: null,
      },
      {
        valor: '-33',
        rotulo: null,
      },
      {
        valor: '-32',
        rotulo: null,
      },
      {
        valor: '-31',
        rotulo: null,
      },
      {
        valor: '-30',
        rotulo: null,
      },
      {
        valor: '-29',
        rotulo: null,
      },
      {
        valor: '-28',
        rotulo: null,
      },
      {
        valor: '-27',
        rotulo: null,
      },
      {
        valor: '-26',
        rotulo: null,
      },
      {
        valor: '-25',
        rotulo: null,
      },
      {
        valor: '-24',
        rotulo: null,
      },
      {
        valor: '-23',
        rotulo: null,
      },
      {
        valor: '-22',
        rotulo: null,
      },
      {
        valor: '-21',
        rotulo: null,
      },
      {
        valor: '-20',
        rotulo: null,
      },
      {
        valor: '-19',
        rotulo: null,
      },
      {
        valor: '-18',
        rotulo: null,
      },
      {
        valor: '-17',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-15',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-13',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-11',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-9',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
      {
        valor: '17',
        rotulo: null,
      },
      {
        valor: '18',
        rotulo: null,
      },
      {
        valor: '19',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '21',
        rotulo: null,
      },
      {
        valor: '22',
        rotulo: null,
      },
      {
        valor: '23',
        rotulo: null,
      },
      {
        valor: '24',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '26',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '28',
        rotulo: null,
      },
      {
        valor: '29',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '31',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '34',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '37',
        rotulo: null,
      },
      {
        valor: '38',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_memcard1',
    descricao: 'Memory Card 1 Type (Restart)',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'libretro',
        rotulo: null,
      },
      {
        valor: 'serial',
        rotulo: null,
      },
      {
        valor: 'shared',
        rotulo: null,
      },
      {
        valor: 'none',
        rotulo: null,
      },
    ],
    padrao: 'libretro',
  },
  {
    chave: 'pcsx_rearmed_memcard2',
    descricao: 'Memory Card 2 Type',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'shared',
        rotulo: null,
      },
      {
        valor: 'serial',
        rotulo: null,
      },
      {
        valor: 'none',
        rotulo: null,
      },
    ],
    padrao: 'shared',
  },
  {
    chave: 'pcsx_rearmed_multitap',
    descricao: 'Multitap Mode',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'port 1',
        rotulo: null,
      },
      {
        valor: 'port 2',
        rotulo: null,
      },
      {
        valor: 'ports 1 and 2',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_negcon_deadzone',
    descricao: 'NegCon Twist Deadzone',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '17',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '23',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '27',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_negcon_response',
    descricao: 'NegCon Twist Response',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'linear',
        rotulo: null,
      },
      {
        valor: 'quadratic',
        rotulo: null,
      },
      {
        valor: 'cubic',
        rotulo: null,
      },
    ],
    padrao: 'linear',
  },
  {
    chave: 'pcsx_rearmed_neon_enhancement_enable',
    descricao: '(GPU) Enhanced Resolution',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_neon_enhancement_no_main',
    descricao: '(GPU) Enhanced Resolution Speed Hack',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_neon_enhancement_tex_adj_v2',
    descricao: '(GPU) Enhanced Resolution Texture Adjustment',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_neon_interlace_enable_v2',
    descricao: '(GPU) Show Interlaced Video',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_nocdaudio',
    descricao: 'CD Audio',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_nostalls',
    descricao: 'Disable CPU/GTE Stalls',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_noxadecoding',
    descricao: 'XA Decoding',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_psxclock',
    descricao: 'PSX CPU Clock Speed (%)',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '31',
        rotulo: null,
      },
      {
        valor: '32',
        rotulo: null,
      },
      {
        valor: '33',
        rotulo: null,
      },
      {
        valor: '34',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '36',
        rotulo: null,
      },
      {
        valor: '37',
        rotulo: null,
      },
      {
        valor: '38',
        rotulo: null,
      },
      {
        valor: '39',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
      {
        valor: '41',
        rotulo: null,
      },
      {
        valor: '42',
        rotulo: null,
      },
      {
        valor: '43',
        rotulo: null,
      },
      {
        valor: '44',
        rotulo: null,
      },
      {
        valor: '45',
        rotulo: null,
      },
      {
        valor: '46',
        rotulo: null,
      },
      {
        valor: '47',
        rotulo: null,
      },
      {
        valor: '48',
        rotulo: null,
      },
      {
        valor: '49',
        rotulo: null,
      },
      {
        valor: '50',
        rotulo: null,
      },
      {
        valor: '51',
        rotulo: null,
      },
      {
        valor: '52',
        rotulo: null,
      },
      {
        valor: '53',
        rotulo: null,
      },
      {
        valor: '54',
        rotulo: null,
      },
      {
        valor: '55',
        rotulo: null,
      },
      {
        valor: '56',
        rotulo: null,
      },
      {
        valor: '57',
        rotulo: null,
      },
      {
        valor: '58',
        rotulo: null,
      },
      {
        valor: '59',
        rotulo: null,
      },
      {
        valor: '60',
        rotulo: null,
      },
      {
        valor: '61',
        rotulo: null,
      },
      {
        valor: '62',
        rotulo: null,
      },
      {
        valor: '63',
        rotulo: null,
      },
      {
        valor: '64',
        rotulo: null,
      },
      {
        valor: '65',
        rotulo: null,
      },
      {
        valor: '66',
        rotulo: null,
      },
      {
        valor: '67',
        rotulo: null,
      },
      {
        valor: '68',
        rotulo: null,
      },
      {
        valor: '69',
        rotulo: null,
      },
      {
        valor: '70',
        rotulo: null,
      },
      {
        valor: '71',
        rotulo: null,
      },
      {
        valor: '72',
        rotulo: null,
      },
      {
        valor: '73',
        rotulo: null,
      },
      {
        valor: '74',
        rotulo: null,
      },
      {
        valor: '75',
        rotulo: null,
      },
      {
        valor: '76',
        rotulo: null,
      },
      {
        valor: '77',
        rotulo: null,
      },
      {
        valor: '78',
        rotulo: null,
      },
      {
        valor: '79',
        rotulo: null,
      },
      {
        valor: '80',
        rotulo: null,
      },
      {
        valor: '81',
        rotulo: null,
      },
      {
        valor: '82',
        rotulo: null,
      },
      {
        valor: '83',
        rotulo: null,
      },
      {
        valor: '84',
        rotulo: null,
      },
      {
        valor: '85',
        rotulo: null,
      },
      {
        valor: '86',
        rotulo: null,
      },
      {
        valor: '87',
        rotulo: null,
      },
      {
        valor: '88',
        rotulo: null,
      },
      {
        valor: '89',
        rotulo: null,
      },
      {
        valor: '90',
        rotulo: null,
      },
      {
        valor: '91',
        rotulo: null,
      },
      {
        valor: '92',
        rotulo: null,
      },
      {
        valor: '93',
        rotulo: null,
      },
      {
        valor: '94',
        rotulo: null,
      },
      {
        valor: '95',
        rotulo: null,
      },
      {
        valor: '96',
        rotulo: null,
      },
      {
        valor: '97',
        rotulo: null,
      },
      {
        valor: '98',
        rotulo: null,
      },
      {
        valor: '99',
        rotulo: null,
      },
      {
        valor: '100',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_region',
    descricao: 'Region',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'NTSC',
        rotulo: null,
      },
      {
        valor: 'PAL',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_rgb32_output',
    descricao: 'RGB32 output',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_scale_hires',
    descricao: 'Hi-Res Downscaling',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_screen_centering',
    descricao: '(GPU) Screen centering',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'game',
        rotulo: null,
      },
      {
        valor: 'borderless',
        rotulo: null,
      },
      {
        valor: 'manual',
        rotulo: null,
      },
    ],
    padrao: 'auto',
  },
  {
    chave: 'pcsx_rearmed_screen_centering_h_adj',
    descricao: '(GPU) Manual height adjustment',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-64',
        rotulo: null,
      },
      {
        valor: '-48',
        rotulo: null,
      },
      {
        valor: '-40',
        rotulo: null,
      },
      {
        valor: '-32',
        rotulo: null,
      },
      {
        valor: '-24',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_screen_centering_x',
    descricao: '(GPU) Manual position X',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_screen_centering_y',
    descricao: '(GPU) Manual position Y',
    info: '',
    categoria: null,
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '-16',
        rotulo: null,
      },
      {
        valor: '-15',
        rotulo: null,
      },
      {
        valor: '-14',
        rotulo: null,
      },
      {
        valor: '-13',
        rotulo: null,
      },
      {
        valor: '-12',
        rotulo: null,
      },
      {
        valor: '-11',
        rotulo: null,
      },
      {
        valor: '-10',
        rotulo: null,
      },
      {
        valor: '-9',
        rotulo: null,
      },
      {
        valor: '-8',
        rotulo: null,
      },
      {
        valor: '-7',
        rotulo: null,
      },
      {
        valor: '-6',
        rotulo: null,
      },
      {
        valor: '-5',
        rotulo: null,
      },
      {
        valor: '-4',
        rotulo: null,
      },
      {
        valor: '-3',
        rotulo: null,
      },
      {
        valor: '-2',
        rotulo: null,
      },
      {
        valor: '-1',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
      {
        valor: '3',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
      {
        valor: '7',
        rotulo: null,
      },
      {
        valor: '8',
        rotulo: null,
      },
      {
        valor: '9',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '11',
        rotulo: null,
      },
      {
        valor: '12',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '14',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '16',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx_rearmed_show_bios_bootlogo',
    descricao: 'Show BIOS Name/Boot Logo',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'enabled_no_pcsx',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_show_overscan',
    descricao: '(GPU) Horizontal overscan',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'auto',
        rotulo: null,
      },
      {
        valor: 'hack',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_spu_interpolation',
    descricao: 'Sound Interpolation',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'simple',
        rotulo: null,
      },
      {
        valor: 'gaussian',
        rotulo: null,
      },
      {
        valor: 'cubic',
        rotulo: null,
      },
      {
        valor: 'off',
        rotulo: null,
      },
    ],
    padrao: 'simple',
  },
  {
    chave: 'pcsx_rearmed_spu_reverb',
    descricao: 'Audio Reverb Effects',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
  {
    chave: 'pcsx_rearmed_spu_thread',
    descricao: 'Threaded SPU',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx_rearmed_vibration',
    descricao: 'Rumble Effects',
    info: '',
    categoria: null,
    valores: [
      {
        valor: 'enabled',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'enabled',
  },
];
