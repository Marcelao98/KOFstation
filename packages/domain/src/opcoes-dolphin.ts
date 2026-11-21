// GERADO por tools/opcoes-dolphin.mjs a partir do que o Dolphin do libretro declara (dolphin-emu 2609.0.168+0863ee3700).
// Não edite à mão: rode o gerador de novo quando o núcleo mudar. As traduções e os perfis ficam em opcoes-dolphin-pt.ts
// e no catálogo curado (opcoes-nucleo.ts); aqui é o que o núcleo declara, em inglês.
import type { OpcaoDeclarada } from './opcoes-lrps2';

export const OPCOES_DOLPHIN: readonly OpcaoDeclarada[] = [
  {
    chave: 'dolphin_alt_gc_ports_on_wii',
    descricao: 'System Configuration > Alt GC Ports (Wii)',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Alt GC Ports (Wii)).',
    categoria: 'system',
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
    chave: 'dolphin_anti_aliasing',
    descricao: 'Graphics > Settings > Anti-Aliasing',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Anti-Aliasing).',
    categoria: 'video',
    valores: [
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_aspect_ratio',
    descricao: 'Graphics > Settings > Aspect Ratio',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Aspect Ratio).',
    categoria: 'video',
    valores: [
      {
        valor: '3',
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
    ],
    padrao: '3',
  },
  {
    chave: 'dolphin_bbox_enabled',
    descricao: 'Graphics > Hacks > Bounding Box',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Bounding Box).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_bluetooth_passthrough',
    descricao: 'System Configuration > Bluetooth passthrough mode',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Bluetooth passthrough mode).',
    categoria: 'system',
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
    chave: 'dolphin_cache_custom_textures',
    descricao: 'Graphics > Enhancements > Prefetch Custom Textures',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Prefetch Custom Textures).',
    categoria: 'video',
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
    chave: 'dolphin_call_back_audio_method',
    descricao: 'Audio / DSP > Async Audio Callback',
    info: 'Opção do Dolphin sem tradução ainda (Audio / DSP > Async Audio Callback).',
    categoria: 'audio',
    valores: [
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_cheats_enabled',
    descricao: 'Core > Internal Cheats',
    info: 'Opção do Dolphin sem tradução ainda (Core > Internal Cheats).',
    categoria: 'emulation',
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
    chave: 'dolphin_cheats_import',
    descricao: 'RetroArch Core > Automatically Import Cheats into RetroArch',
    info: 'Opção do Dolphin sem tradução ainda (RetroArch Core > Automatically Import Cheats into RetroArch).',
    categoria: 'system',
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
    chave: 'dolphin_cpu_clock_rate',
    descricao: 'Core > CPU Clock Rate',
    info: 'Opção do Dolphin sem tradução ainda (Core > CPU Clock Rate).',
    categoria: 'emulation',
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
        valor: '0.20',
        rotulo: null,
      },
      {
        valor: '0.30',
        rotulo: null,
      },
      {
        valor: '0.40',
        rotulo: null,
      },
      {
        valor: '0.50',
        rotulo: null,
      },
      {
        valor: '0.60',
        rotulo: null,
      },
      {
        valor: '0.70',
        rotulo: null,
      },
      {
        valor: '0.80',
        rotulo: null,
      },
      {
        valor: '0.90',
        rotulo: null,
      },
      {
        valor: '1.50',
        rotulo: null,
      },
      {
        valor: '2.00',
        rotulo: null,
      },
      {
        valor: '2.50',
        rotulo: null,
      },
      {
        valor: '3.00',
        rotulo: null,
      },
    ],
    padrao: '1.00',
  },
  {
    chave: 'dolphin_cpu_core',
    descricao: 'Core > CPU Core',
    info: 'Opção do Dolphin sem tradução ainda (Core > CPU Core).',
    categoria: 'emulation',
    valores: [
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_crop_overscan',
    descricao: 'Graphics > Settings > Crop Overscan',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Crop Overscan).',
    categoria: 'video',
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
    chave: 'dolphin_debug_mode_enabled',
    descricao: 'Interface > Enable debugging',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Enable debugging).',
    categoria: 'system',
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
    chave: 'dolphin_default_mouse_bindings_enabled',
    descricao: 'RetroArch core > Enable Default Mouse Bindings',
    info: 'Opção do Dolphin sem tradução ainda (RetroArch core > Enable Default Mouse Bindings).',
    categoria: 'system',
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
    chave: 'dolphin_defer_efb_copies',
    descricao: 'Graphics > Hacks > Defer EFB Copies',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Defer EFB Copies).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_disable_copy_filter',
    descricao: 'Graphics > Enhancements > Disable Copy Filter',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Disable Copy Filter).',
    categoria: 'video',
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
    chave: 'dolphin_disable_fog',
    descricao: 'Graphics > Settings > Disable Fog',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Disable Fog).',
    categoria: 'video',
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
    chave: 'dolphin_disc_based_games_boot_to_wii_menu',
    descricao: 'Core > Disc Based Games Boot to Wii Menu',
    info: 'Opção do Dolphin sem tradução ainda (Core > Disc Based Games Boot to Wii Menu).',
    categoria: 'emulation',
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
    chave: 'dolphin_dsp_hle',
    descricao: 'Audio / DSP > DSP HLE',
    info: 'Opção do Dolphin sem tradução ainda (Audio / DSP > DSP HLE).',
    categoria: 'audio',
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
    chave: 'dolphin_dsp_jit',
    descricao: 'Audio / DSP > DSP JIT',
    info: 'Opção do Dolphin sem tradução ainda (Audio / DSP > DSP JIT).',
    categoria: 'audio',
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
    chave: 'dolphin_dsu_enabled',
    descricao: 'Wiimote (DSU) > Enable DSU Client',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Enable DSU Client).',
    categoria: 'input',
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
    chave: 'dolphin_dsu_ip_octet1',
    descricao: 'Wiimote (DSU) > Server IP Octet 1',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Server IP Octet 1).',
    categoria: 'input',
    valores: [
      {
        valor: '127',
        rotulo: null,
      },
      {
        valor: '192',
        rotulo: null,
      },
    ],
    padrao: '127',
  },
  {
    chave: 'dolphin_dsu_ip_octet2',
    descricao: 'Wiimote (DSU) > Server IP Octet 2',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Server IP Octet 2).',
    categoria: 'input',
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '168',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_dsu_ip_octet3',
    descricao: 'Wiimote (DSU) > Server IP Octet 3',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Server IP Octet 3).',
    categoria: 'input',
    valores: [
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
      {
        valor: '101',
        rotulo: null,
      },
      {
        valor: '102',
        rotulo: null,
      },
      {
        valor: '103',
        rotulo: null,
      },
      {
        valor: '104',
        rotulo: null,
      },
      {
        valor: '105',
        rotulo: null,
      },
      {
        valor: '106',
        rotulo: null,
      },
      {
        valor: '107',
        rotulo: null,
      },
      {
        valor: '108',
        rotulo: null,
      },
      {
        valor: '109',
        rotulo: null,
      },
      {
        valor: '110',
        rotulo: null,
      },
      {
        valor: '111',
        rotulo: null,
      },
      {
        valor: '112',
        rotulo: null,
      },
      {
        valor: '113',
        rotulo: null,
      },
      {
        valor: '114',
        rotulo: null,
      },
      {
        valor: '115',
        rotulo: null,
      },
      {
        valor: '116',
        rotulo: null,
      },
      {
        valor: '117',
        rotulo: null,
      },
      {
        valor: '118',
        rotulo: null,
      },
      {
        valor: '119',
        rotulo: null,
      },
      {
        valor: '120',
        rotulo: null,
      },
      {
        valor: '121',
        rotulo: null,
      },
      {
        valor: '122',
        rotulo: null,
      },
      {
        valor: '123',
        rotulo: null,
      },
      {
        valor: '124',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_dsu_ip_octet4',
    descricao: 'Wiimote (DSU) > Server IP Octet 4',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Server IP Octet 4).',
    categoria: 'input',
    valores: [
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '0',
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
      {
        valor: '101',
        rotulo: null,
      },
      {
        valor: '102',
        rotulo: null,
      },
      {
        valor: '103',
        rotulo: null,
      },
      {
        valor: '104',
        rotulo: null,
      },
      {
        valor: '105',
        rotulo: null,
      },
      {
        valor: '106',
        rotulo: null,
      },
      {
        valor: '107',
        rotulo: null,
      },
      {
        valor: '108',
        rotulo: null,
      },
      {
        valor: '109',
        rotulo: null,
      },
      {
        valor: '110',
        rotulo: null,
      },
      {
        valor: '111',
        rotulo: null,
      },
      {
        valor: '112',
        rotulo: null,
      },
      {
        valor: '113',
        rotulo: null,
      },
      {
        valor: '114',
        rotulo: null,
      },
      {
        valor: '115',
        rotulo: null,
      },
      {
        valor: '116',
        rotulo: null,
      },
      {
        valor: '117',
        rotulo: null,
      },
      {
        valor: '118',
        rotulo: null,
      },
      {
        valor: '119',
        rotulo: null,
      },
      {
        valor: '120',
        rotulo: null,
      },
      {
        valor: '121',
        rotulo: null,
      },
      {
        valor: '122',
        rotulo: null,
      },
      {
        valor: '123',
        rotulo: null,
      },
      {
        valor: '124',
        rotulo: null,
      },
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_dsu_port',
    descricao: 'Wiimote (DSU) > Server Port',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote (DSU) > Server Port).',
    categoria: 'input',
    valores: [
      {
        valor: '26760',
        rotulo: null,
      },
      {
        valor: '26761',
        rotulo: null,
      },
      {
        valor: '26762',
        rotulo: null,
      },
      {
        valor: '26763',
        rotulo: null,
      },
      {
        valor: '26764',
        rotulo: null,
      },
      {
        valor: '26765',
        rotulo: null,
      },
    ],
    padrao: '26760',
  },
  {
    chave: 'dolphin_early_presentation',
    descricao: 'Core > Smooth Early Presentation',
    info: 'Opção do Dolphin sem tradução ainda (Core > Smooth Early Presentation).',
    categoria: 'emulation',
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
    chave: 'dolphin_early_xfb_output',
    descricao: 'Graphics > Hacks > Early XFB Output',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Early XFB Output).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_access_defer_invalidation',
    descricao: 'Graphics > Hacks > EFB Access Defer Invalidation',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > EFB Access Defer Invalidation).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_access_enable',
    descricao: 'Graphics > Hacks > EFB Access from CPU',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > EFB Access from CPU).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_access_tile_size',
    descricao: 'Graphics > Hacks > EFB Access Tile Size',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > EFB Access Tile Size).',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: '64',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '4',
        rotulo: null,
      },
      {
        valor: '8',
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
    ],
    padrao: '64',
  },
  {
    chave: 'dolphin_efb_emulate_format_changes',
    descricao: 'Graphics > Hacks > EFB Emulate Format Changes',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > EFB Emulate Format Changes).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_scale',
    descricao: 'Graphics > Settings > Internal Resolution',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Internal Resolution).',
    categoria: 'video',
    valores: [
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
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_efb_scaled_copy',
    descricao: 'Graphics > Hacks > EFB Scaled Copy',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > EFB Scaled Copy).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_to_texture',
    descricao: 'Graphics > Hacks > Skip EFB Copy to RAM',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Skip EFB Copy to RAM).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_efb_to_vram',
    descricao: 'Graphics > Hacks > Disable EFB to VRAM',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Disable EFB to VRAM).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_emulation_speed',
    descricao: 'Core > Emulation Speed',
    info: 'Opção do Dolphin sem tradução ainda (Core > Emulation Speed).',
    categoria: 'emulation',
    valores: [
      {
        valor: '0.0',
        rotulo: null,
      },
      {
        valor: '1.0',
        rotulo: null,
      },
    ],
    padrao: '0.0',
  },
  {
    chave: 'dolphin_enable_gamecube_mic',
    descricao: 'System Configuration (GC) > GameCube Microphone',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration (GC) > GameCube Microphone).',
    categoria: 'system',
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
    chave: 'dolphin_enable_rumble',
    descricao: 'System Configuration > Controller Rumble',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Controller Rumble).',
    categoria: 'system',
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
    chave: 'dolphin_enhance_hdr_output',
    descricao: 'Graphics > Enhancements > HDR Output',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > HDR Output).',
    categoria: 'video',
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
    chave: 'dolphin_enhance_output_resampling',
    descricao: 'Graphics > Enhancements > Output Resampling',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Output Resampling).',
    categoria: 'video',
    valores: [
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_fast_depth_calculation',
    descricao: 'Graphics > Settings > Fast Depth Calculation',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Fast Depth Calculation).',
    categoria: 'video',
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
    chave: 'dolphin_fast_disc_speed',
    descricao: 'Core > Speed Up Disc Transfer',
    info: 'Opção do Dolphin sem tradução ainda (Core > Speed Up Disc Transfer).',
    categoria: 'emulation',
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
    chave: 'dolphin_fast_texture_sampling',
    descricao: 'Graphics > Hacks > Fast Texture Sampling',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Fast Texture Sampling).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_fastmem',
    descricao: 'Core > Fastmem',
    info: 'Opção do Dolphin sem tradução ainda (Core > Fastmem).',
    categoria: 'emulation',
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
    chave: 'dolphin_fastmem_arena',
    descricao: 'Core > Fastmem Arena',
    info: 'Opção do Dolphin sem tradução ainda (Core > Fastmem Arena).',
    categoria: 'emulation',
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
    chave: 'dolphin_force_progressive',
    descricao: 'Graphics > Hacks > Force Progressive',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Force Progressive).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_force_texture_filtering_mode',
    descricao: 'Graphics > Enhancements > Texture Filtering',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Texture Filtering).',
    categoria: 'video',
    valores: [
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_force_true_color',
    descricao: 'Graphics > Enhancements > Force True Color',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Force True Color).',
    categoria: 'video',
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
    chave: 'dolphin_gc_sp1',
    descricao: 'System Configuration (GC) > SP1 Device',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration (GC) > SP1 Device).',
    categoria: 'system',
    valores: [
      {
        valor: '255',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '5',
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
        valor: '14',
        rotulo: null,
      },
      {
        valor: '13',
        rotulo: null,
      },
      {
        valor: '6',
        rotulo: null,
      },
    ],
    padrao: '255',
  },
  {
    chave: 'dolphin_gpu_texture_decoding',
    descricao: 'Graphics > Settings > GPU Texture Decoding',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > GPU Texture Decoding).',
    categoria: 'video',
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
    chave: 'dolphin_hotkey_activate_microphone',
    descricao: 'System Configuration (GC) > Microphone Button',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration (GC) > Microphone Button).',
    categoria: 'system',
    valores: [
      {
        valor: 'Disabled',
        rotulo: null,
      },
      {
        valor: 'L3',
        rotulo: null,
      },
      {
        valor: 'R3',
        rotulo: null,
      },
      {
        valor: 'L1',
        rotulo: null,
      },
      {
        valor: 'R1',
        rotulo: null,
      },
      {
        valor: 'L2',
        rotulo: null,
      },
      {
        valor: 'R2',
        rotulo: null,
      },
      {
        valor: 'A',
        rotulo: null,
      },
      {
        valor: 'B',
        rotulo: null,
      },
      {
        valor: 'X',
        rotulo: null,
      },
      {
        valor: 'Y',
        rotulo: null,
      },
      {
        valor: 'Start',
        rotulo: null,
      },
      {
        valor: 'Select',
        rotulo: null,
      },
    ],
    padrao: 'Disabled',
  },
  {
    chave: 'dolphin_hotkey_sideways_toggle',
    descricao: 'WiiMote Sideways > Toggle Button',
    info: 'Opção do Dolphin sem tradução ainda (WiiMote Sideways > Toggle Button).',
    categoria: 'input',
    valores: [
      {
        valor: 'L3',
        rotulo: null,
      },
      {
        valor: 'Disabled',
        rotulo: null,
      },
      {
        valor: 'R3',
        rotulo: null,
      },
      {
        valor: 'L1',
        rotulo: null,
      },
      {
        valor: 'R1',
        rotulo: null,
      },
      {
        valor: 'L2',
        rotulo: null,
      },
      {
        valor: 'R2',
        rotulo: null,
      },
      {
        valor: 'A',
        rotulo: null,
      },
      {
        valor: 'B',
        rotulo: null,
      },
      {
        valor: 'X',
        rotulo: null,
      },
      {
        valor: 'Y',
        rotulo: null,
      },
      {
        valor: 'Start',
        rotulo: null,
      },
      {
        valor: 'Select',
        rotulo: null,
      },
    ],
    padrao: 'L3',
  },
  {
    chave: 'dolphin_hotkey_upright_toggle',
    descricao: 'WiiMote Upright > Toggle Button',
    info: 'Opção do Dolphin sem tradução ainda (WiiMote Upright > Toggle Button).',
    categoria: 'input',
    valores: [
      {
        valor: 'Disabled',
        rotulo: null,
      },
      {
        valor: 'L3',
        rotulo: null,
      },
      {
        valor: 'R3',
        rotulo: null,
      },
      {
        valor: 'L1',
        rotulo: null,
      },
      {
        valor: 'R1',
        rotulo: null,
      },
      {
        valor: 'L2',
        rotulo: null,
      },
      {
        valor: 'R2',
        rotulo: null,
      },
      {
        valor: 'A',
        rotulo: null,
      },
      {
        valor: 'B',
        rotulo: null,
      },
      {
        valor: 'X',
        rotulo: null,
      },
      {
        valor: 'Y',
        rotulo: null,
      },
      {
        valor: 'Start',
        rotulo: null,
      },
      {
        valor: 'Select',
        rotulo: null,
      },
    ],
    padrao: 'Disabled',
  },
  {
    chave: 'dolphin_immediate_xfb',
    descricao: 'Graphics > Hacks > Immediate XFB',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Immediate XFB).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_ir_deadzone',
    descricao: 'Wiimote IR > Wiimote IR Deadzone',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Deadzone).',
    categoria: 'input',
    valores: [
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_ir_mode',
    descricao: 'Wiimote IR > Wiimote IR Mode',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Mode).',
    categoria: 'input',
    valores: [
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_ir_modifier',
    descricao: 'WiiMote IR > Modifier Button',
    info: 'Opção do Dolphin sem tradução ainda (WiiMote IR > Modifier Button).',
    categoria: 'input',
    valores: [
      {
        valor: 'None',
        rotulo: null,
      },
      {
        valor: 'L3',
        rotulo: null,
      },
      {
        valor: 'R3',
        rotulo: null,
      },
      {
        valor: 'L1',
        rotulo: null,
      },
      {
        valor: 'R1',
        rotulo: null,
      },
      {
        valor: 'L2',
        rotulo: null,
      },
      {
        valor: 'R2',
        rotulo: null,
      },
      {
        valor: 'A',
        rotulo: null,
      },
      {
        valor: 'B',
        rotulo: null,
      },
      {
        valor: 'X',
        rotulo: null,
      },
      {
        valor: 'Y',
        rotulo: null,
      },
      {
        valor: 'Start',
        rotulo: null,
      },
      {
        valor: 'Select',
        rotulo: null,
      },
    ],
    padrao: 'None',
  },
  {
    chave: 'dolphin_ir_offset',
    descricao: 'Wiimote IR > Wiimote IR Vertical Offset',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Vertical Offset).',
    categoria: 'input',
    valores: [
      {
        valor: '0',
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
        valor: '-50',
        rotulo: null,
      },
      {
        valor: '-49',
        rotulo: null,
      },
      {
        valor: '-48',
        rotulo: null,
      },
      {
        valor: '-47',
        rotulo: null,
      },
      {
        valor: '-46',
        rotulo: null,
      },
      {
        valor: '-45',
        rotulo: null,
      },
      {
        valor: '-44',
        rotulo: null,
      },
      {
        valor: '-43',
        rotulo: null,
      },
      {
        valor: '-42',
        rotulo: null,
      },
      {
        valor: '-41',
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_ir_passthrough',
    descricao: 'Wiimote IR > Wiimote IR Passthrough',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Passthrough).',
    categoria: 'input',
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
    chave: 'dolphin_ir_pitch',
    descricao: 'Wiimote IR > Wiimote IR Total Pitch',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Total Pitch).',
    categoria: 'input',
    valores: [
      {
        valor: '25',
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
    ],
    padrao: '25',
  },
  {
    chave: 'dolphin_ir_yaw',
    descricao: 'Wiimote IR > Wiimote IR Total Yaw',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote IR > Wiimote IR Total Yaw).',
    categoria: 'input',
    valores: [
      {
        valor: '25',
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
    ],
    padrao: '25',
  },
  {
    chave: 'dolphin_language',
    descricao: 'Core > System Language',
    info: 'Opção do Dolphin sem tradução ainda (Core > System Language).',
    categoria: 'emulation',
    valores: [
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '0',
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
    ],
    padrao: '1',
  },
  {
    chave: 'dolphin_libretro_vfs_enabled',
    descricao: 'RetroArch core > Enable Virtual File System (VFS)',
    info: 'Opção do Dolphin sem tradução ainda (RetroArch core > Enable Virtual File System (VFS)).',
    categoria: 'system',
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
    chave: 'dolphin_load_custom_textures',
    descricao: 'Graphics > Enhancements > Load Custom Textures',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Load Custom Textures).',
    categoria: 'video',
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
    chave: 'dolphin_log_boot_enabled',
    descricao: 'Interface > Logging > Boot',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Boot).',
    categoria: 'system',
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
    chave: 'dolphin_log_common_enabled',
    descricao: 'Interface > Logging > Common',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Common).',
    categoria: 'system',
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
    chave: 'dolphin_log_core_enabled',
    descricao: 'Interface > Logging > Core',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Core).',
    categoria: 'system',
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
    chave: 'dolphin_log_dsp_mail_enabled',
    descricao: 'Interface > Logging > DSP MAIL',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > DSP MAIL).',
    categoria: 'system',
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
    chave: 'dolphin_log_dsphle_enabled',
    descricao: 'Interface > Logging > DSP HLE',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > DSP HLE).',
    categoria: 'system',
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
    chave: 'dolphin_log_dspinterface_enabled',
    descricao: 'Interface > Logging > DSP Interface',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > DSP Interface).',
    categoria: 'system',
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
    chave: 'dolphin_log_dsplle_enabled',
    descricao: 'Interface > Logging > DSP LLE',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > DSP LLE).',
    categoria: 'system',
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
    chave: 'dolphin_log_host_gpu_enabled',
    descricao: 'Interface > Logging > Host GPU',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Host GPU).',
    categoria: 'system',
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
    chave: 'dolphin_log_level',
    descricao: 'Interface > Log Level',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Log Level).',
    categoria: 'system',
    valores: [
      {
        valor: '4',
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
    ],
    padrao: '4',
  },
  {
    chave: 'dolphin_log_memmap_enabled',
    descricao: 'Interface > Logging > MemMap',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > MemMap).',
    categoria: 'system',
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
    chave: 'dolphin_log_popups_enabled',
    descricao: 'Interface > Logging > Popups',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Popups).',
    categoria: 'system',
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
    chave: 'dolphin_log_video_enabled',
    descricao: 'Interface > Logging > Video',
    info: 'Opção do Dolphin sem tradução ainda (Interface > Logging > Video).',
    categoria: 'system',
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
    chave: 'dolphin_main_accurate_cpu_cache',
    descricao: 'Core > Accurate CPU cache',
    info: 'Opção do Dolphin sem tradução ainda (Core > Accurate CPU cache).',
    categoria: 'emulation',
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
    chave: 'dolphin_main_cpu_thread',
    descricao: 'Core > Dual Core Mode',
    info: 'Opção do Dolphin sem tradução ainda (Core > Dual Core Mode).',
    categoria: 'emulation',
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
    chave: 'dolphin_main_load_game_into_memory',
    descricao: 'Core > Load Whole Game Into Memory',
    info: 'Opção do Dolphin sem tradução ainda (Core > Load Whole Game Into Memory).',
    categoria: 'emulation',
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
    chave: 'dolphin_main_mmu',
    descricao: 'Core > Enable MMU',
    info: 'Opção do Dolphin sem tradução ainda (Core > Enable MMU).',
    categoria: 'emulation',
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
    chave: 'dolphin_max_anisotropy',
    descricao: 'Graphics > Enhancements > Anisotropic Filtering',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Anisotropic Filtering).',
    categoria: 'video',
    valores: [
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
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_mipmap_detection',
    descricao: 'Graphics > Enhancements > Arbitrary Mipmap Detection',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Enhancements > Arbitrary Mipmap Detection).',
    categoria: 'video',
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
    chave: 'dolphin_mods_enabled',
    descricao: 'Graphics > Settings > Enable Mods',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Enable Mods).',
    categoria: 'video',
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
    chave: 'dolphin_osd_enabled',
    descricao: 'Interface > On-Screen Display',
    info: 'Opção do Dolphin sem tradução ainda (Interface > On-Screen Display).',
    categoria: 'system',
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
    chave: 'dolphin_pal60',
    descricao: 'System Configuration > PAL60 Mode',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > PAL60 Mode).',
    categoria: 'system',
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
    chave: 'dolphin_per_queries_enable',
    descricao: 'Graphics > Game Specific > Performance Queries',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Game Specific > Performance Queries).',
    categoria: 'video',
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
    chave: 'dolphin_pixel_lighting',
    descricao: 'Graphics > Settings > Pixel Lighting',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Pixel Lighting).',
    categoria: 'video',
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
    chave: 'dolphin_precision_frame_timing',
    descricao: 'Core > Precision Frame Timing',
    info: 'Opção do Dolphin sem tradução ainda (Core > Precision Frame Timing).',
    categoria: 'emulation',
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
    chave: 'dolphin_progressive_scan',
    descricao: 'System Configuration > Progressive Scan',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Progressive Scan).',
    categoria: 'system',
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
    chave: 'dolphin_renderer',
    descricao: 'Graphics > Settings > Graphics Backend',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Graphics Backend).',
    categoria: 'video',
    valores: [
      {
        valor: 'Hardware',
        rotulo: null,
      },
    ],
    padrao: 'Hardware',
  },
  {
    chave: 'dolphin_rush_presentation',
    descricao: 'Core > Rush Frame Presentation',
    info: 'Opção do Dolphin sem tradução ainda (Core > Rush Frame Presentation).',
    categoria: 'emulation',
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
    chave: 'dolphin_save_load_settings',
    descricao: 'RetroArch core > Load & Prevent Save Settings',
    info: 'Opção do Dolphin sem tradução ainda (RetroArch core > Load & Prevent Save Settings).',
    categoria: 'system',
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
    chave: 'dolphin_sensor_bar_position',
    descricao: 'System Configuration > Sensor Bar Position',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Sensor Bar Position).',
    categoria: 'system',
    valores: [
      {
        valor: '0',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_shader_compilation_mode',
    descricao: 'Graphics > Settings > Shader Compilation',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Shader Compilation).',
    categoria: 'video',
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
        valor: '1',
        rotulo: null,
      },
      {
        valor: '2',
        rotulo: null,
      },
    ],
    padrao: '0',
  },
  {
    chave: 'dolphin_skip_dupe_frames',
    descricao: 'Graphics > Hacks > Skip Duplicate Frames',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Skip Duplicate Frames).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_skip_gc_bios',
    descricao: 'Core > Skip GameCube BIOS',
    info: 'Opção do Dolphin sem tradução ainda (Core > Skip GameCube BIOS).',
    categoria: 'emulation',
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
    chave: 'dolphin_swing_angle',
    descricao: 'Wiimote Swing > Angle',
    info: 'Opção do Dolphin sem tradução ainda (Wiimote Swing > Angle).',
    categoria: 'input',
    valores: [
      {
        valor: '90',
        rotulo: null,
      },
      {
        valor: '1',
        rotulo: null,
      },
      {
        valor: '5',
        rotulo: null,
      },
      {
        valor: '10',
        rotulo: null,
      },
      {
        valor: '15',
        rotulo: null,
      },
      {
        valor: '20',
        rotulo: null,
      },
      {
        valor: '25',
        rotulo: null,
      },
      {
        valor: '30',
        rotulo: null,
      },
      {
        valor: '35',
        rotulo: null,
      },
      {
        valor: '40',
        rotulo: null,
      },
      {
        valor: '45',
        rotulo: null,
      },
      {
        valor: '50',
        rotulo: null,
      },
      {
        valor: '55',
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
      {
        valor: '85',
        rotulo: null,
      },
      {
        valor: '100',
        rotulo: null,
      },
      {
        valor: '110',
        rotulo: null,
      },
      {
        valor: '120',
        rotulo: null,
      },
      {
        valor: '130',
        rotulo: null,
      },
      {
        valor: '140',
        rotulo: null,
      },
      {
        valor: '150',
        rotulo: null,
      },
      {
        valor: '160',
        rotulo: null,
      },
      {
        valor: '170',
        rotulo: null,
      },
      {
        valor: '180',
        rotulo: null,
      },
    ],
    padrao: '90',
  },
  {
    chave: 'dolphin_swing_modifier',
    descricao: 'WiiMote Swing > Modifier Button',
    info: 'Opção do Dolphin sem tradução ainda (WiiMote Swing > Modifier Button).',
    categoria: 'input',
    valores: [
      {
        valor: 'Disabled',
        rotulo: null,
      },
      {
        valor: 'None',
        rotulo: null,
      },
      {
        valor: 'L3',
        rotulo: null,
      },
      {
        valor: 'R3',
        rotulo: null,
      },
      {
        valor: 'L1',
        rotulo: null,
      },
      {
        valor: 'R1',
        rotulo: null,
      },
      {
        valor: 'L2',
        rotulo: null,
      },
      {
        valor: 'R2',
        rotulo: null,
      },
      {
        valor: 'A',
        rotulo: null,
      },
      {
        valor: 'B',
        rotulo: null,
      },
      {
        valor: 'X',
        rotulo: null,
      },
      {
        valor: 'Y',
        rotulo: null,
      },
      {
        valor: 'Start',
        rotulo: null,
      },
      {
        valor: 'Select',
        rotulo: null,
      },
    ],
    padrao: 'Disabled',
  },
  {
    chave: 'dolphin_sync_gpu',
    descricao: 'Core > Synchronize GPU Thread',
    info: 'Opção do Dolphin sem tradução ainda (Core > Synchronize GPU Thread).',
    categoria: 'emulation',
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
    chave: 'dolphin_texture_cache_accuracy',
    descricao: 'Graphics > Settings > Texture Cache Accuracy',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Texture Cache Accuracy).',
    categoria: 'video',
    valores: [
      {
        valor: '128',
        rotulo: null,
      },
      {
        valor: '512',
        rotulo: null,
      },
      {
        valor: '0',
        rotulo: null,
      },
    ],
    padrao: '128',
  },
  {
    chave: 'dolphin_vertex_rounding',
    descricao: 'Graphics > Hacks > Vertex Rounding',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Vertex Rounding).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_vi_skip',
    descricao: 'Graphics > Hacks > VI Skip',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > VI Skip).',
    categoria: 'hw_hacks',
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
    chave: 'dolphin_vr_mode',
    descricao: 'Graphics > Settings > VR Mode',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > VR Mode).',
    categoria: 'video',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'stereo',
        rotulo: null,
      },
      {
        valor: 'immersive',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'dolphin_wait_for_shaders',
    descricao: 'Graphics > Settings > Wait for Shaders',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Wait for Shaders).',
    categoria: 'video',
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
    chave: 'dolphin_widescreen',
    descricao: 'System Configuration > Widescreen (Wii)',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Widescreen (Wii)).',
    categoria: 'system',
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
    chave: 'dolphin_widescreen_hack',
    descricao: 'Graphics > Settings > Widescreen Hack',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Settings > Widescreen Hack).',
    categoria: 'video',
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
    chave: 'dolphin_wii_logi_microphone_enable',
    descricao: 'System Configuration > Logitech USB Microphone',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Logitech USB Microphone).',
    categoria: 'system',
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
    chave: 'dolphin_wiimote_continuous_scanning',
    descricao: 'System Configuration > Wiimote Continuous Scanning',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Wiimote Continuous Scanning).',
    categoria: 'system',
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
    chave: 'dolphin_wiimote_default_device',
    descricao: 'WiiMote > Device',
    info: 'Opção do Dolphin sem tradução ainda (WiiMote > Device).',
    categoria: 'input',
    valores: [
      {
        valor: 'frontend',
        rotulo: null,
      },
      {
        valor: 'upright',
        rotulo: null,
      },
      {
        valor: 'sideways',
        rotulo: null,
      },
      {
        valor: 'nunchuk',
        rotulo: null,
      },
      {
        valor: 'classic',
        rotulo: null,
      },
      {
        valor: 'classic_pro',
        rotulo: null,
      },
      {
        valor: 'motionplus',
        rotulo: null,
      },
      {
        valor: 'motionplus_sideways',
        rotulo: null,
      },
      {
        valor: 'motionplus_nunchuk',
        rotulo: null,
      },
      {
        valor: 'motionplus_classic',
        rotulo: null,
      },
      {
        valor: 'motionplus_classic_pro',
        rotulo: null,
      },
      {
        valor: 'real',
        rotulo: null,
      },
      {
        valor: 'gamecube',
        rotulo: null,
      },
    ],
    padrao: 'frontend',
  },
  {
    chave: 'dolphin_wiispeak_enable',
    descricao: 'System Configuration > Wii Speak',
    info: 'Opção do Dolphin sem tradução ainda (System Configuration > Wii Speak).',
    categoria: 'system',
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
    chave: 'dolphin_wiispeak_muted',
    descricao: 'Audio > Devices > Wii Speak Muted',
    info: 'Opção do Dolphin sem tradução ainda (Audio > Devices > Wii Speak Muted).',
    categoria: 'audio',
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
    chave: 'dolphin_xfb_to_texture_enable',
    descricao: 'Graphics > Hacks > Skip XFB Copy to RAM',
    info: 'Opção do Dolphin sem tradução ainda (Graphics > Hacks > Skip XFB Copy to RAM).',
    categoria: 'hw_hacks',
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
