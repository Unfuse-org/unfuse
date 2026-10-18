use super::{
    guardrails::{validate_path, Access},
    mutation,
};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

pub fn write_file(
    root: &Path,
    scope: &str,
    path: &str,
    content: &str,
    cancelled: Option<&AtomicBool>,
) -> Result<String, String> {
    if content.contains('\0') {
        return Err("write_file supports text, not binary content".into());
    }
    let _lock = mutation::MUTATIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let target = validate_path(root, path, Access::Write)?;
    let expected = mutation::expected(scope, &target)?;
    if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
        return Err("Mutation cancelled before commit".into());
    }
    mutation::commit(root, path, &target, expected, content.as_bytes(), cancelled)?;
    mutation::observe(scope, &target, Sha256::digest(content.as_bytes()).into());
    Ok(format!(
        "Successfully wrote {} bytes to '{path}' ({})",
        content.len(),
        if expected.is_some() {
            "replaced"
        } else {
            "created"
        }
    ))
}
