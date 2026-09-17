use std::sync::Arc;
use crate::commands::CommandError;
use crate::license::{LicenseManager, VerifiedLicense};
use crate::pro_trait::{AuditRecord, AutopilotStepResult, ProEngine, SearchResult};
use tauri::AppHandle;

#[cfg(feature = "pro")]
pub use unfuse_pro_core::RealProEngine as ActiveProEngine;

#[cfg(not(feature = "pro"))]
pub struct ActiveProEngine;

#[cfg(not(feature = "pro"))]
impl ActiveProEngine {
    pub fn new() -> Self {
        Self
    }
}

#[cfg(not(feature = "pro"))]
impl ProEngine for ActiveProEngine {
    fn execute_autopilot_step(
        &self,
        _goal: &str,
        _license: &VerifiedLicense,
    ) -> Result<AutopilotStepResult, CommandError> {
        Err(CommandError::ProRequired(
            "Multi-iteration self-healing Autopilot requires Unfuse Pro.".into(),
        ))
    }

    fn unlock_vault(
        &self,
        _password: &str,
        _license: &VerifiedLicense,
    ) -> Result<(), CommandError> {
        Err(CommandError::ProRequired(
            "Encrypted Vault requires Unfuse Pro.".into(),
        ))
    }

    fn get_vault_secret(
        &self,
        _service: &str,
        _license: &VerifiedLicense,
    ) -> Result<Option<String>, CommandError> {
        Err(CommandError::ProRequired(
            "Encrypted Vault requires Unfuse Pro.".into(),
        ))
    }

    fn save_vault_secret(
        &self,
        _service: &str,
        _secret: &str,
        _license: &VerifiedLicense,
    ) -> Result<(), CommandError> {
        Err(CommandError::ProRequired(
            "Encrypted Vault requires Unfuse Pro.".into(),
        ))
    }

    fn record_audit_hash(
        &self,
        _record: &AuditRecord,
        _license: &VerifiedLicense,
    ) -> Result<String, CommandError> {
        Err(CommandError::ProRequired(
            "Tamper-evident audit chain requires Unfuse Pro.".into(),
        ))
    }

    fn search_embeddings(
        &self,
        _query: &str,
        _license: &VerifiedLicense,
    ) -> Result<Vec<SearchResult>, CommandError> {
        Err(CommandError::ProRequired(
            "Semantic vector search requires Unfuse Pro.".into(),
        ))
    }
}

pub fn init_pro_engine(app_handle: &AppHandle, license: &LicenseManager) -> Arc<dyn ProEngine> {
    #[cfg(feature = "pro")]
    {
        Arc::new(ActiveProEngine::new(app_handle.clone(), license.clone()))
    }

    #[cfg(not(feature = "pro"))]
    {
        let _ = (app_handle, license);
        Arc::new(ActiveProEngine::new())
    }
}
