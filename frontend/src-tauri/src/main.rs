// FILE: frontend/src-tauri/src/main.rs
// Ponto de entrada Tauri — mantido mínimo intencionalmente.
// Toda a lógica de UI vive no frontend React.
// Previne janela de console no Windows em builds release.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    omnimedia_lib::run()
}
