use std::sync::Arc;

use dbx_core::storage::DesktopSettings;
use tauri::{AppHandle, Manager, State};

use super::connection::AppState;
use crate::{apply_desktop_tray_preference, WindowBehaviorState};

#[tauri::command]
pub async fn load_desktop_settings(state: State<'_, Arc<AppState>>) -> Result<DesktopSettings, String> {
    state.storage.load_desktop_settings().await
}

#[tauri::command]
pub async fn save_desktop_settings(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    settings: DesktopSettings,
) -> Result<(), String> {
    state.storage.save_desktop_settings(&settings).await?;
    if let Some(window_behavior) = app.try_state::<WindowBehaviorState>() {
        window_behavior.set_run_in_background(settings.run_in_background);
    }
    apply_desktop_tray_preference(&app, settings.run_in_background).map_err(|err| err.to_string())
}
