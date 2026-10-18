use super::guardrails::{validate_path, Access};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};

pub const MAX_FILE_BYTES: u64 = 10 * 1024 * 1024;
type Key = (String, PathBuf);
static OBSERVED: LazyLock<Mutex<HashMap<Key, [u8; 32]>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
pub static MUTATIONS: Mutex<()> = Mutex::new(());
static NEXT_TEMP: AtomicU64 = AtomicU64::new(0);

pub fn open_regular(path: &Path) -> Result<File, String> {
    if !fs::metadata(path).map_err(|e| e.to_string())?.is_file() {
        return Err("Expected a regular file".into());
    }
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK);
    }
    let file = options.open(path).map_err(|e| e.to_string())?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err("Expected a regular file".into());
    }
    Ok(file)
}

pub fn digest(path: &Path) -> Result<[u8; 32], String> {
    let file = open_regular(path)?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err("Expected a regular file".into());
    }
    let mut reader = file.take(MAX_FILE_BYTES + 1);
    let mut hasher = Sha256::new();
    let mut total = 0;
    let mut buf = [0; 8192];
    loop {
        let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        total += n as u64;
        if total > MAX_FILE_BYTES {
            return Err(format!(
                "File exceeds {MAX_FILE_BYTES} bytes; cannot safely mutate it"
            ));
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher.finalize().into())
}

pub fn observe(scope: &str, path: &Path, hash: [u8; 32]) {
    OBSERVED
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert((scope.into(), path.into()), hash);
}

pub fn forget_session(scope: &str) {
    OBSERVED
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .retain(|(session, _), _| session != scope);
}

pub fn expected(scope: &str, path: &Path) -> Result<Option<[u8; 32]>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let hash = OBSERVED
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(&(scope.into(), path.into()))
        .copied()
        .ok_or("Read the existing file in this session before modifying it")?;
    if digest(path)? != hash {
        return Err("File changed since it was read; read it again before modifying it".into());
    }
    Ok(Some(hash))
}

struct TempFile(PathBuf);
impl Drop for TempFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

pub fn commit(
    root: &Path,
    input: &str,
    target: &Path,
    expected: Option<[u8; 32]>,
    content: &[u8],
    cancelled: Option<&AtomicBool>,
) -> Result<(), String> {
    if content.len() as u64 > MAX_FILE_BYTES {
        return Err(format!("Content exceeds {MAX_FILE_BYTES} bytes"));
    }
    let parent = target.parent().ok_or("Missing parent directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    if validate_path(root, input, Access::Write)? != target {
        return Err("Target changed during operation".into());
    }
    let mut staged = None;
    for _ in 0..100 {
        let path = parent.join(format!(
            ".unfuse-{}-{}.tmp",
            std::process::id(),
            NEXT_TEMP.fetch_add(1, Ordering::Relaxed)
        ));
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        match options.open(&path) {
            Ok(file) => {
                staged = Some((TempFile(path), file));
                break;
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e.to_string()),
        }
    }
    let (temp, mut file) = staged.ok_or("Could not allocate temporary file")?;
    file.write_all(content)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    if let Some(hash) = expected {
        if digest(target)? != hash {
            return Err("File changed before commit; read it again".into());
        }
        let permissions = fs::metadata(target)
            .map_err(|e| e.to_string())?
            .permissions();
        fs::set_permissions(&temp.0, permissions).map_err(|e| e.to_string())?;
    } else if target.exists() {
        return Err("File was created by another operation; read it before overwriting".into());
    }
    if validate_path(root, input, Access::Write)? != target {
        return Err("Target changed before commit".into());
    }
    if cancelled.is_some_and(|flag| flag.load(Ordering::SeqCst)) {
        return Err("Mutation cancelled before commit".into());
    }
    drop(file);
    // link/create is no-clobber; replacement is atomic on the local filesystem.
    if expected.is_none() {
        fs::hard_link(&temp.0, target).map_err(|e| e.to_string())?;
    } else {
        fs::rename(&temp.0, target).map_err(|e| e.to_string())?;
    }
    Ok(())
}
