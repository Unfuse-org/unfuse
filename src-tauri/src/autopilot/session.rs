use std::sync::Mutex;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopilotSession {
    pub session_id: String,
    pub goal: String,
    pub iteration_count: u32,
    pub created_at: u64,
}

pub struct AutopilotManager {
    pub current_session: Mutex<Option<AutopilotSession>>,
}

impl AutopilotManager {
    pub fn new() -> Self {
        Self {
            current_session: Mutex::new(None),
        }
    }

    pub fn start_session(&self, goal: String) -> String {
        let mut session = self.current_session.lock().unwrap();
        let session_id = Uuid::new_v4().to_string();
        *session = Some(AutopilotSession {
            session_id: session_id.clone(),
            goal,
            iteration_count: 0,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
        session_id
    }
}
