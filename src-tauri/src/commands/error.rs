use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "error", content = "message")]
pub enum CommandError {
    #[error("Pro license required: {0}")]
    ProRequired(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Invalid application state: {0}")]
    InvalidState(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Memory limit reached: {0}")]
    MemoryLimitReached(String),

    #[error("IO error: {0}")]
    Io(String),
}

impl From<std::io::Error> for CommandError {
    fn from(err: std::io::Error) -> Self {
        CommandError::Io(err.to_string())
    }
}
