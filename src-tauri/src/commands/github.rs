use std::process::Command;
use serde::Deserialize;

#[tauri::command]
pub async fn run_gh_command(args: Vec<String>) -> Result<String, String> {
    let output = Command::new("gh")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .map_err(|e| e.to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}