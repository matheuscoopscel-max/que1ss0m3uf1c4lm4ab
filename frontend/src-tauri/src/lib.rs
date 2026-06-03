// FILE: frontend/src-tauri/src/lib.rs
// Builder da aplicação Tauri.
// Registra plugins nativos e comandos customizados futuros.

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Injeta __TAURI_PLATFORM__ na janela principal para detecção no frontend
            let window = app.get_webview_window("main").unwrap();
            window.eval("window.__TAURI__ = window.__TAURI__ || {};")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar a aplicação OmniMedia");
}
