use crate::commands::CommandError;
use crate::license::VerifiedLicense;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopilotStepResult {
    pub success: bool,
    pub output: String,
    pub healed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditRecord {
    pub action: String,
    pub payload_hash: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub score: f32,
    pub snippet: String,
}

/// The abstraction implemented by both the real private engine and the public stub.
/// All privileged operations strictly require a `&VerifiedLicense` capability token,
/// which can ONLY be obtained by passing cryptographic Ed25519 signature verification.
pub trait ProEngine: Send + Sync {
    fn execute_autopilot_step(
        &self,
        goal: &str,
        license: &VerifiedLicense,
    ) -> Result<AutopilotStepResult, CommandError>;

    fn unlock_vault(
        &self,
        password: &str,
        license: &VerifiedLicense,
    ) -> Result<(), CommandError>;

    fn get_vault_secret(
        &self,
        service: &str,
        license: &VerifiedLicense,
    ) -> Result<Option<String>, CommandError>;

    fn save_vault_secret(
        &self,
        service: &str,
        secret: &str,
        license: &VerifiedLicense,
    ) -> Result<(), CommandError>;

    fn record_audit_hash(
        &self,
        record: &AuditRecord,
        license: &VerifiedLicense,
    ) -> Result<String, CommandError>;

    fn search_embeddings(
        &self,
        query: &str,
        license: &VerifiedLicense,
    ) -> Result<Vec<SearchResult>, CommandError>;
}
