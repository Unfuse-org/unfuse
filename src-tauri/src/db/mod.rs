use std::path::{Path, PathBuf};
use crate::commands::CommandError;

pub struct DatabaseManager {
    _db_path: PathBuf,
}

impl DatabaseManager {
    pub fn new(db_path: &Path) -> Result<Self, CommandError> {
        Ok(Self {
            _db_path: db_path.to_path_buf(),
        })
    }
}
