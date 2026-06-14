#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!());

    if let Err(error) = result {
        eprintln!("Lofi Engine failed to start: {error}");
        std::process::exit(1);
    }
}