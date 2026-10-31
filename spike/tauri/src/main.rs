//! Casca A do spike: Tauri 2. A página chama `app_info`, `falhar` (pra provar o erro tratado) e `relatorio`
//! (grava o resultado da bancada em $KOF_RELATORIO e fecha).
use kof_core::{AppInfo, ContractError, KofError};

#[tauri::command]
fn app_info() -> AppInfo {
    kof_core::info::app_info(&std::env::temp_dir().join("kof-spike-dados"))
}

#[tauri::command]
fn falhar() -> Result<(), ContractError> {
    Err(ContractError::from(&KofError::ComandoDesconhecido("falhar".into())))
}

#[tauri::command]
fn relatorio(app: tauri::AppHandle, json: String) {
    if let Ok(p) = std::env::var("KOF_RELATORIO") {
        let _ = std::fs::write(p, json);
        app.exit(0);
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // WebKitGTK vem com WebRTC e mídia desligados: liga (o "Jogar no PC" precisa)
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.with_webview(|wv| {
                        use webkit2gtk::{SettingsExt, WebViewExt};
                        if let Some(s) = wv.inner().settings() {
                            s.set_enable_webrtc(true);
                            s.set_enable_media_stream(true);
                            s.set_enable_mediasource(true);
                            s.set_hardware_acceleration_policy(webkit2gtk::HardwareAccelerationPolicy::Always);
                        }
                    });
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_info, falhar, relatorio])
        .run(tauri::generate_context!())
        .expect("Tauri não abriu");
}
