use super::{
    guardrails::{validate_path, Access},
    mutation,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Replacement {
    pub old_text: String,
    pub new_text: String,
}

pub fn edit_file(
    root: &Path,
    scope: &str,
    path: &str,
    edits: &[Replacement],
    cancelled: Option<&AtomicBool>,
) -> Result<String, String> {
    if edits.is_empty() || edits.len() > 100 {
        return Err("Provide between 1 and 100 replacements".into());
    }
    let _lock = mutation::MUTATIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let target = validate_path(root, path, Access::Write)?;
    let expected = mutation::expected(scope, &target)?
        .ok_or("File does not exist; use write_file to create it")?;
    let mut bytes = Vec::new();
    mutation::open_regular(&target)?
        .take(mutation::MAX_FILE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > mutation::MAX_FILE_BYTES {
        return Err("File exceeds edit size limit".into());
    }
    let source = String::from_utf8(bytes).map_err(|_| "Edit supports UTF-8 text only")?;
    if source.contains('\0') {
        return Err("Cannot edit binary content".into());
    }
    if <[u8; 32]>::from(Sha256::digest(source.as_bytes())) != expected {
        return Err("File changed; read it again".into());
    }
    let mut ranges = Vec::new();
    for edit in edits {
        if edit.old_text.is_empty() {
            return Err("old_text cannot be empty".into());
        }
        if edit.old_text == edit.new_text {
            return Err("Replacement makes no change".into());
        }
        let start = source
            .find(&edit.old_text)
            .ok_or("old_text was not found; read the file and match its exact text")?;
        let next = start
            + edit
                .old_text
                .chars()
                .next()
                .ok_or("old_text cannot be empty")?
                .len_utf8();
        if source[next..].contains(&edit.old_text) {
            return Err("old_text appears multiple times; include more surrounding text".into());
        }
        ranges.push((start, start + edit.old_text.len(), &edit.new_text));
    }
    ranges.sort_by_key(|r| r.0);
    if ranges.windows(2).any(|pair| pair[0].1 > pair[1].0) {
        return Err("Replacements overlap; no changes written".into());
    }
    let mut updated = source.clone();
    for (start, end, replacement) in ranges.into_iter().rev() {
        updated.replace_range(start..end, replacement);
    }
    if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
        return Err("Mutation cancelled before commit".into());
    }
    mutation::commit(
        root,
        path,
        &target,
        Some(expected),
        updated.as_bytes(),
        cancelled,
    )?;
    mutation::observe(scope, &target, Sha256::digest(updated.as_bytes()).into());
    let mut preview = format!(
        "Successfully edited '{path}' ({} replacements)\n",
        edits.len()
    );
    for edit in edits {
        preview.push_str("@@ replacement @@\n");
        for (prefix, text) in [("-", &edit.old_text), ("+", &edit.new_text)] {
            for line in text.lines() {
                if preview.len() > 8000 {
                    preview.push_str("[Diff preview truncated]\n");
                    return Ok(preview);
                }
                let end = line
                    .char_indices()
                    .map(|(i, _)| i)
                    .take_while(|i| *i <= 1000)
                    .last()
                    .unwrap_or(0);
                let snippet = if line.len() > 1000 {
                    &line[..end]
                } else {
                    line
                };
                preview.push_str(&format!("{prefix}{snippet}\n"));
            }
        }
    }
    Ok(preview)
}
