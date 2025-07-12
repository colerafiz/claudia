use serde::{Deserialize, Serialize};
use std::process::Command;
use anyhow::{Result, anyhow};
use super::claude::get_claude_dir;
use git2::Repository;

#[derive(Debug, Serialize, Deserialize)]
pub struct Issue {
    repo: String,
    number: i32,
    title: String,
    url: String,
    state: String,
    labels: Vec<String>,
}

/// Lists all GitHub issues from repositories in ~/.claude/projects
#[tauri::command]
pub async fn list_issues() -> Result<Vec<Issue>, String> {
    log::info!("Listing GitHub issues from ~/.claude/projects");

    let claude_dir = get_claude_dir().map_err(|e| e.to_string())?;
    let projects_dir = claude_dir.join("projects");

    if !projects_dir.exists() {
        log::warn!("Projects directory does not exist: {:?}", projects_dir);
        return Ok(Vec::new());
    }

    let mut all_issues = Vec::new();
    let entries = std::fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            // Try to open as git repository
            if let Ok(repo) = Repository::open(&path) {
                // Check if it has a GitHub remote
                if let Ok(remote) = repo.find_remote("origin") {
                    if let Some(url) = remote.url() {
                        if url.contains("github.com") {
                            // Extract owner/repo from GitHub URL
                            let repo_path = url
                                .trim_end_matches(".git")
                                .split("github.com/")
                                .nth(1)
                                .ok_or_else(|| "Invalid GitHub URL".to_string())?
                                .to_string();

                            // Use gh api to fetch issues
                            let output = Command::new("gh")
                                .args(["api", &format!("repos/{}/issues", repo_path)])
                                .output()
                                .map_err(|e| format!("Failed to execute gh command: {}", e))?;

                            if output.status.success() {
                                let issues_json = String::from_utf8(output.stdout)
                                    .map_err(|e| format!("Invalid UTF-8 in gh output: {}", e))?;

                                let issues: Vec<serde_json::Value> = serde_json::from_str(&issues_json)
                                    .map_err(|e| format!("Failed to parse gh output: {}", e))?;

                                for issue in issues {
                                    if let (Some(number), Some(title), Some(url), Some(state)) = (
                                        issue["number"].as_i64(),
                                        issue["title"].as_str(),
                                        issue["html_url"].as_str(),
                                        issue["state"].as_str(),
                                    ) {
                                        let labels = issue["labels"]
                                            .as_array()
                                            .map(|labels| {
                                                labels
                                                    .iter()
                                                    .filter_map(|label| label["name"].as_str())
                                                    .map(String::from)
                                                    .collect()
                                            })
                                            .unwrap_or_default();

                                        all_issues.push(Issue {
                                            repo: repo_path.clone(),
                                            number: number as i32,
                                            title: title.to_string(),
                                            url: url.to_string(),
                                            state: state.to_string(),
                                            labels,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(all_issues)
}