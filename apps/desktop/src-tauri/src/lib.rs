mod commands;
pub mod database;

use commands::local_finance::apply_local_mutation;
use database::{
    key::{load_or_create, WindowsCredentialStore},
    DatabaseState, EncryptedDatabase,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let application_data = app.path().app_data_dir()?;
            let key = load_or_create(&WindowsCredentialStore)?;
            let database = EncryptedDatabase::open(
                &application_data.join("orbe.sqlite3"),
                &application_data.join("backups"),
                key.expose_bytes(),
            )?;
            app.manage(DatabaseState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![apply_local_mutation])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
