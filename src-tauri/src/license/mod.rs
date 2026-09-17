use std::path::Path;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};

/// The embedded Ed25519 public key corresponding to the offline license signing authority.
/// The private key NEVER exists in this repository or client binary.
pub const EMBEDDED_PUBLIC_KEY_HEX: &str =
    "de0db7b52e547b6e0b9601662df0af4c9550933e55af7285a9b53237b2a1aeb4";

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum LicenseError {
    #[error("No license file found on disk. Operating on the Free tier.")]
    NotFound,

    #[error("Invalid cryptographic signature: license key is forged, tampered with, or invalid.")]
    InvalidSignature,

    #[error("License expired at UNIX timestamp {0}")]
    Expired(u64),

    #[error("Pro tier required: this license is validly signed for the '{0}' tier, which does not unlock Pro features.")]
    ProTierRequired(String),

    #[error("Corrupted license payload: {0}")]
    Corrupted(String),
}

/// The license file structure as saved on disk (`license.key`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredLicensePayload {
    pub key: String,
    pub tier: String,
    pub holder: String,
    pub expires_at: Option<u64>,
    pub signature: String,
}

/// A capability / proof-of-valid-license token for Pro features.
///
/// 🔒 COMPILER-ENFORCED CAPABILITY GUARANTEE:
/// - All fields are strictly private (`_key`, `_tier`, etc.).
/// - No `pub fn new(...)` or `Default` implementation exists anywhere in the codebase.
/// - It can ONLY be constructed inside `LicenseManager::verify_pro(&self)` upon passing
///   genuine cryptographic Ed25519 signature verification AND confirming tier == "pro".
/// - Any privileged `ProEngine` method requires `&VerifiedLicense`, ensuring at
///   compile time that unverified or free-tier callers cannot invoke Pro routines.
#[derive(Debug, Clone)]
pub struct VerifiedLicense {
    _key: String,
    _tier: String,
    _holder: String,
    _expires_at: Option<u64>,
}

impl VerifiedLicense {
    pub fn tier(&self) -> &str {
        &self._tier
    }

    pub fn holder(&self) -> &str {
        &self._holder
    }

    pub fn expires_at(&self) -> Option<u64> {
        self._expires_at
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub is_pro: bool,
    pub holder: Option<String>,
    pub tier: String,
}

#[derive(Clone)]
pub struct LicenseManager {
    data_dir: std::path::PathBuf,
}

/// Produces the exact canonical byte sequence that was signed offline by the authority.
pub fn canonical_license_bytes(
    key: &str,
    tier: &str,
    holder: &str,
    expires_at: Option<u64>,
) -> Vec<u8> {
    format!(
        "unfuse-license:v1:{}:{}:{}:{}",
        key,
        tier,
        holder,
        expires_at.unwrap_or(0)
    )
    .into_bytes()
}

/// Cryptographically verifies an Ed25519 signature against the embedded public key.
pub fn verify_ed25519(canonical_bytes: &[u8], signature_hex: &str) -> Result<(), LicenseError> {
    let pub_bytes = hex::decode(EMBEDDED_PUBLIC_KEY_HEX)
        .map_err(|e| LicenseError::Corrupted(format!("Invalid embedded public key hex: {}", e)))?;
    let pub_array: [u8; 32] = pub_bytes
        .try_into()
        .map_err(|_| LicenseError::Corrupted("Public key must be 32 bytes".into()))?;
    let verifying_key = VerifyingKey::from_bytes(&pub_array)
        .map_err(|e| LicenseError::Corrupted(format!("Failed to parse verifying key: {}", e)))?;

    let sig_bytes = hex::decode(signature_hex.trim())
        .map_err(|_| LicenseError::InvalidSignature)?;
    let sig_array: [u8; 64] = sig_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidSignature)?;
    let signature = Signature::from_bytes(&sig_array);

    verifying_key
        .verify_strict(canonical_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)
}

impl LicenseManager {
    pub fn init(data_dir: &Path) -> Self {
        Self {
            data_dir: data_dir.to_path_buf(),
        }
    }

    /// Fast boolean check for UI badges/display.
    /// Internal implementation strictly calls `verify_pro().is_ok()`.
    /// There is ZERO duplicate gating path.
    pub fn is_pro(&self) -> bool {
        self.verify_pro().is_ok()
    }

    /// Private helper: Reads and validates signature & expiry of any license on disk.
    /// Note: This is intentionally private (NOT pub). The only public gateway
    /// for privilege authorization is `verify_pro()`.
    fn verify_signature(&self) -> Result<StoredLicensePayload, LicenseError> {
        let license_path = self.data_dir.join("license.key");

        // Case 1: First-run free-tier user (no file on disk)
        if !license_path.exists() {
            return Err(LicenseError::NotFound);
        }

        // Case 2a: IO read error
        let raw = std::fs::read_to_string(&license_path)
            .map_err(|e| LicenseError::Corrupted(format!("Failed to read license file: {}", e)))?;

        let trimmed = raw.trim();

        // Case 2b: File is empty
        if trimmed.is_empty() {
            return Err(LicenseError::NotFound);
        }

        // Case 2c: Malformed JSON
        let payload: StoredLicensePayload = serde_json::from_str(trimmed)
            .map_err(|e| LicenseError::Corrupted(format!("License file is not valid JSON: {}", e)))?;

        if payload.key.trim().is_empty() || payload.tier.trim().is_empty() {
            return Err(LicenseError::Corrupted("License key or tier field is empty".into()));
        }

        // Case 3: Check expiration against current system epoch time
        if let Some(expires_at) = payload.expires_at {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            if now > expires_at {
                return Err(LicenseError::Expired(expires_at));
            }
        }

        // Case 4: Real Ed25519 signature verification over canonical serialized bytes
        let canonical_bytes = canonical_license_bytes(
            &payload.key,
            &payload.tier,
            &payload.holder,
            payload.expires_at,
        );

        verify_ed25519(&canonical_bytes, &payload.signature)?;

        Ok(payload)
    }

    /// Cryptographically verifies the license AND confirms tier == "pro" (or "enterprise").
    /// This is the SOLE constructor of `VerifiedLicense` in the entire codebase.
    ///
    /// Every Pro method in `ProEngine` strictly requires `&VerifiedLicense`, ensuring
    /// at compile-time that unverified or free-tier callers cannot execute Pro routines.
    pub fn verify_pro(&self) -> Result<VerifiedLicense, LicenseError> {
        let payload = self.verify_signature()?;

        // Explicit tier check: validly signed "free" tier licenses cannot unlock Pro
        if payload.tier.to_lowercase() != "pro" && payload.tier.to_lowercase() != "enterprise" {
            return Err(LicenseError::ProTierRequired(payload.tier));
        }

        Ok(VerifiedLicense {
            _key: payload.key,
            _tier: payload.tier,
            _holder: payload.holder,
            _expires_at: payload.expires_at,
        })
    }

    /// Summary info for settings/UI popovers. Internally calls `verify_pro()`.
    pub fn get_info(&self) -> LicenseInfo {
        match self.verify_pro() {
            Ok(lic) => LicenseInfo {
                is_pro: true,
                holder: Some(lic.holder().to_string()),
                tier: lic.tier().to_string(),
            },
            Err(_) => LicenseInfo {
                is_pro: false,
                holder: None,
                tier: "free".to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use ed25519_dalek::Signer;

    fn setup_temp_license_dir() -> (tempfile::TempDir, LicenseManager) {
        let temp_dir = tempfile::tempdir().expect("Failed to create tempdir");
        let manager = LicenseManager::init(temp_dir.path());
        (temp_dir, manager)
    }

    /// Reads the offline signing authority private key generated for test execution
    fn get_test_authority_signer() -> ed25519_dalek::SigningKey {
        let priv_hex = fs::read_to_string("../.secrets/license_authority.key")
            .or_else(|_| fs::read_to_string(".secrets/license_authority.key"))
            .expect("Expected .secrets/license_authority.key for test execution");
        let raw_priv = hex::decode(priv_hex.trim()).expect("Valid hex private key");
        ed25519_dalek::SigningKey::from_bytes(&raw_priv.try_into().unwrap())
    }

    #[test]
    fn test_first_run_free_tier_user_no_license_file() {
        let (_dir, manager) = setup_temp_license_dir();
        // No license.key file exists on disk
        let result = manager.verify_pro();
        assert_eq!(result.err(), Some(LicenseError::NotFound));
    }

    #[test]
    fn test_empty_license_file_returns_not_found() {
        let (dir, manager) = setup_temp_license_dir();
        fs::write(dir.path().join("license.key"), "   \n\t").unwrap();

        let result = manager.verify_pro();
        assert_eq!(result.err(), Some(LicenseError::NotFound));
    }

    #[test]
    fn test_corrupted_json_returns_corrupted_error() {
        let (dir, manager) = setup_temp_license_dir();
        fs::write(dir.path().join("license.key"), "{ not valid json ").unwrap();

        let result = manager.verify_pro();
        match result.err() {
            Some(LicenseError::Corrupted(msg)) => {
                assert!(msg.contains("License file is not valid JSON"));
            }
            other => panic!("Expected Corrupted error, got {:?}", other),
        }
    }

    #[test]
    fn test_fake_32_plus_char_signature_is_strictly_rejected() {
        let (dir, manager) = setup_temp_license_dir();

        // Attack vector: user writes a 32+ character dummy string as signature
        let attack_payload = serde_json::json!({
            "key": "UNFUSE-PRO-2026-FAKE-1234",
            "tier": "pro",
            "holder": "attacker@pwn.org",
            "expires_at": null,
            "signature": "this_is_a_fake_signature_that_is_32_chars_long_and_should_fail"
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&attack_payload).unwrap(),
        )
        .unwrap();

        let result = manager.verify_pro();
        assert_eq!(
            result.err(),
            Some(LicenseError::InvalidSignature),
            "Fake signature must be rejected with InvalidSignature"
        );
    }

    #[test]
    fn test_fake_64_byte_hex_signature_fails_strict_verification() {
        let (dir, manager) = setup_temp_license_dir();

        // 128 hex chars (64 bytes), but not a valid Ed25519 signature for this payload
        let attack_payload = serde_json::json!({
            "key": "UNFUSE-PRO-2026-FAKE-5678",
            "tier": "pro",
            "holder": "attacker@pwn.org",
            "expires_at": null,
            "signature": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f200102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&attack_payload).unwrap(),
        )
        .unwrap();

        let result = manager.verify_pro();
        assert_eq!(
            result.err(),
            Some(LicenseError::InvalidSignature),
            "Syntactically valid 64-byte hex but invalid Ed25519 sig must be rejected"
        );
    }

    #[test]
    fn test_validly_signed_free_tier_cannot_obtain_verified_pro_license() {
        let (dir, manager) = setup_temp_license_dir();
        let signing_key = get_test_authority_signer();

        let canonical = canonical_license_bytes("UNFUSE-FREE-2026", "free", "free@user.com", None);
        let sig = signing_key.sign(&canonical);
        let sig_hex = hex::encode(sig.to_bytes());

        let free_license = serde_json::json!({
            "key": "UNFUSE-FREE-2026",
            "tier": "free",
            "holder": "free@user.com",
            "expires_at": null,
            "signature": sig_hex
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&free_license).unwrap(),
        )
        .unwrap();

        // Signature is valid, but tier is "free" -> verify_pro MUST reject it
        let result = manager.verify_pro();
        assert_eq!(
            result.err(),
            Some(LicenseError::ProTierRequired("free".into())),
            "Validly signed Free tier license must NOT produce a VerifiedLicense token"
        );
    }

    #[test]
    fn test_validly_signed_pro_tier_succeeds_and_produces_verified_license() {
        let (dir, manager) = setup_temp_license_dir();
        let signing_key = get_test_authority_signer();

        let canonical = canonical_license_bytes("UNFUSE-PRO-2026-REAL", "pro", "alice@corp.com", None);
        let sig = signing_key.sign(&canonical);
        let sig_hex = hex::encode(sig.to_bytes());

        let pro_license = serde_json::json!({
            "key": "UNFUSE-PRO-2026-REAL",
            "tier": "pro",
            "holder": "alice@corp.com",
            "expires_at": null,
            "signature": sig_hex
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&pro_license).unwrap(),
        )
        .unwrap();

        let verified = manager.verify_pro().expect("Genuine Pro license must verify successfully");
        assert_eq!(verified.holder(), "alice@corp.com");
        assert_eq!(verified.tier(), "pro");
        assert_eq!(verified.expires_at(), None);
    }

    #[test]
    fn test_expired_pro_license_signed_correctly_still_rejected() {
        let (dir, manager) = setup_temp_license_dir();
        let signing_key = get_test_authority_signer();

        // Expired timestamp in the past: Unix epoch timestamp 1_000_000 (year 1970)
        let expired_ts = 1_000_000;
        let canonical = canonical_license_bytes("UNFUSE-PRO-EXPIRED", "pro", "bob@corp.com", Some(expired_ts));
        let sig = signing_key.sign(&canonical);
        let sig_hex = hex::encode(sig.to_bytes());

        let expired_license = serde_json::json!({
            "key": "UNFUSE-PRO-EXPIRED",
            "tier": "pro",
            "holder": "bob@corp.com",
            "expires_at": expired_ts,
            "signature": sig_hex
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&expired_license).unwrap(),
        )
        .unwrap();

        let result = manager.verify_pro();
        assert_eq!(
            result.err(),
            Some(LicenseError::Expired(expired_ts)),
            "Cryptographically valid but expired license must be rejected with Expired"
        );
    }

    #[test]
    fn test_tampered_holder_fails_signature_verification() {
        let (dir, manager) = setup_temp_license_dir();
        let signing_key = get_test_authority_signer();

        // Sign for "alice@corp.com"
        let canonical = canonical_license_bytes("UNFUSE-PRO-2026-REAL", "pro", "alice@corp.com", None);
        let sig = signing_key.sign(&canonical);
        let sig_hex = hex::encode(sig.to_bytes());

        // Tamper payload to "bob@corp.com" with alice's signature
        let tampered_license = serde_json::json!({
            "key": "UNFUSE-PRO-2026-REAL",
            "tier": "pro",
            "holder": "bob@corp.com",
            "expires_at": null,
            "signature": sig_hex
        });

        fs::write(
            dir.path().join("license.key"),
            serde_json::to_string(&tampered_license).unwrap(),
        )
        .unwrap();

        let result = manager.verify_pro();
        assert_eq!(
            result.err(),
            Some(LicenseError::InvalidSignature),
            "Tampered payload must fail cryptographic signature verification"
        );
    }
}
