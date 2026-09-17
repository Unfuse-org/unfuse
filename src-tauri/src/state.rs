use std::sync::Arc;
use crate::autopilot::session::AutopilotManager;
use crate::db::DatabaseManager;
use crate::license::LicenseManager;
use crate::pro_trait::ProEngine;

pub struct AppState {
    /// Server-tracked autopilot iteration counter and session manager (FIX 1)
    pub autopilot: AutopilotManager,

    /// ProEngine provider: either RealProEngine (via unfuse-pro-core) or StubProEngine
    /// Decoupled via trait object so AppState requires zero #[cfg] branches
    pub pro_engine: Arc<dyn ProEngine>,

    /// Cryptographic license manager (Ed25519 signature verification)
    pub license: LicenseManager,

    /// Persistent local SQLite connection manager
    pub db: DatabaseManager,
}
