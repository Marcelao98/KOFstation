//! OpenGL sem janela pro núcleo que desenha na placa de vídeo (`SET_HW_RENDER`; o PS2/LRPS2, depois o N64): o
//! contexto é criado no processo do jogo (Linux: EGL; Windows: uma janela escondida com WGL), o núcleo desenha num
//! framebuffer nosso e a imagem volta pra CPU a cada quadro, com leitura assíncrona (buffers em rodízio: o quadro N é
//! lido enquanto o N+1 desenha; a placa nunca espera a CPU). Tudo no fio do núcleo (é nele que o contexto é corrente).
#![allow(unsafe_code)]
use std::ffi::{c_char, c_void, CStr};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

const GL_FRAMEBUFFER: u32 = 0x8D40;
const GL_READ_FRAMEBUFFER: u32 = 0x8CA8;
const GL_RENDERBUFFER: u32 = 0x8D41;
const GL_COLOR_ATTACHMENT0: u32 = 0x8CE0;
const GL_DEPTH_STENCIL_ATTACHMENT: u32 = 0x821A;
const GL_DEPTH_ATTACHMENT: u32 = 0x8D00;
const GL_DEPTH24_STENCIL8: u32 = 0x88F0;
const GL_DEPTH_COMPONENT24: u32 = 0x81A6;
const GL_TEXTURE_2D: u32 = 0x0DE1;
const GL_RGBA8: u32 = 0x8058;
const GL_RGBA: u32 = 0x1908;
const GL_UNSIGNED_BYTE: u32 = 0x1401;
const GL_PIXEL_PACK_BUFFER: u32 = 0x88EB;
const GL_STREAM_READ: u32 = 0x88E1;
const GL_MAP_READ_BIT: u32 = 0x0001;
const GL_PACK_ALIGNMENT: u32 = 0x0D05;
const GL_SYNC_GPU_COMMANDS_COMPLETE: u32 = 0x9117;
const GL_SYNC_FLUSH_COMMANDS_BIT: u32 = 0x1;
const GL_TIMEOUT_EXPIRED: u32 = 0x911B;
const GL_FRAMEBUFFER_COMPLETE: u32 = 0x8CD5;

/// As funções do OpenGL que o frontend usa (carregadas pelo get_proc_address do contexto).
#[allow(clippy::type_complexity)]
struct Gl {
    gen_framebuffers: unsafe extern "system" fn(i32, *mut u32),
    bind_framebuffer: unsafe extern "system" fn(u32, u32),
    framebuffer_texture_2d: unsafe extern "system" fn(u32, u32, u32, u32, i32),
    check_framebuffer_status: unsafe extern "system" fn(u32) -> u32,
    gen_renderbuffers: unsafe extern "system" fn(i32, *mut u32),
    bind_renderbuffer: unsafe extern "system" fn(u32, u32),
    renderbuffer_storage: unsafe extern "system" fn(u32, u32, i32, i32),
    framebuffer_renderbuffer: unsafe extern "system" fn(u32, u32, u32, u32),
    gen_textures: unsafe extern "system" fn(i32, *mut u32),
    bind_texture: unsafe extern "system" fn(u32, u32),
    tex_image_2d: unsafe extern "system" fn(u32, i32, i32, i32, i32, i32, u32, u32, *const c_void),
    read_pixels: unsafe extern "system" fn(i32, i32, i32, i32, u32, u32, *mut c_void),
    pixel_storei: unsafe extern "system" fn(u32, i32),
    gen_buffers: unsafe extern "system" fn(i32, *mut u32),
    bind_buffer: unsafe extern "system" fn(u32, u32),
    buffer_data: unsafe extern "system" fn(u32, isize, *const c_void, u32),
    map_buffer_range: unsafe extern "system" fn(u32, isize, isize, u32) -> *mut c_void,
    unmap_buffer: unsafe extern "system" fn(u32) -> u8,
    fence_sync: unsafe extern "system" fn(u32, u32) -> *const c_void,
    client_wait_sync: unsafe extern "system" fn(*const c_void, u32, u64) -> u32,
    delete_sync: unsafe extern "system" fn(*const c_void),
}

/// Um quadro em leitura num buffer da placa.
struct Leitura {
    pbo: u32,
    cerca: *const c_void,
    largura: i32,
    altura: i32,
}

struct Estado {
    plataforma: plataforma::Contexto,
    gl: Gl,
    fbo: u32,
    tamanho: (i32, i32),
    /// buffers em rodízio (3): cada um com o quadro que está sendo lido
    pbos: Vec<u32>,
    lendo: std::collections::VecDeque<Leitura>,
    proximo: usize,
}

// SAFETY: o contexto e as cercas só são usados no fio do núcleo (o Mutex só guarda; ninguém mais chama)
unsafe impl Send for Estado {}

static ESTADO: Mutex<Option<Estado>> = Mutex::new(None);
static FBO: AtomicU32 = AtomicU32::new(0);
/// microssegundos gastos lendo a imagem da placa (somados; o laço tira a média por segundo)
pub static LEITURA_US: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

fn estado() -> std::sync::MutexGuard<'static, Option<Estado>> {
    ESTADO.lock().unwrap_or_else(|e| e.into_inner())
}

/// O framebuffer onde o núcleo desenha (`get_current_framebuffer` do libretro).
pub extern "C" fn fbo_atual() -> usize {
    FBO.load(Ordering::Relaxed) as usize
}

/// `get_proc_address` do libretro.
///
/// # Safety
/// `nome` é uma string C terminada em zero (o núcleo chama).
pub unsafe extern "C" fn funcao(nome: *const c_char) -> *const c_void {
    if nome.is_null() {
        return std::ptr::null();
    }
    // SAFETY: string do núcleo terminada em zero
    plataforma::funcao(unsafe { CStr::from_ptr(nome) })
}

fn carregar<T: Copy>(nome: &str) -> Result<T, String> {
    let c = std::ffi::CString::new(nome).expect("nome sem zero");
    let p = plataforma::funcao(&c);
    if p.is_null() {
        return Err(format!("o OpenGL não tem {nome}"));
    }
    // SAFETY: ponteiro de função do OpenGL com a assinatura declarada em `Gl` (mesmo tamanho de ponteiro)
    Ok(unsafe { std::mem::transmute_copy::<*const c_void, T>(&p) })
}

/// Cria o contexto (versão pedida pelo núcleo; `core` = perfil core) e deixa corrente neste fio.
pub fn criar(major: u32, minor: u32, core: bool) -> Result<(), String> {
    let p = plataforma::Contexto::criar(major, minor, core)?;
    let gl = Gl {
        gen_framebuffers: carregar("glGenFramebuffers")?,
        bind_framebuffer: carregar("glBindFramebuffer")?,
        framebuffer_texture_2d: carregar("glFramebufferTexture2D")?,
        check_framebuffer_status: carregar("glCheckFramebufferStatus")?,
        gen_renderbuffers: carregar("glGenRenderbuffers")?,
        bind_renderbuffer: carregar("glBindRenderbuffer")?,
        renderbuffer_storage: carregar("glRenderbufferStorage")?,
        framebuffer_renderbuffer: carregar("glFramebufferRenderbuffer")?,
        gen_textures: carregar("glGenTextures")?,
        bind_texture: carregar("glBindTexture")?,
        tex_image_2d: carregar("glTexImage2D")?,
        read_pixels: carregar("glReadPixels")?,
        pixel_storei: carregar("glPixelStorei")?,
        gen_buffers: carregar("glGenBuffers")?,
        bind_buffer: carregar("glBindBuffer")?,
        buffer_data: carregar("glBufferData")?,
        map_buffer_range: carregar("glMapBufferRange")?,
        unmap_buffer: carregar("glUnmapBuffer")?,
        fence_sync: carregar("glFenceSync")?,
        client_wait_sync: carregar("glClientWaitSync")?,
        delete_sync: carregar("glDeleteSync")?,
    };
    *estado() = Some(Estado {
        plataforma: p,
        gl,
        fbo: 0,
        tamanho: (0, 0),
        pbos: Vec::new(),
        lendo: Default::default(),
        proximo: 0,
    });
    Ok(())
}

pub fn existe() -> bool {
    estado().is_some()
}

/// (Re)cria o framebuffer do núcleo no tamanho máximo da imagem, com profundidade/estêncil se ele pediu.
pub fn preparar(largura: u32, altura: u32, profundidade: bool, estencil: bool) -> Result<(), String> {
    let mut g = estado();
    let e = g.as_mut().ok_or("sem contexto OpenGL")?;
    let (w, h) = (largura.max(1) as i32, altura.max(1) as i32);
    let gl = &e.gl;
    // SAFETY: contexto corrente neste fio; ids gerados aqui
    unsafe {
        let (mut fbo, mut tex, mut rb) = (0u32, 0u32, 0u32);
        (gl.gen_framebuffers)(1, &mut fbo);
        (gl.bind_framebuffer)(GL_FRAMEBUFFER, fbo);
        (gl.gen_textures)(1, &mut tex);
        (gl.bind_texture)(GL_TEXTURE_2D, tex);
        (gl.tex_image_2d)(
            GL_TEXTURE_2D,
            0,
            GL_RGBA8 as i32,
            w,
            h,
            0,
            GL_RGBA,
            GL_UNSIGNED_BYTE,
            std::ptr::null(),
        );
        (gl.framebuffer_texture_2d)(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, tex, 0);
        if profundidade {
            (gl.gen_renderbuffers)(1, &mut rb);
            (gl.bind_renderbuffer)(GL_RENDERBUFFER, rb);
            let (fmt, anexo) = if estencil {
                (GL_DEPTH24_STENCIL8, GL_DEPTH_STENCIL_ATTACHMENT)
            } else {
                (GL_DEPTH_COMPONENT24, GL_DEPTH_ATTACHMENT)
            };
            (gl.renderbuffer_storage)(GL_RENDERBUFFER, fmt, w, h);
            (gl.framebuffer_renderbuffer)(GL_FRAMEBUFFER, anexo, GL_RENDERBUFFER, rb);
        }
        let st = (gl.check_framebuffer_status)(GL_FRAMEBUFFER);
        if st != GL_FRAMEBUFFER_COMPLETE {
            return Err(format!("framebuffer incompleto (0x{st:x})"));
        }
        (gl.bind_texture)(GL_TEXTURE_2D, 0);
        let mut pbos = vec![0u32; 3];
        (gl.gen_buffers)(3, pbos.as_mut_ptr());
        for &p in &pbos {
            (gl.bind_buffer)(GL_PIXEL_PACK_BUFFER, p);
            (gl.buffer_data)(
                GL_PIXEL_PACK_BUFFER,
                (w * h * 4) as isize,
                std::ptr::null(),
                GL_STREAM_READ,
            );
        }
        (gl.bind_buffer)(GL_PIXEL_PACK_BUFFER, 0);
        e.fbo = fbo;
        e.tamanho = (w, h);
        e.pbos = pbos;
        e.lendo.clear();
        FBO.store(fbo, Ordering::Relaxed);
    }
    Ok(())
}

/// O núcleo terminou um quadro de `largura`×`altura` no framebuffer: começa a lê-lo (sem esperar) e devolve, em
/// `destino` (RGBA, a origem em cima), o quadro mais velho que já ficou pronto. `true` = `destino` tem quadro novo.
/// `embaixo` = o núcleo desenha com a origem embaixo (o normal do OpenGL): a imagem é virada aqui.
pub fn quadro(largura: u32, altura: u32, embaixo: bool, destino: &mut Vec<u8>, dim: &mut (u32, u32)) -> bool {
    let inicio = std::time::Instant::now();
    let r = quadro_de_fato(largura, altura, embaixo, destino, dim);
    LEITURA_US.fetch_add(inicio.elapsed().as_micros() as u64, Ordering::Relaxed);
    r
}

fn quadro_de_fato(largura: u32, altura: u32, embaixo: bool, destino: &mut Vec<u8>, dim: &mut (u32, u32)) -> bool {
    let mut g = estado();
    let Some(e) = g.as_mut() else { return false };
    let (w, h) = (
        largura.min(e.tamanho.0 as u32) as i32,
        altura.min(e.tamanho.1 as u32) as i32,
    );
    if w <= 0 || h <= 0 || e.pbos.is_empty() {
        return false;
    }
    let gl = &e.gl;
    let mut pronto = false;
    // SAFETY: contexto corrente; PBOs do tamanho máximo; o mapeamento só é lido dentro do tamanho pedido
    unsafe {
        // 1. começa a ler este quadro num buffer livre
        let pbo = e.pbos[e.proximo % e.pbos.len()];
        e.proximo += 1;
        (gl.bind_framebuffer)(GL_READ_FRAMEBUFFER, e.fbo);
        (gl.pixel_storei)(GL_PACK_ALIGNMENT, 1);
        (gl.bind_buffer)(GL_PIXEL_PACK_BUFFER, pbo);
        (gl.read_pixels)(0, 0, w, h, GL_RGBA, GL_UNSIGNED_BYTE, std::ptr::null_mut());
        let cerca = (gl.fence_sync)(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        e.lendo.push_back(Leitura {
            pbo,
            cerca,
            largura: w,
            altura: h,
        });
        // 2. entrega o mais velho que terminou (com 3 em rodízio, o de 2 quadros atrás quase sempre já está pronto;
        // se a fila encheu, espera o mais velho: nunca acumula atraso)
        while let Some(l) = e.lendo.front() {
            let cheio = e.lendo.len() >= e.pbos.len();
            let espera = if cheio { 50_000_000 } else { 0 };
            let r = (gl.client_wait_sync)(l.cerca, GL_SYNC_FLUSH_COMMANDS_BIT, espera);
            if r == GL_TIMEOUT_EXPIRED && !cheio {
                break;
            }
            let l = e.lendo.pop_front().expect("tem");
            (gl.delete_sync)(l.cerca);
            (gl.bind_buffer)(GL_PIXEL_PACK_BUFFER, l.pbo);
            let n = (l.largura * l.altura * 4) as usize;
            let p = (gl.map_buffer_range)(GL_PIXEL_PACK_BUFFER, 0, n as isize, GL_MAP_READ_BIT) as *const u8;
            if !p.is_null() {
                let src = std::slice::from_raw_parts(p, n);
                destino.resize(n, 0);
                let linha = (l.largura * 4) as usize;
                for y in 0..l.altura as usize {
                    let de = if embaixo { l.altura as usize - 1 - y } else { y };
                    destino[y * linha..(y + 1) * linha].copy_from_slice(&src[de * linha..(de + 1) * linha]);
                }
                (gl.unmap_buffer)(GL_PIXEL_PACK_BUFFER);
                *dim = (l.largura as u32, l.altura as u32);
                pronto = true;
            }
            if !cheio {
                break;
            }
        }
        (gl.bind_buffer)(GL_PIXEL_PACK_BUFFER, 0);
        (gl.bind_framebuffer)(GL_FRAMEBUFFER, e.fbo);
    }
    let _ = &e.plataforma;
    pronto
}

// ---------------------------------------------------------------------------------------------------------------------
#[cfg(not(windows))]
mod plataforma {
    //! Linux: EGL (vem com o driver: Mesa, NVIDIA, AMD). Sem janela: superfície 1×1 (pbuffer) ou nenhuma
    //! (surfaceless), com a tela do usuário (X11/Wayland) ou sem tela nenhuma (CI).
    use super::*;
    use std::sync::OnceLock;

    type Pv = *const c_void;
    struct Egl {
        _lib: libloading::Library,
        get_proc_address: unsafe extern "C" fn(*const c_char) -> Pv,
    }
    // SAFETY: só ponteiros de função de uma biblioteca que nunca sai da memória
    unsafe impl Send for Egl {}
    unsafe impl Sync for Egl {}
    static EGL: OnceLock<Egl> = OnceLock::new();
    static LIBGL: OnceLock<Option<libloading::Library>> = OnceLock::new();

    pub struct Contexto {
        _display: Pv,
        _contexto: Pv,
    }

    pub fn funcao(nome: &CStr) -> *const c_void {
        let Some(e) = EGL.get() else { return std::ptr::null() };
        // SAFETY: eglGetProcAddress com string terminada em zero
        let p = unsafe { (e.get_proc_address)(nome.as_ptr()) };
        if !p.is_null() {
            return p;
        }
        // drivers antigos não dão as funções do OpenGL 1.x pelo eglGetProcAddress: pega da libGL
        let gl = LIBGL.get_or_init(|| {
            // SAFETY: biblioteca do sistema
            unsafe { libloading::Library::new("libGL.so.1").or_else(|_| libloading::Library::new("libOpenGL.so.0")) }
                .ok()
        });
        gl.as_ref()
            // SAFETY: símbolo pelo nome; o tipo é decidido por quem chama
            .and_then(|l| unsafe { l.get::<unsafe extern "C" fn()>(nome.to_bytes_with_nul()) }.ok())
            .map(|s| *s as *const c_void)
            .unwrap_or(std::ptr::null())
    }

    const EGL_NONE: i32 = 0x3038;
    const EGL_SURFACE_TYPE: i32 = 0x3033;
    const EGL_PBUFFER_BIT: i32 = 0x0001;
    const EGL_RENDERABLE_TYPE: i32 = 0x3040;
    const EGL_OPENGL_BIT: i32 = 0x0008;
    const EGL_RED_SIZE: i32 = 0x3024;
    const EGL_GREEN_SIZE: i32 = 0x3023;
    const EGL_BLUE_SIZE: i32 = 0x3022;
    const EGL_ALPHA_SIZE: i32 = 0x3021;
    const EGL_WIDTH: i32 = 0x3057;
    const EGL_HEIGHT: i32 = 0x3056;
    const EGL_OPENGL_API: u32 = 0x30A2;
    const EGL_CONTEXT_MAJOR_VERSION: i32 = 0x3098;
    const EGL_CONTEXT_MINOR_VERSION: i32 = 0x30FB;
    const EGL_CONTEXT_OPENGL_PROFILE_MASK: i32 = 0x30FD;
    const EGL_PLATFORM_SURFACELESS_MESA: u32 = 0x31DD;

    impl Contexto {
        pub fn criar(major: u32, minor: u32, core: bool) -> Result<Contexto, String> {
            // SAFETY: libEGL do sistema; as funções com as assinaturas do egl.h, chamadas na ordem do padrão
            unsafe {
                let lib = libloading::Library::new("libEGL.so.1")
                    .map_err(|e| format!("sem libEGL (o driver de vídeo não tem EGL?): {e}"))?;
                macro_rules! f {
                    ($n:literal, $t:ty) => {
                        *lib.get::<$t>(concat!($n, "\0").as_bytes())
                            .map_err(|e| format!("EGL sem {}: {e}", $n))?
                    };
                }
                let get_display = f!("eglGetDisplay", unsafe extern "C" fn(Pv) -> Pv);
                let get_platform_display = lib
                    .get::<unsafe extern "C" fn(u32, Pv, *const isize) -> Pv>(b"eglGetPlatformDisplay\0")
                    .ok()
                    .map(|s| *s);
                let initialize = f!("eglInitialize", unsafe extern "C" fn(Pv, *mut i32, *mut i32) -> u32);
                let bind_api = f!("eglBindAPI", unsafe extern "C" fn(u32) -> u32);
                let choose = f!(
                    "eglChooseConfig",
                    unsafe extern "C" fn(Pv, *const i32, *mut Pv, i32, *mut i32) -> u32
                );
                let create_context = f!("eglCreateContext", unsafe extern "C" fn(Pv, Pv, Pv, *const i32) -> Pv);
                let create_pbuffer = f!(
                    "eglCreatePbufferSurface",
                    unsafe extern "C" fn(Pv, Pv, *const i32) -> Pv
                );
                let make_current = f!("eglMakeCurrent", unsafe extern "C" fn(Pv, Pv, Pv, Pv) -> u32);
                let get_error = f!("eglGetError", unsafe extern "C" fn() -> i32);
                let gpa = f!("eglGetProcAddress", unsafe extern "C" fn(*const c_char) -> Pv);

                // com tela (a sessão do usuário) o EGL padrão pega a placa de verdade; sem tela (CI), o surfaceless
                let com_tela = std::env::var_os("DISPLAY").is_some() || std::env::var_os("WAYLAND_DISPLAY").is_some();
                let mut displays: Vec<Pv> = Vec::new();
                let sem_tela = || {
                    get_platform_display.map(|g| g(EGL_PLATFORM_SURFACELESS_MESA, std::ptr::null(), std::ptr::null()))
                };
                if com_tela {
                    displays.push(get_display(std::ptr::null()));
                    displays.extend(sem_tela());
                } else {
                    displays.extend(sem_tela());
                    displays.push(get_display(std::ptr::null()));
                }
                let mut erros = Vec::new();
                for d in displays.into_iter().filter(|d| !d.is_null()) {
                    let (mut ma, mut mi) = (0, 0);
                    if initialize(d, &mut ma, &mut mi) == 0 {
                        erros.push(format!("eglInitialize 0x{:x}", get_error()));
                        continue;
                    }
                    if bind_api(EGL_OPENGL_API) == 0 {
                        erros.push("sem a API OpenGL no EGL".into());
                        continue;
                    }
                    let atributos = [
                        EGL_SURFACE_TYPE,
                        EGL_PBUFFER_BIT,
                        EGL_RENDERABLE_TYPE,
                        EGL_OPENGL_BIT,
                        EGL_RED_SIZE,
                        8,
                        EGL_GREEN_SIZE,
                        8,
                        EGL_BLUE_SIZE,
                        8,
                        EGL_ALPHA_SIZE,
                        8,
                        EGL_NONE,
                    ];
                    let (mut cfg, mut n): (Pv, i32) = (std::ptr::null(), 0);
                    if choose(d, atributos.as_ptr(), &mut cfg, 1, &mut n) == 0 || n < 1 {
                        erros.push("nenhuma configuração OpenGL com pbuffer".into());
                        continue;
                    }
                    let mut ctx_attr = vec![
                        EGL_CONTEXT_MAJOR_VERSION,
                        major as i32,
                        EGL_CONTEXT_MINOR_VERSION,
                        minor as i32,
                    ];
                    if core {
                        ctx_attr.extend([EGL_CONTEXT_OPENGL_PROFILE_MASK, 1]);
                    }
                    ctx_attr.push(EGL_NONE);
                    let ctx = create_context(d, cfg, std::ptr::null(), ctx_attr.as_ptr());
                    if ctx.is_null() {
                        erros.push(format!("eglCreateContext {major}.{minor} 0x{:x}", get_error()));
                        continue;
                    }
                    let pb = create_pbuffer(d, cfg, [EGL_WIDTH, 1, EGL_HEIGHT, 1, EGL_NONE].as_ptr());
                    if make_current(d, pb, pb, ctx) == 0 {
                        erros.push(format!("eglMakeCurrent 0x{:x}", get_error()));
                        continue;
                    }
                    let _ = EGL.set(Egl {
                        _lib: lib,
                        get_proc_address: gpa,
                    });
                    tracing::info!(target: "nucleo", "OpenGL {major}.{minor} sem janela (EGL {ma}.{mi})");
                    return Ok(Contexto {
                        _display: d,
                        _contexto: ctx,
                    });
                }
                Err(format!("o EGL não deu um OpenGL {major}.{minor}: {}", erros.join("; ")))
            }
        }
    }
}

#[cfg(windows)]
mod plataforma {
    //! Windows: uma janela que nunca aparece, com o OpenGL dela (WGL); o perfil core sai pelo
    //! wglCreateContextAttribsARB. As funções do OpenGL 1.1 vêm do opengl32.dll, as outras do wglGetProcAddress.
    use super::*;
    type H = *mut c_void;

    #[repr(C)]
    struct Pfd {
        n_size: u16,
        n_version: u16,
        dw_flags: u32,
        i_pixel_type: u8,
        c_color_bits: u8,
        /// cRedBits..cAccumAlphaBits (13 bytes)
        resto: [u8; 13],
        c_depth_bits: u8,
        c_stencil_bits: u8,
        c_aux_buffers: u8,
        i_layer_type: u8,
        b_reserved: u8,
        dw_layer_mask: u32,
        dw_visible_mask: u32,
        dw_damage_mask: u32,
    }
    #[repr(C)]
    struct WndClassW {
        style: u32,
        wnd_proc: unsafe extern "system" fn(H, u32, usize, isize) -> isize,
        cb_cls_extra: i32,
        cb_wnd_extra: i32,
        h_instance: H,
        h_icon: H,
        h_cursor: H,
        hbr_background: H,
        menu_name: *const u16,
        class_name: *const u16,
    }
    #[link(name = "user32")]
    extern "system" {
        fn RegisterClassW(c: *const WndClassW) -> u16;
        fn CreateWindowExW(
            ex: u32,
            cls: *const u16,
            nome: *const u16,
            st: u32,
            x: i32,
            y: i32,
            w: i32,
            h: i32,
            pai: H,
            menu: H,
            inst: H,
            p: H,
        ) -> H;
        fn DefWindowProcW(h: H, m: u32, w: usize, l: isize) -> isize;
        fn GetDC(h: H) -> H;
    }
    #[link(name = "gdi32")]
    extern "system" {
        fn ChoosePixelFormat(dc: H, p: *const Pfd) -> i32;
        fn SetPixelFormat(dc: H, f: i32, p: *const Pfd) -> i32;
    }
    #[link(name = "opengl32")]
    extern "system" {
        fn wglCreateContext(dc: H) -> H;
        fn wglMakeCurrent(dc: H, c: H) -> i32;
        fn wglDeleteContext(c: H) -> i32;
        fn wglGetProcAddress(n: *const c_char) -> *const c_void;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn GetModuleHandleW(n: *const u16) -> H;
        fn GetProcAddress(m: H, n: *const c_char) -> *const c_void;
        fn LoadLibraryW(n: *const u16) -> H;
    }
    unsafe extern "system" fn proc_janela(h: H, m: u32, w: usize, l: isize) -> isize {
        // SAFETY: repassa pro padrão do Windows
        unsafe { DefWindowProcW(h, m, w, l) }
    }
    fn largo(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub struct Contexto {
        _dc: H,
        _rc: H,
    }

    pub fn funcao(nome: &CStr) -> *const c_void {
        // SAFETY: nome terminado em zero; o opengl32 está carregado (link)
        unsafe {
            let p = wglGetProcAddress(nome.as_ptr());
            if !(p.is_null() || [1, 2, 3, usize::MAX].contains(&(p as usize))) {
                return p;
            }
            let m = LoadLibraryW(largo("opengl32.dll").as_ptr());
            GetProcAddress(m, nome.as_ptr())
        }
    }

    const WGL_CONTEXT_MAJOR_VERSION_ARB: i32 = 0x2091;
    const WGL_CONTEXT_MINOR_VERSION_ARB: i32 = 0x2092;
    const WGL_CONTEXT_PROFILE_MASK_ARB: i32 = 0x9126;

    impl Contexto {
        pub fn criar(major: u32, minor: u32, core: bool) -> Result<Contexto, String> {
            // SAFETY: chamadas do Win32/WGL na ordem documentada; a janela nunca é mostrada
            unsafe {
                let inst = GetModuleHandleW(std::ptr::null());
                let classe = largo("KofNativoGl");
                let wc = WndClassW {
                    style: 0x20, // CS_OWNDC
                    wnd_proc: proc_janela,
                    cb_cls_extra: 0,
                    cb_wnd_extra: 0,
                    h_instance: inst,
                    h_icon: std::ptr::null_mut(),
                    h_cursor: std::ptr::null_mut(),
                    hbr_background: std::ptr::null_mut(),
                    menu_name: std::ptr::null(),
                    class_name: classe.as_ptr(),
                };
                RegisterClassW(&wc);
                let h = CreateWindowExW(
                    0,
                    classe.as_ptr(),
                    classe.as_ptr(),
                    0,
                    0,
                    0,
                    16,
                    16,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    inst,
                    std::ptr::null_mut(),
                );
                if h.is_null() {
                    return Err("o Windows não criou a janela escondida do OpenGL".into());
                }
                let dc = GetDC(h);
                let pfd = Pfd {
                    n_size: std::mem::size_of::<Pfd>() as u16,
                    n_version: 1,
                    dw_flags: 0x4 | 0x20 | 0x1, // DRAW_TO_WINDOW | SUPPORT_OPENGL | DOUBLEBUFFER
                    i_pixel_type: 0,
                    c_color_bits: 32,
                    resto: [0; 13],
                    c_depth_bits: 24,
                    c_stencil_bits: 8,
                    c_aux_buffers: 0,
                    i_layer_type: 0,
                    b_reserved: 0,
                    dw_layer_mask: 0,
                    dw_visible_mask: 0,
                    dw_damage_mask: 0,
                };
                let f = ChoosePixelFormat(dc, &pfd);
                if f == 0 || SetPixelFormat(dc, f, &pfd) == 0 {
                    return Err("o Windows não deu um formato de pixel com OpenGL".into());
                }
                let velho = wglCreateContext(dc);
                if velho.is_null() || wglMakeCurrent(dc, velho) == 0 {
                    return Err("o driver de vídeo não criou um contexto OpenGL".into());
                }
                type Cria = unsafe extern "system" fn(H, H, *const i32) -> H;
                let cria = wglGetProcAddress(c"wglCreateContextAttribsARB".as_ptr());
                let mut rc = velho;
                if !cria.is_null() {
                    let cria: Cria = std::mem::transmute(cria);
                    let mut a = vec![
                        WGL_CONTEXT_MAJOR_VERSION_ARB,
                        major as i32,
                        WGL_CONTEXT_MINOR_VERSION_ARB,
                        minor as i32,
                    ];
                    if core {
                        a.extend([WGL_CONTEXT_PROFILE_MASK_ARB, 1]);
                    }
                    a.push(0);
                    let novo = cria(dc, std::ptr::null_mut(), a.as_ptr());
                    if !novo.is_null() {
                        wglMakeCurrent(dc, novo);
                        wglDeleteContext(velho);
                        rc = novo;
                    } else if core {
                        return Err(format!("o driver de vídeo não tem OpenGL {major}.{minor} core"));
                    }
                }
                tracing::info!(target: "nucleo", "OpenGL {major}.{minor} sem janela (WGL)");
                Ok(Contexto { _dc: dc, _rc: rc })
            }
        }
    }
}
