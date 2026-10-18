use super::{
    guardrails::{validate_path, Access},
    mutation,
};
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

const MAX_OUTPUT: usize = 64 * 1024;
const MAX_LINE: usize = 16 * 1024;
const MAX_LINES: usize = 2000;

pub fn read_file(
    root: &Path,
    scope: &str,
    path: &str,
    offset: Option<usize>,
    limit: Option<usize>,
    cancelled: Option<&AtomicBool>,
) -> Result<String, String> {
    let start = offset.unwrap_or(1);
    let count = limit.unwrap_or(MAX_LINES);
    if start == 0 || count == 0 || count > MAX_LINES {
        return Err(format!(
            "offset must be >= 1; limit must be between 1 and {MAX_LINES}"
        ));
    }
    let target = validate_path(root, path, Access::Read)?;
    if !target.exists() {
        return Err(format!("File not found: {path}"));
    }
    let file = mutation::open_regular(&target).map_err(|e| format!("Cannot read {path}: {e}"))?;
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    if !metadata.is_file() {
        return Err("Read expects a regular file".into());
    }
    let before = if metadata.len() <= mutation::MAX_FILE_BYTES {
        Some(mutation::digest(&target)?)
    } else {
        None
    };
    let mut reader = BufReader::new(file);
    let mut output = String::new();
    let mut number = 1usize;
    let mut returned = 0;
    loop {
        if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
            return Err("Read cancelled".into());
        }
        if reader.fill_buf().map_err(|e| e.to_string())?.is_empty() {
            break;
        }
        if number < start {
            reader.skip_until(b'\n').map_err(|e| e.to_string())?;
            number += 1;
            continue;
        }
        if returned == count {
            output.push_str(&format!("\n[More content; continue with offset={number}]"));
            break;
        }
        let mut raw = Vec::new();
        reader
            .by_ref()
            .take((MAX_LINE + 1) as u64)
            .read_until(b'\n', &mut raw)
            .map_err(|e| e.to_string())?;
        let long = raw.len() > MAX_LINE && raw.last() != Some(&b'\n');
        if long {
            reader.skip_until(b'\n').map_err(|e| e.to_string())?;
        }
        if raw.contains(&0) {
            return Err("Binary content is unsupported by the text read tool".into());
        }
        if raw.last() == Some(&b'\n') {
            raw.pop();
            if raw.last() == Some(&b'\r') {
                raw.pop();
            }
        }
        let text = match std::str::from_utf8(&raw) {
            Ok(s) => s,
            Err(e) if long && e.error_len().is_none() => {
                std::str::from_utf8(&raw[..e.valid_up_to()]).map_err(|e| e.to_string())?
            }
            Err(_) => return Err("File is not valid UTF-8; encoding conversion is required".into()),
        };
        let entry = format!(
            "{number}: {text}{}\n",
            if long {
                " [line preview truncated]"
            } else {
                ""
            }
        );
        if output.len() + entry.len() > MAX_OUTPUT {
            output.push_str(&format!("\n[Output limit; continue with offset={number}]"));
            break;
        }
        output.push_str(&entry);
        returned += 1;
        number += 1;
    }
    if returned == 0 && start > 1 {
        return Err(format!("Offset {start} is beyond the end of {path}"));
    }
    if let Some(hash) = before {
        if mutation::digest(&target)? != hash {
            return Err("File changed during read; retry".into());
        }
        mutation::observe(scope, &target, hash);
    }
    if output.is_empty() {
        output = "[Empty file]".into();
    }
    Ok(format!("File: {path}\n{output}"))
}
