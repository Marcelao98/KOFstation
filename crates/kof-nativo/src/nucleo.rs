//! O frontend libretro: carrega o núcleo (`.so`/`.dll`), responde o `environment` e recebe imagem, som e botões.
//!
//! As funções que o núcleo chama de volta não têm "contexto" (é C): o estado delas fica num global. Por isso só existe
//! **um núcleo por processo** (é pra isso que ele roda num processo filho) e `Nucleo::carregar` recusa um segundo.
#![allow(unsafe_code)]
use crate::libretro::*;
use kof_core::KofError;
use libloading::Library;
use std::collections::BTreeMap;
use std::ffi::{c_char, c_uint, c_void, CStr, CString};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant};

/// Botões (máscara do libretro: bit N = `RETRO_DEVICE_ID_JOYPAD_*` N) e analógicos de um jogador.
#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
pub struct Entrada {
    pub botoes: u16,
    /// esquerdo X, esquerdo Y, direito X, direito Y (-32768..32767)
    pub eixos: [i16; 4],
}

/// O mouse sobre a área do jogo (W.4, o ponteiro do Wiimote): posição no jeito do libretro (`RETRO_DEVICE_POINTER`,
/// -0x7fff..0x7fff dos dois lados da imagem) e os botões (bit 0 esquerdo, 1 direito, 2 do meio).
#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
pub struct Ponteiro {
    pub x: i16,
    pub y: i16,
    pub botoes: u8,
    /// o mouse está sobre a imagem (fora dela o ponteiro "sai da tela", como o Wiimote apontado pra fora da TV)
    pub dentro: bool,
}

pub const JOGADORES: usize = 4;

/// W.6, o celular como Wiimote: aceleração em g e giroscópio em rad/s, já nos eixos do Wiimote (X pra esquerda, Y pra
/// trás, Z pra cima), que é como o Dolphin do libretro lê a interface de sensores.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Movimento {
    pub acel: [f32; 3],
    pub giro: [f32; 3],
}

impl Movimento {
    /// deitado e parado: só a gravidade, pra cima
    pub const PARADO: Movimento = Movimento {
        acel: [0.0, 0.0, 1.0],
        giro: [0.0; 3],
    };
}

/// Sem notícia do celular por mais que isso, o Wiimote fica parado (nada de chacoalhar ou girar preso).
pub const VIGIA_MOVIMENTO: Duration = Duration::from_millis(150);

/// O que o núcleo lê de um sensor: o último movimento, ou parado se ele é velho (ou nunca veio).
pub fn sensor_le(m: Option<(Movimento, Instant)>, id: c_uint, agora: Instant) -> f32 {
    let v = match m {
        Some((m, quando)) if agora.duration_since(quando) <= VIGIA_MOVIMENTO => m,
        _ => Movimento::PARADO,
    };
    match id {
        0..=2 => v.acel[id as usize],
        3..=5 => v.giro[id as usize - 3],
        _ => 0.0,
    }
}

/// Último quadro, já em RGBA (os mesmos bytes que a ponte do antigo entrega à página).
#[derive(Clone, Default)]
pub struct Quadro {
    pub largura: u32,
    pub altura: u32,
    pub rgba: Vec<u8>,
}

#[derive(Default)]
struct Contexto {
    formato: c_uint,
    quadro: Quadro,
    quadro_novo: bool,
    /// som do quadro (estéreo intercalado)
    som: Vec<i16>,
    entrada: [Entrada; JOGADORES],
    ponteiro: [Ponteiro; JOGADORES],
    /// W.6: o último movimento de cada jogador e quando chegou
    movimento: [Option<(Movimento, Instant)>; JOGADORES],
    /// as portas com celular-Wiimote: o núcleo só liga os sensores delas (sem celular, o teclado chacoalha)
    sensores: [bool; JOGADORES],
    /// portas que ganharam sensor agora: o tipo de controle é mandado de novo pro núcleo religar os sensores dela
    religar: [bool; JOGADORES],
    sistema: CString,
    saves: CString,
    variaveis: BTreeMap<String, CString>,
    variaveis_mudaram: bool,
    /// tudo o que o núcleo declarou no `SET_VARIABLES` (chave → "Descrição; padrão|outro|…"), na ordem da chave
    declaradas: BTreeMap<String, String>,
    av_mudou: Option<retro_system_av_info>,
    geometria_mudou: Option<retro_game_geometry>,
    pediu_fim: bool,
    pediu_gpu: bool,
    /// o núcleo desenha na placa (OpenGL sem janela, `gl.rs`)
    hw: Option<Hw>,
}

#[derive(Clone, Copy)]
struct Hw {
    reset: Option<HwResetFn>,
    destruir: Option<HwResetFn>,
    profundidade: bool,
    estencil: bool,
    embaixo: bool,
}

static CTX: Mutex<Option<Contexto>> = Mutex::new(None);
static EM_USO: AtomicBool = AtomicBool::new(false);

fn ctx() -> MutexGuard<'static, Option<Contexto>> {
    // um callback que entrou em pânico não pode travar os outros: o dado continua utilizável
    CTX.lock().unwrap_or_else(|e| e.into_inner())
}

fn com<R>(f: impl FnOnce(&mut Contexto) -> R) -> Option<R> {
    ctx().as_mut().map(f)
}

/// Converte uma linha do formato do núcleo pra RGBA, igual ao `video()` do `ponte.cpp` do antigo.
pub fn converter(formato: c_uint, origem: &[u8], largura: usize, destino: &mut [u8]) {
    let de5 = |v: u32| ((v << 3) | (v >> 2)) as u8;
    match formato {
        RETRO_PIXEL_FORMAT_XRGB8888 => {
            for (o, d) in origem.chunks_exact(4).take(largura).zip(destino.chunks_exact_mut(4)) {
                d.copy_from_slice(&[o[2], o[1], o[0], 255]);
            }
        }
        RETRO_PIXEL_FORMAT_RGB565 => {
            for (o, d) in origem.chunks_exact(2).take(largura).zip(destino.chunks_exact_mut(4)) {
                let c = u16::from_le_bytes([o[0], o[1]]) as u32;
                let (r, g, b) = ((c >> 11) & 31, (c >> 5) & 63, c & 31);
                d.copy_from_slice(&[de5(r), ((g << 2) | (g >> 4)) as u8, de5(b), 255]);
            }
        }
        _ => {
            for (o, d) in origem.chunks_exact(2).take(largura).zip(destino.chunks_exact_mut(4)) {
                let c = u16::from_le_bytes([o[0], o[1]]) as u32;
                let (r, g, b) = ((c >> 10) & 31, (c >> 5) & 31, c & 31);
                d.copy_from_slice(&[de5(r), de5(g), de5(b), 255]);
            }
        }
    }
}

/// Pega o padrão de uma opção no formato do `SET_VARIABLES`: "Descrição; padrão|outra|mais".
pub fn padrao_da_opcao(texto: &str) -> Option<&str> {
    let (_, lista) = texto.split_once(';')?;
    lista.trim_start().split('|').next().filter(|s| !s.is_empty())
}

/// Uma opção como o núcleo a declarou no `SET_VARIABLES` ("Descrição; padrão|valor2|valor3").
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpcaoDeclarada {
    pub chave: String,
    pub descricao: String,
    /// valores aceitos; o primeiro é o padrão do núcleo
    pub valores: Vec<String>,
}

/// Separa o texto do `SET_VARIABLES` em descrição e valores.
pub fn analisar_opcao(chave: &str, texto: &str) -> OpcaoDeclarada {
    let (descricao, lista) = texto.split_once(';').unwrap_or((texto, ""));
    OpcaoDeclarada {
        chave: chave.to_string(),
        descricao: descricao.trim().to_string(),
        valores: lista
            .trim_start()
            .split('|')
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .collect(),
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// o que o núcleo chama de volta

/// Recebe o texto já formatado pela ponte em C (`ponte.c`).
///
/// # Safety
/// `texto` é nulo ou uma string C terminada em zero, válida durante a chamada (só a ponte chama).
#[no_mangle]
pub unsafe extern "C" fn kof_nativo_log(nivel: c_uint, texto: *const c_char) {
    if texto.is_null() {
        return;
    }
    // SAFETY: a ponte manda uma string C terminada em zero, válida durante a chamada
    let t = unsafe { CStr::from_ptr(texto) }.to_string_lossy();
    let t = t.trim_end();
    match nivel {
        3 => tracing::error!(target: "nucleo", "{t}"),
        2 => tracing::warn!(target: "nucleo", "{t}"),
        1 => tracing::info!(target: "nucleo", "{t}"),
        _ => tracing::debug!(target: "nucleo", "{t}"),
    }
}

extern "C" {
    fn kof_nativo_log_ponte(nivel: c_uint, fmt: *const c_char, ...);
}

unsafe extern "C" fn cb_environment(cmd: c_uint, data: *mut c_void) -> bool {
    let mut g = ctx();
    let Some(c) = g.as_mut() else { return false };
    match cmd {
        ENV_GET_CAN_DUPE => {
            if !data.is_null() {
                *(data as *mut bool) = true;
            }
            true
        }
        ENV_SET_PIXEL_FORMAT => {
            let f = *(data as *const c_uint);
            if f > RETRO_PIXEL_FORMAT_RGB565 {
                return false;
            }
            c.formato = f;
            true
        }
        ENV_GET_SYSTEM_DIRECTORY | ENV_GET_CORE_ASSETS_DIRECTORY => {
            *(data as *mut *const c_char) = c.sistema.as_ptr();
            true
        }
        ENV_GET_SAVE_DIRECTORY => {
            *(data as *mut *const c_char) = c.saves.as_ptr();
            true
        }
        ENV_SET_VARIABLES => {
            // guarda o padrão de cada opção, como o RetroArch (sem isso alguns núcleos ficam sem a opção certa)
            let mut v = data as *const retro_variable;
            while !v.is_null() && !(*v).key.is_null() {
                let k = CStr::from_ptr((*v).key).to_string_lossy().into_owned();
                if !(*v).value.is_null() {
                    c.declaradas
                        .insert(k.clone(), CStr::from_ptr((*v).value).to_string_lossy().into_owned());
                }
                if !c.variaveis.contains_key(&k) && !(*v).value.is_null() {
                    let texto = CStr::from_ptr((*v).value).to_string_lossy();
                    if let Some(p) = padrao_da_opcao(&texto).and_then(|p| CString::new(p).ok()) {
                        c.variaveis.insert(k, p);
                    }
                }
                v = v.add(1);
            }
            true
        }
        ENV_GET_VARIABLE => {
            let v = data as *mut retro_variable;
            if v.is_null() || (*v).key.is_null() {
                return false;
            }
            let k = CStr::from_ptr((*v).key).to_string_lossy();
            match c.variaveis.get(k.as_ref()) {
                Some(val) => {
                    (*v).value = val.as_ptr();
                    true
                }
                None => {
                    (*v).value = std::ptr::null();
                    false
                }
            }
        }
        ENV_GET_VARIABLE_UPDATE => {
            *(data as *mut bool) = std::mem::take(&mut c.variaveis_mudaram);
            true
        }
        ENV_GET_LOG_INTERFACE => {
            (*(data as *mut retro_log_callback)).log = kof_nativo_log_ponte as *const c_void;
            true
        }
        ENV_SET_SYSTEM_AV_INFO => {
            c.av_mudou = Some(*(data as *const retro_system_av_info));
            true
        }
        ENV_SET_GEOMETRY => {
            c.geometria_mudou = Some(*(data as *const retro_game_geometry));
            true
        }
        ENV_SHUTDOWN => {
            c.pediu_fim = true;
            true
        }
        ENV_SET_HW_RENDER => {
            c.pediu_gpu = true;
            let h = &mut *(data as *mut retro_hw_render_callback);
            if h.context_type != RETRO_HW_CONTEXT_OPENGL && h.context_type != RETRO_HW_CONTEXT_OPENGL_CORE {
                return false; // Vulkan, GLES...: o núcleo escolhe outro ou desenha por software
            }
            let core = h.context_type == RETRO_HW_CONTEXT_OPENGL_CORE;
            let (ma, mi) = match (h.version_major, core) {
                (0, true) => (3, 2),
                (0, false) => (2, 1),
                v => (v.0, h.version_minor),
            };
            if !crate::gl::existe() {
                if let Err(e) = crate::gl::criar(ma, mi, core) {
                    tracing::error!(target: "nucleo", "sem OpenGL pro núcleo: {e}");
                    return false;
                }
            }
            h.get_current_framebuffer = Some(crate::gl::fbo_atual);
            h.get_proc_address = Some(crate::gl::funcao);
            c.hw = Some(Hw {
                reset: h.context_reset,
                destruir: h.context_destroy,
                profundidade: h.depth,
                estencil: h.stencil,
                embaixo: h.bottom_left_origin,
            });
            true
        }
        ENV_GET_PREFERRED_HW_RENDER => {
            *(data as *mut c_uint) = RETRO_HW_CONTEXT_OPENGL_CORE;
            true
        }
        ENV_GET_INPUT_BITMASKS => true,
        ENV_GET_AUDIO_VIDEO_ENABLE => {
            if !data.is_null() {
                *(data as *mut i32) = 3;
            }
            true
        }
        ENV_GET_LANGUAGE => {
            *(data as *mut c_uint) = RETRO_LANGUAGE_PORTUGUESE_BRAZIL;
            true
        }
        ENV_GET_SENSOR_INTERFACE => {
            if data.is_null() {
                return false;
            }
            let i = &mut *(data as *mut retro_sensor_interface);
            i.set_sensor_state = Some(cb_sensor_estado);
            i.get_sensor_input = Some(cb_sensor);
            true
        }
        ENV_GET_INPUT_MAX_USERS => {
            *(data as *mut c_uint) = JOGADORES as c_uint;
            true
        }
        ENV_GET_MESSAGE_INTERFACE_VERSION => {
            *(data as *mut c_uint) = 0;
            true
        }
        ENV_SET_MESSAGE => {
            let m = data as *const retro_message;
            if !m.is_null() && !(*m).msg.is_null() {
                let t = CStr::from_ptr((*m).msg).to_string_lossy();
                tracing::info!(target: "nucleo", "mensagem: {t}");
            }
            true
        }
        ENV_SET_ROTATION
        | ENV_SET_PERFORMANCE_LEVEL
        | ENV_SET_INPUT_DESCRIPTORS
        | ENV_SET_SUPPORT_NO_GAME
        | ENV_SET_CONTROLLER_INFO
        | ENV_SET_MEMORY_MAPS
        | ENV_SET_SUPPORT_ACHIEVEMENTS
        | ENV_SET_SERIALIZATION_QUIRKS
        | ENV_SET_CORE_OPTIONS_DISPLAY
        | ENV_SET_CONTENT_INFO_OVERRIDE => true,
        // o resto (opções v1/v2, VFS, disco, vibração...) o núcleo trata como "não tem": cai no jeito antigo
        _ => false,
    }
}

unsafe extern "C" fn cb_video(dados: *const c_void, w: c_uint, h: c_uint, pitch: usize) {
    if dados as usize == RETRO_HW_FRAME_BUFFER_VALID && w > 0 && h > 0 {
        // desenhou na placa: lê de volta (assíncrono; pode entregar o quadro de 2 atrás, nunca acumula)
        let mut g = ctx();
        let Some(c) = g.as_mut() else { return };
        let embaixo = c.hw.is_some_and(|x| x.embaixo);
        let mut dim = (0, 0);
        if crate::gl::quadro(w, h, embaixo, &mut c.quadro.rgba, &mut dim) {
            (c.quadro.largura, c.quadro.altura) = dim;
            c.quadro_novo = true;
        }
        return;
    }
    if dados.is_null() || dados as usize == RETRO_HW_FRAME_BUFFER_VALID || w == 0 || h == 0 {
        return; // quadro repetido (CAN_DUPE): fica o anterior
    }
    let mut g = ctx();
    let Some(c) = g.as_mut() else { return };
    let (w, h) = (w as usize, h as usize);
    let bpp = if c.formato == RETRO_PIXEL_FORMAT_XRGB8888 { 4 } else { 2 };
    if pitch < w * bpp {
        return;
    }
    let q = &mut c.quadro;
    q.largura = w as u32;
    q.altura = h as u32;
    q.rgba.resize(w * h * 4, 0);
    let origem = std::slice::from_raw_parts(dados as *const u8, pitch * (h - 1) + w * bpp);
    for y in 0..h {
        let linha = &origem[y * pitch..y * pitch + w * bpp];
        converter(c.formato, linha, w, &mut q.rgba[y * w * 4..(y + 1) * w * 4]);
    }
    c.quadro_novo = true;
}

unsafe extern "C" fn cb_amostra(l: i16, r: i16) {
    com(|c| c.som.extend_from_slice(&[l, r]));
}

unsafe extern "C" fn cb_amostras(dados: *const i16, quadros: usize) -> usize {
    if dados.is_null() {
        return quadros;
    }
    let s = std::slice::from_raw_parts(dados, quadros * 2);
    com(|c| c.som.extend_from_slice(s));
    quadros
}

unsafe extern "C" fn cb_poll() {}

/// Ligar um sensor só dá certo nas portas com celular-Wiimote; desligar sempre dá.
unsafe extern "C" fn cb_sensor_estado(porta: c_uint, acao: c_uint, _taxa: c_uint) -> bool {
    match acao {
        RETRO_SENSOR_ACCELEROMETER_ENABLE | RETRO_SENSOR_GYROSCOPE_ENABLE => {
            com(|c| c.sensores.get(porta as usize).copied().unwrap_or(false)).unwrap_or(false)
        }
        _ => true,
    }
}

unsafe extern "C" fn cb_sensor(porta: c_uint, id: c_uint) -> f32 {
    let m = com(|c| c.movimento.get(porta as usize).copied().flatten()).flatten();
    sensor_le(m, id, Instant::now())
}

/// O que o núcleo lê do mouse: `POINTER` dá a posição absoluta (X 0, Y 1, apertado 2, fora da tela 3); `MOUSE`, os
/// botões (esquerdo 2, direito 3, do meio 6). O movimento relativo do `MOUSE` fica em zero (ninguém usa ainda).
pub fn ponteiro_le(p: &Ponteiro, dispositivo: c_uint, indice: c_uint, id: c_uint) -> i16 {
    if dispositivo == RETRO_DEVICE_POINTER {
        if indice > 0 {
            return 0;
        }
        return match id {
            0 => p.x,
            1 => p.y,
            2 => (p.botoes & 1) as i16,
            3 => (!p.dentro) as i16,
            _ => 0,
        };
    }
    match id {
        2 => (p.botoes & 1) as i16,
        3 => ((p.botoes >> 1) & 1) as i16,
        6 => ((p.botoes >> 2) & 1) as i16,
        _ => 0,
    }
}

unsafe extern "C" fn cb_input(porta: c_uint, dispositivo: c_uint, indice: c_uint, id: c_uint) -> i16 {
    let g = ctx();
    let Some(c) = g.as_ref() else { return 0 };
    let Some(e) = c.entrada.get(porta as usize) else {
        return 0;
    };
    match dispositivo & 0xff {
        RETRO_DEVICE_JOYPAD if id == RETRO_DEVICE_ID_JOYPAD_MASK => e.botoes as i16,
        RETRO_DEVICE_JOYPAD if id < 16 => ((e.botoes >> id) & 1) as i16,
        RETRO_DEVICE_ANALOG if indice <= RETRO_DEVICE_INDEX_ANALOG_RIGHT && id < 2 => {
            e.eixos[(indice * 2 + id) as usize]
        }
        RETRO_DEVICE_POINTER | RETRO_DEVICE_MOUSE => {
            let p = c.ponteiro.get(porta as usize).copied().unwrap_or_default();
            ponteiro_le(&p, dispositivo & 0xff, indice, id)
        }
        _ => 0,
    }
}

// ---------------------------------------------------------------------------------------------------------------------

struct Funcoes {
    deinit: unsafe extern "C" fn(),
    run: unsafe extern "C" fn(),
    reset: unsafe extern "C" fn(),
    serialize_size: unsafe extern "C" fn() -> usize,
    serialize: unsafe extern "C" fn(*mut c_void, usize) -> bool,
    unserialize: unsafe extern "C" fn(*const c_void, usize) -> bool,
    unload_game: unsafe extern "C" fn(),
    get_memory_data: unsafe extern "C" fn(c_uint) -> *mut c_void,
    get_memory_size: unsafe extern "C" fn(c_uint) -> usize,
    get_system_av_info: unsafe extern "C" fn(*mut retro_system_av_info),
}

/// Nome, versão e o que o núcleo aceita.
#[derive(Clone, Debug, serde::Serialize)]
pub struct InfoNucleo {
    pub nome: String,
    pub versao: String,
    pub extensoes: String,
    pub caminho_inteiro: bool,
}

/// O que o processo pede pra carregar.
#[derive(Clone, Debug, Default)]
pub struct Abertura {
    pub nucleo: PathBuf,
    pub jogo: Option<PathBuf>,
    pub sistema: PathBuf,
    pub saves: PathBuf,
    pub variaveis: BTreeMap<String, String>,
    /// tipo de controle nas portas (libretro: 1 = controle, 517 = DualShock do PCSX); sem = controle comum
    pub dispositivo: Option<u32>,
}

pub struct Nucleo {
    f: Funcoes,
    /// PCSX-ReARMed com o recompilador lightrec (x86_64): carregar estado sem reset antes faz ele pular pra um bloco
    /// de código já descartado (SIGILL; acontece também no upstream mais novo). O reset limpa o cache do recompilador
    /// inteiro, um quadro deixa o boot da BIOS HLE acontecer, e o estado sobrescreve tudo depois (testes `pcsx.rs` e
    /// `jogo_de_verdade.rs`).
    resetar_antes_do_estado: bool,
    /// W.6: pra mandar de novo o tipo de controle de uma porta que ganhou sensor
    set_porta: unsafe extern "C" fn(c_uint, c_uint),
    dispositivo: c_uint,
    pub info: InfoNucleo,
    pub av: retro_system_av_info,
    /// o conteúdo precisa viver enquanto o jogo está aberto (alguns núcleos guardam o ponteiro)
    _conteudo: Option<(CString, Vec<u8>)>,
    // por último: a biblioteca só pode sair da memória depois de tudo
    _lib: Library,
}

fn erro(msg: impl Into<String>) -> KofError {
    KofError::Nucleo(msg.into())
}

fn texto_c(p: *const c_char) -> String {
    if p.is_null() {
        String::new()
    } else {
        // SAFETY: string C do núcleo, terminada em zero
        unsafe { CStr::from_ptr(p) }.to_string_lossy().into_owned()
    }
}

fn caminho_c(p: &Path) -> Result<CString, KofError> {
    CString::new(p.to_string_lossy().into_owned()).map_err(|_| erro(format!("caminho com zero: {}", p.display())))
}

impl Nucleo {
    /// Carrega o núcleo e o jogo. Só um por processo.
    pub fn carregar(a: &Abertura) -> Result<Nucleo, KofError> {
        if EM_USO.swap(true, Ordering::SeqCst) {
            return Err(erro("já tem um núcleo aberto neste processo"));
        }
        let r = Self::carregar_de_fato(a);
        if r.is_err() {
            *ctx() = None;
            EM_USO.store(false, Ordering::SeqCst);
        }
        r
    }

    fn carregar_de_fato(a: &Abertura) -> Result<Nucleo, KofError> {
        // SAFETY: carregar uma biblioteca roda os construtores dela; o núcleo vem do manifesto (SHA-256 conferido)
        let lib = unsafe { Library::new(&a.nucleo) }
            .map_err(|e| erro(format!("não consegui abrir {}: {e}", a.nucleo.display())))?;
        macro_rules! sim {
            ($nome:literal, $t:ty) => {{
                // SAFETY: o tipo é o do libretro.h
                let s: libloading::Symbol<$t> = unsafe { lib.get(concat!($nome, "\0").as_bytes()) }
                    .map_err(|e| erro(format!("o núcleo não tem {}: {e}", $nome)))?;
                *s
            }};
        }
        let api_version = sim!("retro_api_version", unsafe extern "C" fn() -> c_uint);
        // SAFETY: funções do núcleo com a assinatura do libretro.h, chamadas na ordem que ele pede
        unsafe {
            if api_version() != RETRO_API_VERSION {
                return Err(erro(format!("versão do libretro {} (esperava 1)", api_version())));
            }
        }
        let f = Funcoes {
            deinit: sim!("retro_deinit", unsafe extern "C" fn()),
            run: sim!("retro_run", unsafe extern "C" fn()),
            reset: sim!("retro_reset", unsafe extern "C" fn()),
            serialize_size: sim!("retro_serialize_size", unsafe extern "C" fn() -> usize),
            serialize: sim!("retro_serialize", unsafe extern "C" fn(*mut c_void, usize) -> bool),
            unserialize: sim!("retro_unserialize", unsafe extern "C" fn(*const c_void, usize) -> bool),
            unload_game: sim!("retro_unload_game", unsafe extern "C" fn()),
            get_memory_data: sim!("retro_get_memory_data", unsafe extern "C" fn(c_uint) -> *mut c_void),
            get_memory_size: sim!("retro_get_memory_size", unsafe extern "C" fn(c_uint) -> usize),
            get_system_av_info: sim!(
                "retro_get_system_av_info",
                unsafe extern "C" fn(*mut retro_system_av_info)
            ),
        };
        let init = sim!("retro_init", unsafe extern "C" fn());
        let set_env = sim!("retro_set_environment", unsafe extern "C" fn(EnvironmentFn));
        let set_video = sim!("retro_set_video_refresh", unsafe extern "C" fn(VideoRefreshFn));
        let set_amostra = sim!("retro_set_audio_sample", unsafe extern "C" fn(AudioSampleFn));
        let set_amostras = sim!("retro_set_audio_sample_batch", unsafe extern "C" fn(AudioSampleBatchFn));
        let set_poll = sim!("retro_set_input_poll", unsafe extern "C" fn(InputPollFn));
        let set_input = sim!("retro_set_input_state", unsafe extern "C" fn(InputStateFn));
        let get_info = sim!("retro_get_system_info", unsafe extern "C" fn(*mut retro_system_info));
        let load_game = sim!("retro_load_game", unsafe extern "C" fn(*const retro_game_info) -> bool);
        let set_porta = sim!("retro_set_controller_port_device", unsafe extern "C" fn(c_uint, c_uint));

        let mut variaveis = BTreeMap::new();
        for (k, v) in &a.variaveis {
            variaveis.insert(
                k.clone(),
                CString::new(v.as_str()).map_err(|_| erro(format!("opção {k} com zero")))?,
            );
        }
        *ctx() = Some(Contexto {
            formato: RETRO_PIXEL_FORMAT_0RGB1555,
            sistema: caminho_c(&a.sistema)?,
            saves: caminho_c(&a.saves)?,
            variaveis,
            ..Default::default()
        });

        // SAFETY: ordem do libretro.h: environment antes do init; callbacks antes do load_game
        let (info, conteudo, ok) = unsafe {
            set_env(cb_environment);
            init();
            set_video(cb_video);
            set_amostra(cb_amostra);
            set_amostras(cb_amostras);
            set_poll(cb_poll);
            set_input(cb_input);
            let mut si: retro_system_info = std::mem::zeroed();
            get_info(&mut si);
            let info = InfoNucleo {
                nome: texto_c(si.library_name),
                versao: texto_c(si.library_version),
                extensoes: texto_c(si.valid_extensions),
                caminho_inteiro: si.need_fullpath,
            };
            let conteudo = match &a.jogo {
                Some(p) => {
                    let dados = if info.caminho_inteiro {
                        Vec::new()
                    } else {
                        std::fs::read(p).map_err(|e| KofError::de_io(p.display(), e))?
                    };
                    Some((caminho_c(p)?, dados))
                }
                None => None,
            };
            let ok = match &conteudo {
                Some((caminho, dados)) => {
                    let gi = retro_game_info {
                        path: caminho.as_ptr(),
                        data: if dados.is_empty() {
                            std::ptr::null()
                        } else {
                            dados.as_ptr() as *const c_void
                        },
                        size: dados.len(),
                        meta: std::ptr::null(),
                    };
                    load_game(&gi)
                }
                None => load_game(std::ptr::null()),
            };
            (info, conteudo, ok)
        };
        if !ok {
            // SAFETY: o init rodou; o deinit desfaz antes de soltar a biblioteca
            unsafe { (f.deinit)() };
            return Err(erro(format!("o {} não abriu o jogo", info.nome)));
        }
        let mut av = retro_system_av_info::default();
        // SAFETY: jogo carregado; portas no controle pedido (ou no padrão, como o RetroArch)
        unsafe {
            (f.get_system_av_info)(&mut av);
            // desenho pela placa: o framebuffer no tamanho máximo e o context_reset (como o RetroArch faz depois do
            // load_game); fora do lock: o núcleo chama o get_proc_address lá dentro
            let hw = com(|c| c.hw).flatten();
            if let Some(hw) = hw {
                let (w, h) = (av.geometry.max_width, av.geometry.max_height);
                if let Err(e) = crate::gl::preparar(w, h, hw.profundidade, hw.estencil) {
                    (f.deinit)();
                    return Err(erro(format!("o OpenGL não preparou a imagem do núcleo: {e}")));
                }
                if let Some(r) = hw.reset {
                    r();
                }
            }
            for p in 0..JOGADORES as c_uint {
                set_porta(p, a.dispositivo.unwrap_or(RETRO_DEVICE_JOYPAD));
            }
        }
        tracing::info!(nucleo = %info.nome, versao = %info.versao, ?av, "núcleo nativo aberto");
        Ok(Nucleo {
            f,
            resetar_antes_do_estado: info.nome.contains("PCSX"),
            set_porta,
            dispositivo: a.dispositivo.unwrap_or(RETRO_DEVICE_JOYPAD),
            info,
            av,
            _conteudo: conteudo,
            _lib: lib,
        })
    }

    /// Roda um quadro. Devolve o som dele (estéreo intercalado) e se a imagem mudou.
    pub fn rodar(&mut self, som: &mut Vec<i16>) -> bool {
        let religar = com(|c| std::mem::take(&mut c.religar)).unwrap_or_default();
        for (p, _) in religar.iter().enumerate().filter(|(_, r)| **r) {
            // SAFETY: jogo carregado, fora do lock (o núcleo pergunta dos sensores lá dentro)
            unsafe { (self.set_porta)(p as c_uint, self.dispositivo) };
            tracing::info!(porta = p, "sensores ligados (celular como Wiimote)");
        }
        // SAFETY: jogo carregado; o lock do contexto não está preso (os callbacks pegam)
        unsafe { (self.f.run)() };
        let mut g = ctx();
        let Some(c) = g.as_mut() else { return false };
        som.append(&mut c.som);
        if let Some(av) = c.av_mudou.take() {
            self.av = av;
        }
        if let Some(geo) = c.geometria_mudou.take() {
            self.av.geometry = geo;
        }
        std::mem::take(&mut c.quadro_novo)
    }

    /// Cópia do último quadro (RGBA).
    pub fn quadro(&self) -> Quadro {
        com(|c| c.quadro.clone()).unwrap_or_default()
    }

    /// Escreve o último quadro direto num buffer (sem alocar): cabeçalho + RGBA, ver `protocolo`.
    pub fn com_quadro<R>(&self, f: impl FnOnce(&Quadro) -> R) -> Option<R> {
        com(|c| f(&c.quadro))
    }

    pub fn pediu_fim(&self) -> bool {
        com(|c| c.pediu_fim).unwrap_or(false)
    }

    pub fn pediu_gpu(&self) -> bool {
        com(|c| c.pediu_gpu).unwrap_or(false)
    }

    /// O mouse sobre a imagem (o ponteiro do Wiimote no Dolphin).
    pub fn ponteiro(&self, jogador: usize, p: Ponteiro) {
        com(|c| {
            if let Some(x) = c.ponteiro.get_mut(jogador) {
                *x = p;
            }
        });
    }

    /// W.6: o movimento do celular-Wiimote do jogador. O primeiro liga os sensores da porta dele.
    pub fn movimento(&self, jogador: usize, m: Movimento) {
        com(|c| {
            if jogador >= JOGADORES {
                return;
            }
            c.movimento[jogador] = Some((m, Instant::now()));
            if !c.sensores[jogador] {
                c.sensores[jogador] = true;
                c.religar[jogador] = true;
            }
        });
    }

    pub fn entrada(&self, jogador: usize, e: Entrada) {
        com(|c| {
            if let Some(x) = c.entrada.get_mut(jogador) {
                *x = e;
            }
        });
    }

    /// Todas as opções que o núcleo declarou (por chave). Vazio se ele só declara depois de abrir um jogo.
    pub fn opcoes_declaradas(&self) -> Vec<OpcaoDeclarada> {
        com(|c| c.declaradas.iter().map(|(k, t)| analisar_opcao(k, t)).collect()).unwrap_or_default()
    }

    pub fn variavel(&self, chave: &str, valor: &str) -> Result<(), KofError> {
        let v = CString::new(valor).map_err(|_| erro("opção com zero"))?;
        com(|c| {
            c.variaveis.insert(chave.to_string(), v);
            c.variaveis_mudaram = true;
        });
        Ok(())
    }

    pub fn reiniciar(&mut self) {
        // SAFETY: jogo carregado
        unsafe { (self.f.reset)() }
    }

    /// Estado salvo (o mesmo formato do núcleo em wasm quando é o mesmo commit).
    pub fn salvar_estado(&mut self) -> Result<Vec<u8>, KofError> {
        // SAFETY: buffer do tamanho que o núcleo pediu
        unsafe {
            let n = (self.f.serialize_size)();
            if n == 0 {
                return Err(erro("o núcleo não salva estado"));
            }
            let mut v = vec![0u8; n];
            if !(self.f.serialize)(v.as_mut_ptr() as *mut c_void, n) {
                return Err(erro("o núcleo não conseguiu salvar o estado"));
            }
            Ok(v)
        }
    }

    /// Estado salvo direto em `buf` (o rebobinar grava ~30 por segundo: sem alocar a cada vez).
    pub fn salvar_estado_em(&mut self, buf: &mut Vec<u8>) -> Result<(), KofError> {
        // SAFETY: buffer do tamanho que o núcleo pediu
        unsafe {
            let n = (self.f.serialize_size)();
            if n == 0 {
                return Err(erro("o núcleo não salva estado"));
            }
            buf.resize(n, 0);
            if !(self.f.serialize)(buf.as_mut_ptr() as *mut c_void, n) {
                return Err(erro("o núcleo não conseguiu salvar o estado"));
            }
        }
        Ok(())
    }

    /// Carrega um estado do próprio jogo que está rodando (rebobinar): sem o reset que o `carregar_estado` do PCSX faz
    /// (aquele é pro estado que chega de fora, com o jogo recém-aberto).
    pub fn voltar_estado(&mut self, dados: &[u8]) -> Result<(), KofError> {
        // SAFETY: o núcleo só lê `dados.len()` bytes
        if unsafe { (self.f.unserialize)(dados.as_ptr() as *const c_void, dados.len()) } {
            Ok(())
        } else {
            Err(erro("o núcleo recusou o estado"))
        }
    }

    pub fn carregar_estado(&mut self, dados: &[u8]) -> Result<(), KofError> {
        // SAFETY: o núcleo só lê `dados.len()` bytes
        let ok = unsafe {
            if self.resetar_antes_do_estado {
                (self.f.reset)();
                // com a BIOS HLE o reset deixa o boot do CD pro próximo quadro, e esse boot passaria por cima do estado
                // (jogo de verdade: tela preta e o jogo recomeça). Um quadro aqui faz o boot acontecer antes; o som e
                // a imagem dele não vão pra página.
                (self.f.run)();
            }
            (self.f.unserialize)(dados.as_ptr() as *const c_void, dados.len())
        };
        if self.resetar_antes_do_estado {
            com(|c| {
                c.som.clear();
                c.quadro_novo = false;
            });
        }
        if ok {
            Ok(())
        } else {
            Err(erro("o núcleo recusou o estado"))
        }
    }

    /// Bateria (RAM do cartucho; no PS1, o cartão de memória 1).
    pub fn bateria(&self) -> Option<Vec<u8>> {
        // SAFETY: ponteiro e tamanho vêm do núcleo, válidos enquanto o jogo está aberto
        unsafe {
            let n = (self.f.get_memory_size)(RETRO_MEMORY_SAVE_RAM);
            let p = (self.f.get_memory_data)(RETRO_MEMORY_SAVE_RAM) as *const u8;
            (n > 0 && !p.is_null()).then(|| std::slice::from_raw_parts(p, n).to_vec())
        }
    }

    pub fn gravar_bateria(&mut self, dados: &[u8]) -> Result<(), KofError> {
        // SAFETY: escreve no máximo o tamanho que o núcleo informa
        unsafe {
            let n = (self.f.get_memory_size)(RETRO_MEMORY_SAVE_RAM);
            let p = (self.f.get_memory_data)(RETRO_MEMORY_SAVE_RAM) as *mut u8;
            if n == 0 || p.is_null() {
                return Err(erro("este jogo não tem bateria"));
            }
            let m = n.min(dados.len());
            std::ptr::copy_nonoverlapping(dados.as_ptr(), p, m);
        }
        Ok(())
    }
}

impl Drop for Nucleo {
    fn drop(&mut self) {
        // SAFETY: desfaz na ordem do libretro.h; depois disso nenhum callback é chamado
        unsafe {
            if let Some(d) = com(|c| c.hw.and_then(|h| h.destruir)).flatten() {
                d(); // o núcleo solta o que criou no OpenGL antes do jogo fechar
            }
            (self.f.unload_game)();
            (self.f.deinit)();
        }
        *ctx() = None;
        EM_USO.store(false, Ordering::SeqCst);
    }
}
