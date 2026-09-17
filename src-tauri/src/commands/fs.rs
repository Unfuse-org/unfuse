use std::fs;
use std::path::Path;
use crate::commands::error::CommandError;

#[tauri::command]
pub async fn read_file(
    path: String,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<String, CommandError> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(CommandError::Io(format!("File not found: {}", path)));
    }

    let content = fs::read_to_string(file_path)?;

    if let (Some(start), Some(end)) = (start_line, end_line) {
        if start > end {
            return Err(CommandError::InvalidInput("start_line must be <= end_line".into()));
        }
        let lines: Vec<&str> = content.lines().collect();
        let start_idx = if start > 0 { start - 1 } else { 0 };
        let end_idx = std::cmp::min(end, lines.len());

        if start_idx >= lines.len() {
            return Ok(String::new());
        }

        let slice = &lines[start_idx..end_idx];
        Ok(slice.join("\n"))
    } else {
        Ok(content)
    }
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), CommandError> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }

    fs::write(file_path, content)?;
    Ok(())
}

#[tauri::command]
pub async fn replace_file_content(
    path: String,
    target_content: String,
    replacement_content: String,
) -> Result<(), CommandError> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(CommandError::Io(format!("File not found: {}", path)));
    }

    let content = fs::read_to_string(file_path)?;
    let matches: Vec<_> = content.match_indices(&target_content).collect();

    if matches.is_empty() {
        return Err(CommandError::InvalidInput(format!(
            "Target content not found in {}",
            path
        )));
    }

    if matches.len() > 1 {
        return Err(CommandError::InvalidInput(format!(
            "Target content occurs multiple times ({}) in {}",
            matches.len(),
            path
        )));
    }

    let updated = content.replacen(&target_content, &replacement_content, 1);
    fs::write(file_path, updated)?;
    Ok(())
}
