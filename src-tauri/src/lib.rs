#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!());

    if let Err(error) = result {
        eprintln!("LoFiTyan failed to start: {error}");
        std::process::exit(1);
    }
}