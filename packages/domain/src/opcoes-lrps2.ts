// GERADO por tools/opcoes-lrps2.mjs a partir de libretro/libretro_core_options.h do LRPS2 (commit 38d3a83f).
// Não edite à mão: rode o gerador de novo quando o núcleo mudar. As traduções e os perfis ficam no catálogo curado
// (opcoes-nucleo.ts); aqui é o que o núcleo declara, em inglês, com a categoria dele.

export interface OpcaoDeclarada {
  chave: string;
  /** "Categoria > Nome" como o núcleo escreve (o "(Restart)" diz que só vale ao reabrir) */
  descricao: string;
  info: string;
  /** system | video | emulation | hw_hacks | input (null = sem categoria) */
  categoria: string | null;
  valores: { valor: string; rotulo: string | null }[];
  padrao: string;
}

export const CATEGORIAS_LRPS2: readonly { chave: string; nome: string }[] = [
  {
    chave: 'system',
    nome: 'System',
  },
  {
    chave: 'video',
    nome: 'Video',
  },
  {
    chave: 'emulation',
    nome: 'Emulation',
  },
  {
    chave: 'hw_hacks',
    nome: 'Manual Hardware Renderer Fixes',
  },
  {
    chave: 'input',
    nome: 'Input',
  },
];

export const OPCOES_LRPS2: readonly OpcaoDeclarada[] = [
  {
    chave: 'pcsx2_bios',
    descricao: 'System > BIOS',
    info: '',
    categoria: 'system',
    valores: [],
    padrao: '',
  },
  {
    chave: 'pcsx2_fastboot',
    descricao: 'System > Fast Boot (Restart)',
    info: 'Skips BIOS startup screen and boots straight to the game. Disable this if you want to access the PS2 system settings or access the Memory Card manager.',
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
    chave: 'pcsx2_fastcdvd',
    descricao: 'System > Fast CD/DVD Access (Restart)',
    info: 'Fast CD/DVD access/seek times. A small handful of games will have compatibility problems with this enabled.',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_usb_camera',
    descricao: 'System > USB Camera (Restart)',
    info: "Plugs a camera into a free USB port for EyeToy games. Pictures and sound come from the frontend's camera and microphone; where the frontend has none, on Linux, from the first webcam and its microphone.",
    categoria: 'system',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'eyetoy',
        rotulo: 'Sony EyeToy',
      },
      {
        valor: 'capture_eye',
        rotulo: 'Konami Capture Eye',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_shared_memory_cards',
    descricao: 'System > Shared Memory Cards (Restart)',
    info: 'Use per-content or shared memory cards.',
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
    padrao: 'enabled',
  },
  {
    chave: 'pcsx2_enable_cheats',
    descricao: 'System > Enable Cheats',
    info: "Enable cheat files to be read from the 'cheats' directory in the system folder.",
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_hint_language_unlock',
    descricao: 'System > Language Unlock',
    info: 'If enabled, will look inside the internal database for language unlock options. Examples include: forcing an international Japanese version to English, unlocking more European languages, etc',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_dev9_hdd',
    descricao: 'System > HDD (DEV9)',
    info: "Emulate the SPEED expansion's ATA hard drive. The image lives at 'pcsx2/DEV9hdd.raw' in the frontend system directory and is created on first use at the configured size.",
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
    chave: 'pcsx2_dev9_hdd_size',
    descricao: 'System > HDD Size',
    info: 'Capacity used when a new HDD image is created. An existing image keeps the size it was created with.',
    categoria: 'system',
    valores: [
      {
        valor: '8 GiB',
        rotulo: null,
      },
      {
        valor: '16 GiB',
        rotulo: null,
      },
      {
        valor: '20 GiB',
        rotulo: null,
      },
      {
        valor: '40 GiB',
        rotulo: null,
      },
      {
        valor: '80 GiB',
        rotulo: null,
      },
      {
        valor: '120 GiB',
        rotulo: null,
      },
    ],
    padrao: '40 GiB',
  },
  {
    chave: 'pcsx2_dev9_eth',
    descricao: 'System > Ethernet (DEV9)',
    info: "Emulate the SPEED expansion's ethernet adapter through the Sockets backend: a userspace TCP/UDP stack with an internal DHCP server, needing no host network configuration or privileges.",
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
    chave: 'pcsx2_renderer',
    descricao: 'Video > Renderer',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'Auto',
        rotulo: null,
      },
      {
        valor: 'OpenGL',
        rotulo: null,
      },
      {
        valor: 'D3D11',
        rotulo: null,
      },
      {
        valor: 'D3D12',
        rotulo: null,
      },
      {
        valor: 'Vulkan',
        rotulo: null,
      },
      {
        valor: 'paraLLEl-GS',
        rotulo: null,
      },
      {
        valor: 'Software (HW)',
        rotulo: null,
      },
      {
        valor: 'Software (SW)',
        rotulo: null,
      },
    ],
    padrao: 'Auto',
  },
  {
    chave: 'pcsx2_upscale_multiplier',
    descricao: 'Video > Internal Resolution (Restart)',
    info: "Draw at a multiple of the PS2's resolution. The software renderers draw at 2x for 2x and above.",
    categoria: 'video',
    valores: [
      {
        valor: '1x (Native)',
        rotulo: null,
      },
      {
        valor: '2x',
        rotulo: null,
      },
      {
        valor: '4x',
        rotulo: null,
      },
      {
        valor: '8x',
        rotulo: null,
      },
    ],
    padrao: '1x (Native)',
  },
  {
    chave: 'pcsx2_native_scaling',
    descricao: 'Video > Native Scaling',
    info: "Render the buffers a game draws at a fraction of its frame, such as a bloom or blur pass, at native resolution instead of the internal resolution. Keeps a blur's radius and position as on the console, at the cost of the resolution of the blurred picture; 'Aggressive' also applies to the draws that scale those buffers back up. 'Automatic' uses the game database's setting for the game, or 'Normal' where it has none. Any other value is used regardless of the database and of 'Enable HW Hacks'.",
    categoria: 'video',
    valores: [
      {
        valor: 'Automatic',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Normal',
        rotulo: null,
      },
      {
        valor: 'Aggressive',
        rotulo: null,
      },
    ],
    padrao: 'Automatic',
  },
  {
    chave: 'pcsx2_pgs_ssaa',
    descricao: 'Video > paraLLEl super sampling',
    info: "Apply supersampled anti-aliasing (SSAA). Unlike straight upscaling, supersampling retains a coherent visual look where 3D elements have similar resolution as UI elements. For 2x high-res scanout you need at least '4x SSAA ordered' (or higher); 4x high-res scanout needs '16x SSAA (ordered)' specifically -- the plain 16x mode uses a sparse grid that only supports 2x. '32x SSAA (ordered)' is a 4x8 grid, four samples across and eight down: it also feeds the 4x scanout at the full field height, which gives field-rendered games twice the vertical resolution of 16x ordered, at twice its cost. Setting this to 'Native' disables super sampling.",
    categoria: 'video',
    valores: [
      {
        valor: 'Native',
        rotulo: null,
      },
      {
        valor: '2x SSAA',
        rotulo: null,
      },
      {
        valor: '4x SSAA (sparse grid)',
        rotulo: null,
      },
      {
        valor: '4x SSAA (ordered, can high-res)',
        rotulo: null,
      },
      {
        valor: '8x SSAA (can high-res)',
        rotulo: null,
      },
      {
        valor: '16x SSAA (can high-res)',
        rotulo: null,
      },
      {
        valor: '16x SSAA (ordered, can high-res 4x)',
        rotulo: null,
      },
      {
        valor: '32x SSAA (ordered, can high-res 4x full)',
        rotulo: null,
      },
    ],
    padrao: 'Native',
  },
  {
    chave: 'pcsx2_pgs_high_res_scanout',
    descricao: 'Video > paraLLEl experimental High-res scanout',
    info: "Scans out above native resolution with paraLLEl (2x: 640x448 becomes 1280x896; 4x: 2560x1792). Doesn't work with every game, some might require patches on top. 2x requires Supersampling at 4x SSAA ordered or higher; 4x requires 16x SSAA ordered, and falls back to 2x on lower grids. At 16x SSAA with plain 4x scanout the whole sample grid is spent on resolution, so edges keep no residual anti-aliasing; the anti-aliased 4x mode instead reconstructs each output pixel from the neighboring samples with a tent filter, trading a slight softness for far less texture shimmer. A game that renders one field at a time gets half the height from 4x (2560x896); the full field height mode gives it the whole 2560x1792 and needs 32x SSAA ordered, falling back to the plain 4x on smaller grids. Its anti-aliased variant applies the same tent reconstruction at that height, and falls back to the anti-aliased 4x on smaller grids.",
    categoria: 'video',
    valores: [
      {
        valor: 'enabled',
        rotulo: 'enabled (2x)',
      },
      {
        valor: 'enabled (4x)',
        rotulo: null,
      },
      {
        valor: 'enabled (4x, anti-aliased)',
        rotulo: null,
      },
      {
        valor: 'enabled (4x, full field height)',
        rotulo: null,
      },
      {
        valor: 'enabled (4x, anti-aliased, full field height)',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_pgs_ss_tex',
    descricao: 'Video > paraLLEl experimental SSAA texture',
    info: 'Feedback higher resolution textures. With super sampling on, a copy of the picture (a post-processing pass that moves it texel for pixel) always keeps its super samples; enabling this also feeds them to blurs and other effects that read the picture back. May help high-res scanout image quality. Highly experimental and may cause rendering glitches.',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_pgs_deblur',
    descricao: 'Video > paraLLEl experimental sharp backbuffer',
    info: 'Attempts to workaround games that add extra blit passes before scanning out. May lead to better image quality in certain games which do this.',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_pgs_disable_mipmaps',
    descricao: 'Video > Force Texture LOD0',
    info: 'Disable this for traditional hardware mipmapping. Enabling this will bypass mipmapping and always use texture LOD0 instead. The result is better image quality. Only a small handful of games have graphics rendering issues with this enabled.',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_deinterlace_mode',
    descricao: 'Video > Deinterlacing',
    info: "Select a deinterlacing method. Use 'Automatic' if unsure what to pick.",
    categoria: 'video',
    valores: [
      {
        valor: 'Automatic',
        rotulo: null,
      },
      {
        valor: 'Off',
        rotulo: null,
      },
      {
        valor: 'Weave TFF',
        rotulo: null,
      },
      {
        valor: 'Weave BFF',
        rotulo: null,
      },
      {
        valor: 'Bob TFF',
        rotulo: null,
      },
      {
        valor: 'Bob BFF',
        rotulo: null,
      },
      {
        valor: 'Blend TFF',
        rotulo: null,
      },
      {
        valor: 'Blend BFF',
        rotulo: null,
      },
      {
        valor: 'Adaptive TFF',
        rotulo: null,
      },
      {
        valor: 'Adaptive BFF',
        rotulo: null,
      },
    ],
    padrao: 'Automatic',
  },
  {
    chave: 'pcsx2_hw_download_mode',
    descricao: 'Video > Hardware Download Mode',
    info: "Controls how the GS reads rendered data back to the CPU (e.g. memory-card save images). 'Accurate' is the safest and matches hardware, but forces a CPU/GPU synchronization on every readback, which can sharply reduce the frame rate on screens that read back often (some save/load and stage-select menus) - this is especially severe with the paraLLEl-GS renderer. 'Unsynchronized' avoids that stall and is much faster, at the risk of incorrect results in the rare games that read back GPU-rendered content. 'Disable Readbacks' and 'Disabled' trade more accuracy for speed.",
    categoria: 'video',
    valores: [
      {
        valor: 'Accurate',
        rotulo: null,
      },
      {
        valor: 'Disable Readbacks',
        rotulo: null,
      },
      {
        valor: 'Unsynchronized',
        rotulo: null,
      },
      {
        valor: 'Disabled',
        rotulo: null,
      },
    ],
    padrao: 'Accurate',
  },
  {
    chave: 'pcsx2_nointerlacing_hint',
    descricao: 'Video > No interlacing hint (Restart)',
    info: 'If enabled, will look in the internal database if a patch is available for the game to turn the image into either a non-interlaced, full frame, or progressive scan video signal, and/or a combination of all the above. Image will be more stable and Deinterlacing can be turned off.',
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
    chave: 'pcsx2_texture_filtering',
    descricao: 'Video > Texture Filtering',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'Nearest',
        rotulo: null,
      },
      {
        valor: 'Bilinear (Forced)',
        rotulo: null,
      },
      {
        valor: 'Bilinear (PS2)',
        rotulo: null,
      },
      {
        valor: 'Bilinear (Forced excluding sprite)',
        rotulo: null,
      },
    ],
    padrao: 'Bilinear (PS2)',
  },
  {
    chave: 'pcsx2_trilinear_filtering',
    descricao: 'Video > Trilinear Filtering',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'Automatic',
        rotulo: null,
      },
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Trilinear (PS2)',
        rotulo: null,
      },
      {
        valor: 'Trilinear (Forced)',
        rotulo: null,
      },
    ],
    padrao: 'Automatic',
  },
  {
    chave: 'pcsx2_anisotropic_filtering',
    descricao: 'Video > Anisotropic Filtering',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: '2x',
        rotulo: null,
      },
      {
        valor: '4x',
        rotulo: null,
      },
      {
        valor: '8x',
        rotulo: null,
      },
      {
        valor: '16x',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_dithering',
    descricao: 'Video > Dithering',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Scaled',
        rotulo: null,
      },
      {
        valor: 'Unscaled',
        rotulo: null,
      },
      {
        valor: 'Force 32bit',
        rotulo: null,
      },
    ],
    padrao: 'Unscaled',
  },
  {
    chave: 'pcsx2_blending_accuracy',
    descricao: 'Video > Blending Accuracy',
    info: '',
    categoria: 'video',
    valores: [
      {
        valor: 'Minimum',
        rotulo: null,
      },
      {
        valor: 'Basic',
        rotulo: null,
      },
      {
        valor: 'Medium',
        rotulo: null,
      },
      {
        valor: 'High',
        rotulo: null,
      },
      {
        valor: 'Full',
        rotulo: null,
      },
      {
        valor: 'Maximum',
        rotulo: null,
      },
    ],
    padrao: 'Basic',
  },
  {
    chave: 'pcsx2_widescreen_hint',
    descricao: 'Video > Widescreen hint (Restart)',
    info: 'Applies a widescreen patch if a patch for the game can be found inside the internal database.',
    categoria: 'video',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'enabled (16:9)',
        rotulo: null,
      },
      {
        valor: 'enabled (16:10)',
        rotulo: null,
      },
      {
        valor: 'enabled (21:9)',
        rotulo: null,
      },
      {
        valor: 'enabled (32:9)',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_vr_mode',
    descricao: 'Video > VR',
    info: "Show the game in 3D, from the depth each frame was drawn with. 'Stereoscopic' sends a left and right eye for the frontend's 3D display, or for a screen in a VR headset. Needs a frontend that presents stereo views, and a hardware renderer on Vulkan or OpenGL; otherwise the picture is shown as it is.",
    categoria: 'video',
    valores: [
      {
        valor: 'disabled',
        rotulo: 'Off',
      },
      {
        valor: 'stereoscopic',
        rotulo: 'Stereoscopic',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_vr_depth',
    descricao: 'Video > VR Depth',
    info: 'How deep the 3D picture is. Lower is easier on the eyes; higher pushes the far scenery further back.',
    categoria: 'video',
    valores: [
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
      {
        valor: '75%',
        rotulo: null,
      },
      {
        valor: '100%',
        rotulo: null,
      },
      {
        valor: '125%',
        rotulo: null,
      },
      {
        valor: '150%',
        rotulo: null,
      },
      {
        valor: '200%',
        rotulo: null,
      },
    ],
    padrao: '100%',
  },
  {
    chave: 'pcsx2_pcrtc_antiblur',
    descricao: 'Video > PCRTC Anti-Blur',
    info: 'Disable this for the most accurate output image. Enabling this will attempt to deblur the image. Most noticeable on software renderer and paraLLEl.',
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
    chave: 'pcsx2_pcrtc_screen_offsets',
    descricao: 'Video > PCRTC Screen Offsets',
    info: '',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_disable_interlace_offset',
    descricao: 'Video > Disable Interlace Offset',
    info: '',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_auto_flush_software',
    descricao: 'Video > Auto Flush (Software)',
    info: '',
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
    padrao: 'enabled',
  },
  {
    chave: 'pcsx2_sw_renderer_threads',
    descricao: 'Video > Software Renderer Extra Threads',
    info: 'Number of extra worker threads the software renderer rasterizes with, on top of the GS thread itself. 0 rasterizes on the GS thread alone (lowest latency, best on 2-4 core CPUs). More threads help scenes with many alpha effects on CPUs with spare cores. Only used by the software renderer.',
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
    ],
    padrao: '2',
  },
  {
    chave: 'pcsx2_disable_shader_cache',
    descricao: 'Video > Disable Shader Cache (Restart)',
    info: "Compiles shaders at runtime instead of loading and saving them in system/pcsx2/cache. Slower to start and can stutter while new shaders compile. Rules out a stale or broken cache without deleting the folder by hand. Applies to the OpenGL, Vulkan, D3D11 and D3D12 renderers; paraLLEl-GS and the software renderers keep no shader cache. The GPU driver's own shader cache is not affected.",
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
    chave: 'pcsx2_vu_accurate_addsub',
    descricao: 'Emulation > VU Accurate Add/Sub',
    info: "Model the VU adder's exponent-distance truncation on every add and subtract. The Tri-Ace games that require this behaviour (Star Ocean 3, Radiata Stories, Valkyrie Profile 2) get it automatically per title via the game database even when this is disabled; enable it globally only when chasing accuracy in other titles. Costs speed on VU-heavy games.",
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_ee_accurate_fpu',
    descricao: 'Emulation > EE Accurate FPU Arithmetic',
    info: 'Run EE FPU add, sub, mul and the fused chains through the extended-range double pipeline: exact add/sub against the hardware model, near-exact multiplies, correct handling of the huge values the PS2 allows, exact integer conversion, and pure-bitop ABS/NEG. Measured free at workload level (within run noise on frame throughput); enabled by default.',
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
    chave: 'pcsx2_vu_exact_mul',
    descricao: 'Emulation > VU Exact Multiply',
    info: 'Bit-exact hardware model of the VU multiplier. Real game data trips the full model on most multiplies - zeros, ones and quantized values dominate - so expect a real speed cost on VU-heavy games.',
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
    chave: 'pcsx2_vu_exact_div',
    descricao: 'Emulation > VU Exact Divide',
    info: 'Bit-exact hardware model of the VU divider (DIV, SQRT, RSQRT).',
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
    chave: 'pcsx2_fpu_softfloat',
    descricao: 'Emulation > EE FPU Soft Float (Recompiler)',
    info: 'Route recompiled EE FPU arithmetic through the bit-exact software FPU. Interpreted FPU code is always bit-exact; this extends it to the recompiler at some speed cost. Fixes games whose logic depends on exact console FPU results.',
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
    chave: 'pcsx2_vu0_softfloat',
    descricao: 'Emulation > VU0 Soft Float (Micro Programs)',
    info: 'Run VU0 micro programs on the bit-exact interpreter, whose float ops compute through the console-exact software model, instead of the SSE recompiler. Macro-mode COP2 code is not covered by this option. Costly; enable per game when exact VU0 results matter.',
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
    chave: 'pcsx2_vu1_softfloat',
    descricao: 'Emulation > VU1 Soft Float',
    info: 'Run VU1 on the bit-exact interpreter, whose float ops compute through the console-exact software model, instead of the SSE recompiler. Fixes games whose rendering depends on exact console VU results. Significantly costly and scales with scene complexity; enable per game only when required.',
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
    chave: 'pcsx2_ee_cycle_rate',
    descricao: 'Emulation > EE Cycle Rate',
    info: '',
    categoria: 'emulation',
    valores: [
      {
        valor: '50% (Underclock)',
        rotulo: null,
      },
      {
        valor: '60% (Underclock)',
        rotulo: null,
      },
      {
        valor: '75% (Underclock)',
        rotulo: null,
      },
      {
        valor: '100% (Normal Speed)',
        rotulo: null,
      },
      {
        valor: '130% (Overclock)',
        rotulo: null,
      },
      {
        valor: '180% (Overclock)',
        rotulo: null,
      },
      {
        valor: '300% (Overclock)',
        rotulo: null,
      },
    ],
    padrao: '100% (Normal Speed)',
  },
  {
    chave: 'pcsx2_ee_cpu',
    descricao: 'Emulation > EE CPU Provider (Restart)',
    info: 'Selects what executes Emotion Engine code. Recompiler is the normal choice. Interpreter runs the EE in plain C: far too slow for play, but it takes the EE recompiler out of the picture entirely, so a hang that survives it is not a codegen bug. Selecting Interpreter also disables Fastmem, which only applies to the recompiler.',
    categoria: 'emulation',
    valores: [
      {
        valor: 'Recompiler',
        rotulo: null,
      },
      {
        valor: 'Interpreter',
        rotulo: null,
      },
    ],
    padrao: 'Recompiler',
  },
  {
    chave: 'pcsx2_fastmem',
    descricao: 'Emulation > Fastmem (Restart)',
    info: 'Backs guest memory accesses with a direct 4GB mapping and patches out the ones that fault. Disable to route every access through the software memory handlers - slower, but takes the fastmem fault/backpatch machinery out of the picture entirely, which is useful when hunting a hang.',
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
    chave: 'pcsx2_mtvu',
    descricao: 'Emulation > MTVU (Multi-Threaded VU1) (Restart)',
    info: 'Runs VU1 on its own thread. Large speedup on multi-core CPUs; a small number of games hang with it. The default matches the platform default (on arm64, MTVU is on whenever the native VU1 recompiler drives VU1).',
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
    chave: 'pcsx2_instant_vu1',
    descricao: 'Emulation > Instant VU1 (Restart)',
    info: 'Runs VU1 to completion immediately (ignored while MTVU is enabled). Usually a speedup.',
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
    chave: 'pcsx2_ee_cycle_skip',
    descricao: 'Emulation > EE Cycle Skipping',
    info: '',
    categoria: 'emulation',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Mild Underclock',
        rotulo: null,
      },
      {
        valor: 'Moderate Underclock',
        rotulo: null,
      },
      {
        valor: 'Maximum Underclock',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_game_enhancements_hint',
    descricao: 'Emulation > Game Enhancements hint (Restart)',
    info: 'Applies game-specific enhancements if patches for the game can be found inside the internal database. Examples of enhancements: LOD [Level of Detail] enhancements, better draw distance, ability to skip FMVs, etc.',
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
    chave: 'pcsx2_uncapped_framerate_hint',
    descricao: 'Emulation > Uncapped Framerate hint (Restart)',
    info: 'Uncaps the framerate if a patch for the game can be found inside the internal database. This can turn a 30fps game into 60fps locked, or stabilize the framerate. You might have to increase EE Cycle Rate in combination with this for a stable locked framerate. 60fps PAL-to-NTSC does what it says if it can find a patch, otherwise it will just try to use the default uncapped framerate patch (50fps for PAL, 60fps for NTSC)',
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
      {
        valor: '60fps PAL-to-NTSC',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_enable_hw_hacks',
    descricao: 'HW Hacks > Enable Manual Hardware Renderer Fixes (Not Recommended)',
    info: 'This will disable automatic settings from the database. Unless you know what you are doing it is NOT RECOMMENDED to turn this ON.',
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
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_cpu_sprite_size',
    descricao: 'HW Hacks > CPU Sprite Render Size',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: '0',
        rotulo: 'disabled',
      },
      {
        valor: '1',
        rotulo: '1 (64 Max Width)',
      },
      {
        valor: '2',
        rotulo: '2 (128 Max Width)',
      },
      {
        valor: '3',
        rotulo: '3 (192 Max Width)',
      },
      {
        valor: '4',
        rotulo: '4 (256 Max Width)',
      },
      {
        valor: '5',
        rotulo: '5 (320 Max Width)',
      },
      {
        valor: '6',
        rotulo: '6 (384 Max Width)',
      },
      {
        valor: '7',
        rotulo: '7 (448 Max Width)',
      },
      {
        valor: '8',
        rotulo: '8 (512 Max Width)',
      },
      {
        valor: '9',
        rotulo: '9 (576 Max Width)',
      },
      {
        valor: '10',
        rotulo: '10 (640 Max Width)',
      },
    ],
    padrao: '0',
  },
  {
    chave: 'pcsx2_cpu_sprite_level',
    descricao: 'HW Hacks > CPU Sprite Render Level',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'Sprites Only',
        rotulo: null,
      },
      {
        valor: 'Sprites/Triangles',
        rotulo: null,
      },
      {
        valor: 'Blended Sprites/Triangles',
        rotulo: null,
      },
    ],
    padrao: 'Sprites Only',
  },
  {
    chave: 'pcsx2_software_clut_render',
    descricao: 'HW Hacks > Software CLUT Render',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Normal',
        rotulo: null,
      },
      {
        valor: 'Aggressive',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_auto_flush',
    descricao: 'HW Hacks > Auto Flush',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Sprites Only',
        rotulo: null,
      },
      {
        valor: 'All Primitives',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_texture_inside_rt',
    descricao: 'HW Hacks > Texture Inside RT',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Inside Target',
        rotulo: null,
      },
      {
        valor: 'Merge Targets',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_disable_depth_conversion',
    descricao: 'HW Hacks > Disabled Depth Conversion',
    info: '',
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
    chave: 'pcsx2_use_external_gameindex',
    descricao: 'Use External GameIndex Database',
    info: 'Load the game-compatibility database from <system>/resources/GameIndex.yaml if present, falling back to the built-in database when it is missing. When disabled, always use the database built into the core.',
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
    chave: 'pcsx2_framebuffer_conversion',
    descricao: 'HW Hacks > Framebuffer Conversion',
    info: '',
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
    chave: 'pcsx2_disable_partial_invalidation',
    descricao: 'HW Hacks > Disable Partial Source Invalidation',
    info: '',
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
    chave: 'pcsx2_gpu_palette_conversion',
    descricao: 'HW Hacks > GPU Palette Conversion',
    info: '',
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
    chave: 'pcsx2_preload_frame_data',
    descricao: 'HW Hacks > Preload Frame Data',
    info: '',
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
    chave: 'pcsx2_half_pixel_offset',
    descricao: 'HW Hacks > Half Pixel Offset',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Normal (Vertex)',
        rotulo: null,
      },
      {
        valor: 'Special (Texture)',
        rotulo: null,
      },
      {
        valor: 'Special (Texture - Aggressive)',
        rotulo: null,
      },
      {
        valor: 'Align to Native',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_round_sprite',
    descricao: 'HW Hacks > Round Sprite',
    info: '',
    categoria: 'hw_hacks',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'Half',
        rotulo: null,
      },
      {
        valor: 'Full',
        rotulo: null,
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_align_sprite',
    descricao: 'HW Hacks > Align Sprite',
    info: '',
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
    chave: 'pcsx2_merge_sprite',
    descricao: 'HW Hacks > Merge Sprite',
    info: '',
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
    chave: 'pcsx2_unscaled_palette_draw',
    descricao: 'HW Hacks > Unscaled Palette Texture Draws',
    info: '',
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
    chave: 'pcsx2_force_sprite_position',
    descricao: 'HW Hacks > Force Even Sprite Position',
    info: '',
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
    chave: 'pcsx2_axis_deadzone1',
    descricao: 'Input > Port 1 > Analog Deadzone',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '0%',
        rotulo: null,
      },
      {
        valor: '1%',
        rotulo: null,
      },
      {
        valor: '2%',
        rotulo: null,
      },
      {
        valor: '3%',
        rotulo: null,
      },
      {
        valor: '4%',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '6%',
        rotulo: null,
      },
      {
        valor: '7%',
        rotulo: null,
      },
      {
        valor: '8%',
        rotulo: null,
      },
      {
        valor: '9%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '11%',
        rotulo: null,
      },
      {
        valor: '12%',
        rotulo: null,
      },
      {
        valor: '13%',
        rotulo: null,
      },
      {
        valor: '14%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '16%',
        rotulo: null,
      },
      {
        valor: '17%',
        rotulo: null,
      },
      {
        valor: '18%',
        rotulo: null,
      },
      {
        valor: '19%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '21%',
        rotulo: null,
      },
      {
        valor: '22%',
        rotulo: null,
      },
      {
        valor: '23%',
        rotulo: null,
      },
      {
        valor: '24%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '26%',
        rotulo: null,
      },
      {
        valor: '27%',
        rotulo: null,
      },
      {
        valor: '28%',
        rotulo: null,
      },
      {
        valor: '29%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '31%',
        rotulo: null,
      },
      {
        valor: '32%',
        rotulo: null,
      },
      {
        valor: '33%',
        rotulo: null,
      },
      {
        valor: '34%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '36%',
        rotulo: null,
      },
      {
        valor: '37%',
        rotulo: null,
      },
      {
        valor: '38%',
        rotulo: null,
      },
      {
        valor: '39%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '41%',
        rotulo: null,
      },
      {
        valor: '42%',
        rotulo: null,
      },
      {
        valor: '43%',
        rotulo: null,
      },
      {
        valor: '44%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '46%',
        rotulo: null,
      },
      {
        valor: '47%',
        rotulo: null,
      },
      {
        valor: '48%',
        rotulo: null,
      },
      {
        valor: '49%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
    ],
    padrao: '15%',
  },
  {
    chave: 'pcsx2_button_deadzone1',
    descricao: 'Input > Port 1 > Trigger Deadzone',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '0%',
        rotulo: null,
      },
      {
        valor: '1%',
        rotulo: null,
      },
      {
        valor: '2%',
        rotulo: null,
      },
      {
        valor: '3%',
        rotulo: null,
      },
      {
        valor: '4%',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '6%',
        rotulo: null,
      },
      {
        valor: '7%',
        rotulo: null,
      },
      {
        valor: '8%',
        rotulo: null,
      },
      {
        valor: '9%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '11%',
        rotulo: null,
      },
      {
        valor: '12%',
        rotulo: null,
      },
      {
        valor: '13%',
        rotulo: null,
      },
      {
        valor: '14%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '16%',
        rotulo: null,
      },
      {
        valor: '17%',
        rotulo: null,
      },
      {
        valor: '18%',
        rotulo: null,
      },
      {
        valor: '19%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '21%',
        rotulo: null,
      },
      {
        valor: '22%',
        rotulo: null,
      },
      {
        valor: '23%',
        rotulo: null,
      },
      {
        valor: '24%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '26%',
        rotulo: null,
      },
      {
        valor: '27%',
        rotulo: null,
      },
      {
        valor: '28%',
        rotulo: null,
      },
      {
        valor: '29%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '31%',
        rotulo: null,
      },
      {
        valor: '32%',
        rotulo: null,
      },
      {
        valor: '33%',
        rotulo: null,
      },
      {
        valor: '34%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '36%',
        rotulo: null,
      },
      {
        valor: '37%',
        rotulo: null,
      },
      {
        valor: '38%',
        rotulo: null,
      },
      {
        valor: '39%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '41%',
        rotulo: null,
      },
      {
        valor: '42%',
        rotulo: null,
      },
      {
        valor: '43%',
        rotulo: null,
      },
      {
        valor: '44%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '46%',
        rotulo: null,
      },
      {
        valor: '47%',
        rotulo: null,
      },
      {
        valor: '48%',
        rotulo: null,
      },
      {
        valor: '49%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
    ],
    padrao: '0%',
  },
  {
    chave: 'pcsx2_axis_scale1',
    descricao: 'Input > Port 1 > Analog Sensitivity',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '80%',
        rotulo: null,
      },
      {
        valor: '81%',
        rotulo: null,
      },
      {
        valor: '82%',
        rotulo: null,
      },
      {
        valor: '83%',
        rotulo: null,
      },
      {
        valor: '84%',
        rotulo: null,
      },
      {
        valor: '85%',
        rotulo: null,
      },
      {
        valor: '86%',
        rotulo: null,
      },
      {
        valor: '87%',
        rotulo: null,
      },
      {
        valor: '88%',
        rotulo: null,
      },
      {
        valor: '89%',
        rotulo: null,
      },
      {
        valor: '90%',
        rotulo: null,
      },
      {
        valor: '91%',
        rotulo: null,
      },
      {
        valor: '92%',
        rotulo: null,
      },
      {
        valor: '93%',
        rotulo: null,
      },
      {
        valor: '94%',
        rotulo: null,
      },
      {
        valor: '95%',
        rotulo: null,
      },
      {
        valor: '96%',
        rotulo: null,
      },
      {
        valor: '97%',
        rotulo: null,
      },
      {
        valor: '98%',
        rotulo: null,
      },
      {
        valor: '99%',
        rotulo: null,
      },
      {
        valor: '100%',
        rotulo: null,
      },
      {
        valor: '101%',
        rotulo: null,
      },
      {
        valor: '102%',
        rotulo: null,
      },
      {
        valor: '103%',
        rotulo: null,
      },
      {
        valor: '104%',
        rotulo: null,
      },
      {
        valor: '105%',
        rotulo: null,
      },
      {
        valor: '106%',
        rotulo: null,
      },
      {
        valor: '107%',
        rotulo: null,
      },
      {
        valor: '108%',
        rotulo: null,
      },
      {
        valor: '109%',
        rotulo: null,
      },
      {
        valor: '110%',
        rotulo: null,
      },
      {
        valor: '111%',
        rotulo: null,
      },
      {
        valor: '112%',
        rotulo: null,
      },
      {
        valor: '113%',
        rotulo: null,
      },
      {
        valor: '114%',
        rotulo: null,
      },
      {
        valor: '115%',
        rotulo: null,
      },
      {
        valor: '116%',
        rotulo: null,
      },
      {
        valor: '117%',
        rotulo: null,
      },
      {
        valor: '118%',
        rotulo: null,
      },
      {
        valor: '119%',
        rotulo: null,
      },
      {
        valor: '120%',
        rotulo: null,
      },
      {
        valor: '121%',
        rotulo: null,
      },
      {
        valor: '122%',
        rotulo: null,
      },
      {
        valor: '123%',
        rotulo: null,
      },
      {
        valor: '124%',
        rotulo: null,
      },
      {
        valor: '125%',
        rotulo: null,
      },
      {
        valor: '126%',
        rotulo: null,
      },
      {
        valor: '127%',
        rotulo: null,
      },
      {
        valor: '128%',
        rotulo: null,
      },
      {
        valor: '129%',
        rotulo: null,
      },
      {
        valor: '130%',
        rotulo: null,
      },
      {
        valor: '131%',
        rotulo: null,
      },
      {
        valor: '132%',
        rotulo: null,
      },
      {
        valor: '133%',
        rotulo: null,
      },
      {
        valor: '134%',
        rotulo: null,
      },
      {
        valor: '135%',
        rotulo: null,
      },
      {
        valor: '136%',
        rotulo: null,
      },
      {
        valor: '137%',
        rotulo: null,
      },
      {
        valor: '138%',
        rotulo: null,
      },
      {
        valor: '139%',
        rotulo: null,
      },
      {
        valor: '140%',
        rotulo: null,
      },
      {
        valor: '141%',
        rotulo: null,
      },
      {
        valor: '142%',
        rotulo: null,
      },
      {
        valor: '143%',
        rotulo: null,
      },
      {
        valor: '144%',
        rotulo: null,
      },
      {
        valor: '145%',
        rotulo: null,
      },
      {
        valor: '146%',
        rotulo: null,
      },
      {
        valor: '147%',
        rotulo: null,
      },
      {
        valor: '148%',
        rotulo: null,
      },
      {
        valor: '149%',
        rotulo: null,
      },
      {
        valor: '150%',
        rotulo: null,
      },
      {
        valor: '151%',
        rotulo: null,
      },
      {
        valor: '152%',
        rotulo: null,
      },
      {
        valor: '153%',
        rotulo: null,
      },
      {
        valor: '154%',
        rotulo: null,
      },
      {
        valor: '155%',
        rotulo: null,
      },
      {
        valor: '156%',
        rotulo: null,
      },
      {
        valor: '157%',
        rotulo: null,
      },
      {
        valor: '158%',
        rotulo: null,
      },
      {
        valor: '159%',
        rotulo: null,
      },
      {
        valor: '160%',
        rotulo: null,
      },
      {
        valor: '161%',
        rotulo: null,
      },
      {
        valor: '162%',
        rotulo: null,
      },
      {
        valor: '163%',
        rotulo: null,
      },
      {
        valor: '164%',
        rotulo: null,
      },
      {
        valor: '165%',
        rotulo: null,
      },
      {
        valor: '166%',
        rotulo: null,
      },
      {
        valor: '167%',
        rotulo: null,
      },
      {
        valor: '168%',
        rotulo: null,
      },
      {
        valor: '169%',
        rotulo: null,
      },
      {
        valor: '170%',
        rotulo: null,
      },
      {
        valor: '171%',
        rotulo: null,
      },
      {
        valor: '172%',
        rotulo: null,
      },
      {
        valor: '173%',
        rotulo: null,
      },
      {
        valor: '174%',
        rotulo: null,
      },
      {
        valor: '175%',
        rotulo: null,
      },
      {
        valor: '176%',
        rotulo: null,
      },
      {
        valor: '177%',
        rotulo: null,
      },
      {
        valor: '178%',
        rotulo: null,
      },
      {
        valor: '179%',
        rotulo: null,
      },
      {
        valor: '180%',
        rotulo: null,
      },
      {
        valor: '181%',
        rotulo: null,
      },
      {
        valor: '182%',
        rotulo: null,
      },
      {
        valor: '183%',
        rotulo: null,
      },
      {
        valor: '184%',
        rotulo: null,
      },
      {
        valor: '185%',
        rotulo: null,
      },
      {
        valor: '186%',
        rotulo: null,
      },
      {
        valor: '187%',
        rotulo: null,
      },
      {
        valor: '188%',
        rotulo: null,
      },
      {
        valor: '189%',
        rotulo: null,
      },
      {
        valor: '190%',
        rotulo: null,
      },
      {
        valor: '191%',
        rotulo: null,
      },
      {
        valor: '192%',
        rotulo: null,
      },
      {
        valor: '193%',
        rotulo: null,
      },
      {
        valor: '194%',
        rotulo: null,
      },
      {
        valor: '195%',
        rotulo: null,
      },
      {
        valor: '196%',
        rotulo: null,
      },
      {
        valor: '197%',
        rotulo: null,
      },
      {
        valor: '198%',
        rotulo: null,
      },
      {
        valor: '199%',
        rotulo: null,
      },
      {
        valor: '200%',
        rotulo: null,
      },
    ],
    padrao: '133%',
  },
  {
    chave: 'pcsx2_invert_left_stick1',
    descricao: 'Input > Port 1 > Invert Left Analog Axis',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'x_axis',
        rotulo: 'Left/Right',
      },
      {
        valor: 'y_axis',
        rotulo: 'Up/Down',
      },
      {
        valor: 'all',
        rotulo: 'Up/Down and Left/Right',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_invert_right_stick1',
    descricao: 'Input > Port 1 > Invert Right Analog Axis',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'x_axis',
        rotulo: 'Left/Right',
      },
      {
        valor: 'y_axis',
        rotulo: 'Up/Down',
      },
      {
        valor: 'all',
        rotulo: 'Up/Down and Left/Right',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_analog_mode1',
    descricao: 'Input > Port 1 > Start in Analog Mode',
    info: "Start the controller in analog mode rather than digital. Some games (e.g. Ridge Racer V) boot the pad in digital and normally require pressing the controller's ANALOG button to enable the sticks; enable this to get analog controls from the start. Games that lock the controller mode are unaffected.",
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
    chave: 'pcsx2_enable_rumble1',
    descricao: 'Input > Port 1 > Rumble',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
      {
        valor: '55%',
        rotulo: null,
      },
      {
        valor: '60%',
        rotulo: null,
      },
      {
        valor: '65%',
        rotulo: null,
      },
      {
        valor: '70%',
        rotulo: null,
      },
      {
        valor: '75%',
        rotulo: null,
      },
      {
        valor: '80%',
        rotulo: null,
      },
      {
        valor: '85%',
        rotulo: null,
      },
      {
        valor: '90%',
        rotulo: null,
      },
      {
        valor: '95%',
        rotulo: null,
      },
      {
        valor: '100%',
        rotulo: null,
      },
    ],
    padrao: '100%',
  },
  {
    chave: 'pcsx2_axis_deadzone2',
    descricao: 'Input > Port 2 > Analog Deadzone',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '0%',
        rotulo: null,
      },
      {
        valor: '1%',
        rotulo: null,
      },
      {
        valor: '2%',
        rotulo: null,
      },
      {
        valor: '3%',
        rotulo: null,
      },
      {
        valor: '4%',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '6%',
        rotulo: null,
      },
      {
        valor: '7%',
        rotulo: null,
      },
      {
        valor: '8%',
        rotulo: null,
      },
      {
        valor: '9%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '11%',
        rotulo: null,
      },
      {
        valor: '12%',
        rotulo: null,
      },
      {
        valor: '13%',
        rotulo: null,
      },
      {
        valor: '14%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '16%',
        rotulo: null,
      },
      {
        valor: '17%',
        rotulo: null,
      },
      {
        valor: '18%',
        rotulo: null,
      },
      {
        valor: '19%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '21%',
        rotulo: null,
      },
      {
        valor: '22%',
        rotulo: null,
      },
      {
        valor: '23%',
        rotulo: null,
      },
      {
        valor: '24%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '26%',
        rotulo: null,
      },
      {
        valor: '27%',
        rotulo: null,
      },
      {
        valor: '28%',
        rotulo: null,
      },
      {
        valor: '29%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '31%',
        rotulo: null,
      },
      {
        valor: '32%',
        rotulo: null,
      },
      {
        valor: '33%',
        rotulo: null,
      },
      {
        valor: '34%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '36%',
        rotulo: null,
      },
      {
        valor: '37%',
        rotulo: null,
      },
      {
        valor: '38%',
        rotulo: null,
      },
      {
        valor: '39%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '41%',
        rotulo: null,
      },
      {
        valor: '42%',
        rotulo: null,
      },
      {
        valor: '43%',
        rotulo: null,
      },
      {
        valor: '44%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '46%',
        rotulo: null,
      },
      {
        valor: '47%',
        rotulo: null,
      },
      {
        valor: '48%',
        rotulo: null,
      },
      {
        valor: '49%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
    ],
    padrao: '15%',
  },
  {
    chave: 'pcsx2_button_deadzone2',
    descricao: 'Input > Port 2 > Trigger Deadzone',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '0%',
        rotulo: null,
      },
      {
        valor: '1%',
        rotulo: null,
      },
      {
        valor: '2%',
        rotulo: null,
      },
      {
        valor: '3%',
        rotulo: null,
      },
      {
        valor: '4%',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '6%',
        rotulo: null,
      },
      {
        valor: '7%',
        rotulo: null,
      },
      {
        valor: '8%',
        rotulo: null,
      },
      {
        valor: '9%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '11%',
        rotulo: null,
      },
      {
        valor: '12%',
        rotulo: null,
      },
      {
        valor: '13%',
        rotulo: null,
      },
      {
        valor: '14%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '16%',
        rotulo: null,
      },
      {
        valor: '17%',
        rotulo: null,
      },
      {
        valor: '18%',
        rotulo: null,
      },
      {
        valor: '19%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '21%',
        rotulo: null,
      },
      {
        valor: '22%',
        rotulo: null,
      },
      {
        valor: '23%',
        rotulo: null,
      },
      {
        valor: '24%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '26%',
        rotulo: null,
      },
      {
        valor: '27%',
        rotulo: null,
      },
      {
        valor: '28%',
        rotulo: null,
      },
      {
        valor: '29%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '31%',
        rotulo: null,
      },
      {
        valor: '32%',
        rotulo: null,
      },
      {
        valor: '33%',
        rotulo: null,
      },
      {
        valor: '34%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '36%',
        rotulo: null,
      },
      {
        valor: '37%',
        rotulo: null,
      },
      {
        valor: '38%',
        rotulo: null,
      },
      {
        valor: '39%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '41%',
        rotulo: null,
      },
      {
        valor: '42%',
        rotulo: null,
      },
      {
        valor: '43%',
        rotulo: null,
      },
      {
        valor: '44%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '46%',
        rotulo: null,
      },
      {
        valor: '47%',
        rotulo: null,
      },
      {
        valor: '48%',
        rotulo: null,
      },
      {
        valor: '49%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
    ],
    padrao: '0%',
  },
  {
    chave: 'pcsx2_axis_scale2',
    descricao: 'Input > Port 2 > Analog Sensitivity',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: '80%',
        rotulo: null,
      },
      {
        valor: '81%',
        rotulo: null,
      },
      {
        valor: '82%',
        rotulo: null,
      },
      {
        valor: '83%',
        rotulo: null,
      },
      {
        valor: '84%',
        rotulo: null,
      },
      {
        valor: '85%',
        rotulo: null,
      },
      {
        valor: '86%',
        rotulo: null,
      },
      {
        valor: '87%',
        rotulo: null,
      },
      {
        valor: '88%',
        rotulo: null,
      },
      {
        valor: '89%',
        rotulo: null,
      },
      {
        valor: '90%',
        rotulo: null,
      },
      {
        valor: '91%',
        rotulo: null,
      },
      {
        valor: '92%',
        rotulo: null,
      },
      {
        valor: '93%',
        rotulo: null,
      },
      {
        valor: '94%',
        rotulo: null,
      },
      {
        valor: '95%',
        rotulo: null,
      },
      {
        valor: '96%',
        rotulo: null,
      },
      {
        valor: '97%',
        rotulo: null,
      },
      {
        valor: '98%',
        rotulo: null,
      },
      {
        valor: '99%',
        rotulo: null,
      },
      {
        valor: '100%',
        rotulo: null,
      },
      {
        valor: '101%',
        rotulo: null,
      },
      {
        valor: '102%',
        rotulo: null,
      },
      {
        valor: '103%',
        rotulo: null,
      },
      {
        valor: '104%',
        rotulo: null,
      },
      {
        valor: '105%',
        rotulo: null,
      },
      {
        valor: '106%',
        rotulo: null,
      },
      {
        valor: '107%',
        rotulo: null,
      },
      {
        valor: '108%',
        rotulo: null,
      },
      {
        valor: '109%',
        rotulo: null,
      },
      {
        valor: '110%',
        rotulo: null,
      },
      {
        valor: '111%',
        rotulo: null,
      },
      {
        valor: '112%',
        rotulo: null,
      },
      {
        valor: '113%',
        rotulo: null,
      },
      {
        valor: '114%',
        rotulo: null,
      },
      {
        valor: '115%',
        rotulo: null,
      },
      {
        valor: '116%',
        rotulo: null,
      },
      {
        valor: '117%',
        rotulo: null,
      },
      {
        valor: '118%',
        rotulo: null,
      },
      {
        valor: '119%',
        rotulo: null,
      },
      {
        valor: '120%',
        rotulo: null,
      },
      {
        valor: '121%',
        rotulo: null,
      },
      {
        valor: '122%',
        rotulo: null,
      },
      {
        valor: '123%',
        rotulo: null,
      },
      {
        valor: '124%',
        rotulo: null,
      },
      {
        valor: '125%',
        rotulo: null,
      },
      {
        valor: '126%',
        rotulo: null,
      },
      {
        valor: '127%',
        rotulo: null,
      },
      {
        valor: '128%',
        rotulo: null,
      },
      {
        valor: '129%',
        rotulo: null,
      },
      {
        valor: '130%',
        rotulo: null,
      },
      {
        valor: '131%',
        rotulo: null,
      },
      {
        valor: '132%',
        rotulo: null,
      },
      {
        valor: '133%',
        rotulo: null,
      },
      {
        valor: '134%',
        rotulo: null,
      },
      {
        valor: '135%',
        rotulo: null,
      },
      {
        valor: '136%',
        rotulo: null,
      },
      {
        valor: '137%',
        rotulo: null,
      },
      {
        valor: '138%',
        rotulo: null,
      },
      {
        valor: '139%',
        rotulo: null,
      },
      {
        valor: '140%',
        rotulo: null,
      },
      {
        valor: '141%',
        rotulo: null,
      },
      {
        valor: '142%',
        rotulo: null,
      },
      {
        valor: '143%',
        rotulo: null,
      },
      {
        valor: '144%',
        rotulo: null,
      },
      {
        valor: '145%',
        rotulo: null,
      },
      {
        valor: '146%',
        rotulo: null,
      },
      {
        valor: '147%',
        rotulo: null,
      },
      {
        valor: '148%',
        rotulo: null,
      },
      {
        valor: '149%',
        rotulo: null,
      },
      {
        valor: '150%',
        rotulo: null,
      },
      {
        valor: '151%',
        rotulo: null,
      },
      {
        valor: '152%',
        rotulo: null,
      },
      {
        valor: '153%',
        rotulo: null,
      },
      {
        valor: '154%',
        rotulo: null,
      },
      {
        valor: '155%',
        rotulo: null,
      },
      {
        valor: '156%',
        rotulo: null,
      },
      {
        valor: '157%',
        rotulo: null,
      },
      {
        valor: '158%',
        rotulo: null,
      },
      {
        valor: '159%',
        rotulo: null,
      },
      {
        valor: '160%',
        rotulo: null,
      },
      {
        valor: '161%',
        rotulo: null,
      },
      {
        valor: '162%',
        rotulo: null,
      },
      {
        valor: '163%',
        rotulo: null,
      },
      {
        valor: '164%',
        rotulo: null,
      },
      {
        valor: '165%',
        rotulo: null,
      },
      {
        valor: '166%',
        rotulo: null,
      },
      {
        valor: '167%',
        rotulo: null,
      },
      {
        valor: '168%',
        rotulo: null,
      },
      {
        valor: '169%',
        rotulo: null,
      },
      {
        valor: '170%',
        rotulo: null,
      },
      {
        valor: '171%',
        rotulo: null,
      },
      {
        valor: '172%',
        rotulo: null,
      },
      {
        valor: '173%',
        rotulo: null,
      },
      {
        valor: '174%',
        rotulo: null,
      },
      {
        valor: '175%',
        rotulo: null,
      },
      {
        valor: '176%',
        rotulo: null,
      },
      {
        valor: '177%',
        rotulo: null,
      },
      {
        valor: '178%',
        rotulo: null,
      },
      {
        valor: '179%',
        rotulo: null,
      },
      {
        valor: '180%',
        rotulo: null,
      },
      {
        valor: '181%',
        rotulo: null,
      },
      {
        valor: '182%',
        rotulo: null,
      },
      {
        valor: '183%',
        rotulo: null,
      },
      {
        valor: '184%',
        rotulo: null,
      },
      {
        valor: '185%',
        rotulo: null,
      },
      {
        valor: '186%',
        rotulo: null,
      },
      {
        valor: '187%',
        rotulo: null,
      },
      {
        valor: '188%',
        rotulo: null,
      },
      {
        valor: '189%',
        rotulo: null,
      },
      {
        valor: '190%',
        rotulo: null,
      },
      {
        valor: '191%',
        rotulo: null,
      },
      {
        valor: '192%',
        rotulo: null,
      },
      {
        valor: '193%',
        rotulo: null,
      },
      {
        valor: '194%',
        rotulo: null,
      },
      {
        valor: '195%',
        rotulo: null,
      },
      {
        valor: '196%',
        rotulo: null,
      },
      {
        valor: '197%',
        rotulo: null,
      },
      {
        valor: '198%',
        rotulo: null,
      },
      {
        valor: '199%',
        rotulo: null,
      },
      {
        valor: '200%',
        rotulo: null,
      },
    ],
    padrao: '133%',
  },
  {
    chave: 'pcsx2_invert_left_stick2',
    descricao: 'Input > Port 2 > Invert Left Analog Axis',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'x_axis',
        rotulo: 'Left/Right',
      },
      {
        valor: 'y_axis',
        rotulo: 'Up/Down',
      },
      {
        valor: 'all',
        rotulo: 'Up/Down and Left/Right',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_invert_right_stick2',
    descricao: 'Input > Port 2 > Invert Right Analog Axis',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: 'x_axis',
        rotulo: 'Left/Right',
      },
      {
        valor: 'y_axis',
        rotulo: 'Up/Down',
      },
      {
        valor: 'all',
        rotulo: 'Up/Down and Left/Right',
      },
    ],
    padrao: 'disabled',
  },
  {
    chave: 'pcsx2_analog_mode2',
    descricao: 'Input > Port 2 > Start in Analog Mode',
    info: "Start the controller in analog mode rather than digital. Some games (e.g. Ridge Racer V) boot the pad in digital and normally require pressing the controller's ANALOG button to enable the sticks; enable this to get analog controls from the start. Games that lock the controller mode are unaffected.",
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
    chave: 'pcsx2_enable_rumble2',
    descricao: 'Input > Port 2 > Rumble',
    info: '',
    categoria: 'input',
    valores: [
      {
        valor: 'disabled',
        rotulo: null,
      },
      {
        valor: '5%',
        rotulo: null,
      },
      {
        valor: '10%',
        rotulo: null,
      },
      {
        valor: '15%',
        rotulo: null,
      },
      {
        valor: '20%',
        rotulo: null,
      },
      {
        valor: '25%',
        rotulo: null,
      },
      {
        valor: '30%',
        rotulo: null,
      },
      {
        valor: '35%',
        rotulo: null,
      },
      {
        valor: '40%',
        rotulo: null,
      },
      {
        valor: '45%',
        rotulo: null,
      },
      {
        valor: '50%',
        rotulo: null,
      },
      {
        valor: '55%',
        rotulo: null,
      },
      {
        valor: '60%',
        rotulo: null,
      },
      {
        valor: '65%',
        rotulo: null,
      },
      {
        valor: '70%',
        rotulo: null,
      },
      {
        valor: '75%',
        rotulo: null,
      },
      {
        valor: '80%',
        rotulo: null,
      },
      {
        valor: '85%',
        rotulo: null,
      },
      {
        valor: '90%',
        rotulo: null,
      },
      {
        valor: '95%',
        rotulo: null,
      },
      {
        valor: '100%',
        rotulo: null,
      },
    ],
    padrao: '100%',
  },
];
