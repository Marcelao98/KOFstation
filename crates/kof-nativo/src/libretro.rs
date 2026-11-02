//! Tipos e constantes do `libretro.h` que o frontend usa (só o necessário; nomes do cabeçalho original).
#![allow(non_camel_case_types, dead_code)]
use std::ffi::{c_char, c_uint, c_void};

pub const RETRO_API_VERSION: c_uint = 1;

pub const RETRO_DEVICE_JOYPAD: c_uint = 1;
pub const RETRO_DEVICE_ANALOG: c_uint = 5;
pub const RETRO_DEVICE_ID_JOYPAD_MASK: c_uint = 256;
pub const RETRO_DEVICE_INDEX_ANALOG_LEFT: c_uint = 0;
pub const RETRO_DEVICE_INDEX_ANALOG_RIGHT: c_uint = 1;

pub const RETRO_MEMORY_SAVE_RAM: c_uint = 0;

pub const RETRO_PIXEL_FORMAT_0RGB1555: c_uint = 0;
pub const RETRO_PIXEL_FORMAT_XRGB8888: c_uint = 1;
pub const RETRO_PIXEL_FORMAT_RGB565: c_uint = 2;

/// `(void*)-1`: o núcleo desenhou na GPU (não suportado aqui).
pub const RETRO_HW_FRAME_BUFFER_VALID: usize = usize::MAX;

const EXP: c_uint = 0x10000;
pub const ENV_SET_ROTATION: c_uint = 1;
pub const ENV_GET_OVERSCAN: c_uint = 2;
pub const ENV_GET_CAN_DUPE: c_uint = 3;
pub const ENV_SET_MESSAGE: c_uint = 6;
pub const ENV_SHUTDOWN: c_uint = 7;
pub const ENV_SET_PERFORMANCE_LEVEL: c_uint = 8;
pub const ENV_GET_SYSTEM_DIRECTORY: c_uint = 9;
pub const ENV_SET_PIXEL_FORMAT: c_uint = 10;
pub const ENV_SET_INPUT_DESCRIPTORS: c_uint = 11;
pub const ENV_SET_DISK_CONTROL_INTERFACE: c_uint = 13;
pub const ENV_SET_HW_RENDER: c_uint = 14;
pub const ENV_GET_VARIABLE: c_uint = 15;
pub const ENV_SET_VARIABLES: c_uint = 16;
pub const ENV_GET_VARIABLE_UPDATE: c_uint = 17;
pub const ENV_SET_SUPPORT_NO_GAME: c_uint = 18;
pub const ENV_GET_LOG_INTERFACE: c_uint = 27;
pub const ENV_GET_CORE_ASSETS_DIRECTORY: c_uint = 30;
pub const ENV_GET_SAVE_DIRECTORY: c_uint = 31;
pub const ENV_SET_SYSTEM_AV_INFO: c_uint = 32;
pub const ENV_SET_CONTROLLER_INFO: c_uint = 35;
pub const ENV_SET_MEMORY_MAPS: c_uint = 36 | EXP;
pub const ENV_SET_GEOMETRY: c_uint = 37;
pub const ENV_GET_LANGUAGE: c_uint = 39;
pub const ENV_SET_SUPPORT_ACHIEVEMENTS: c_uint = 42 | EXP;
pub const ENV_SET_SERIALIZATION_QUIRKS: c_uint = 44;
pub const ENV_GET_AUDIO_VIDEO_ENABLE: c_uint = 47 | EXP;
pub const ENV_GET_INPUT_BITMASKS: c_uint = 51 | EXP;
pub const ENV_GET_CORE_OPTIONS_VERSION: c_uint = 52;
pub const ENV_SET_CORE_OPTIONS_DISPLAY: c_uint = 55;
pub const ENV_GET_MESSAGE_INTERFACE_VERSION: c_uint = 59;
pub const ENV_SET_MESSAGE_EXT: c_uint = 60;
pub const ENV_GET_INPUT_MAX_USERS: c_uint = 61;
pub const ENV_SET_CONTENT_INFO_OVERRIDE: c_uint = 65;
pub const ENV_SET_VARIABLE: c_uint = 70;

pub const RETRO_LANGUAGE_PORTUGUESE_BRAZIL: c_uint = 7;

#[repr(C)]
pub struct retro_system_info {
    pub library_name: *const c_char,
    pub library_version: *const c_char,
    pub valid_extensions: *const c_char,
    pub need_fullpath: bool,
    pub block_extract: bool,
}

#[repr(C)]
#[derive(Clone, Copy, Default, Debug)]
pub struct retro_game_geometry {
    pub base_width: c_uint,
    pub base_height: c_uint,
    pub max_width: c_uint,
    pub max_height: c_uint,
    pub aspect_ratio: f32,
}

#[repr(C)]
#[derive(Clone, Copy, Default, Debug)]
pub struct retro_system_timing {
    pub fps: f64,
    pub sample_rate: f64,
}

#[repr(C)]
#[derive(Clone, Copy, Default, Debug)]
pub struct retro_system_av_info {
    pub geometry: retro_game_geometry,
    pub timing: retro_system_timing,
}

#[repr(C)]
pub struct retro_game_info {
    pub path: *const c_char,
    pub data: *const c_void,
    pub size: usize,
    pub meta: *const c_char,
}

#[repr(C)]
pub struct retro_variable {
    pub key: *const c_char,
    pub value: *const c_char,
}

#[repr(C)]
pub struct retro_message {
    pub msg: *const c_char,
    pub frames: c_uint,
}

/// O `log` aponta pra ponte em C (`src/ponte.c`): o printf do núcleo é variádico e o Rust estável não define isso.
#[repr(C)]
pub struct retro_log_callback {
    pub log: *const c_void,
}

pub type EnvironmentFn = unsafe extern "C" fn(cmd: c_uint, data: *mut c_void) -> bool;
pub type VideoRefreshFn = unsafe extern "C" fn(data: *const c_void, w: c_uint, h: c_uint, pitch: usize);
pub type AudioSampleFn = unsafe extern "C" fn(l: i16, r: i16);
pub type AudioSampleBatchFn = unsafe extern "C" fn(data: *const i16, frames: usize) -> usize;
pub type InputPollFn = unsafe extern "C" fn();
pub type InputStateFn = unsafe extern "C" fn(port: c_uint, device: c_uint, index: c_uint, id: c_uint) -> i16;
