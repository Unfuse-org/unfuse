use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Normalized capability status for a specific model capability (e.g. image_input).
/// Distinguishes between explicitly supported, explicitly unsupported, and unknown.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CapabilityStatus {
    Supported,
    Unsupported,
    Unknown,
}

/// The origin of a capability classification.
/// Guarantees that runtime declarations take precedence and fallback is strictly identified.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CapabilitySource {
    Runtime,
    Fallback,
}

/// Normalized model capabilities container.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ModelCapabilities {
    pub image_input: CapabilityStatus,
    pub source: CapabilitySource,
}

impl ModelCapabilities {
    pub fn runtime(status: CapabilityStatus) -> Self {
        Self {
            image_input: status,
            source: CapabilitySource::Runtime,
        }
    }

    pub fn fallback(status: CapabilityStatus) -> Self {
        Self {
            image_input: status,
            source: CapabilitySource::Fallback,
        }
    }
}

// ---------------------------------------------------------------------------
// Provider-Specific Metadata Inspectors
// ---------------------------------------------------------------------------

/// 1. Ollama: Inspects POST /api/show response.
/// Uses the actual documented capability information as the primary source of truth:
/// - `capabilities` array containing "vision": Supported / Runtime
/// - `capabilities` array present but without "vision": Unsupported / Runtime
/// - If `capabilities` array is absent or not an array: Unknown / Runtime
pub fn inspect_ollama_capabilities(show_response: Option<&Value>) -> ModelCapabilities {
    let Some(data) = show_response else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(caps) = data.get("capabilities").and_then(|c| c.as_array()) {
        if caps.iter().any(|v| v.as_str() == Some("vision")) {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

/// 2. LM Studio: Inspects model object from LM Studio API.
/// - `capabilities.vision` is true: Supported / Runtime
/// - `capabilities.vision` is false: Unsupported / Runtime
/// - If `capabilities` or `capabilities.vision` is absent: Unknown / Runtime
pub fn inspect_lmstudio_capabilities(model_metadata: Option<&Value>) -> ModelCapabilities {
    let Some(data) = model_metadata else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(vision_bool) = data
        .get("capabilities")
        .and_then(|c| c.get("vision"))
        .and_then(|v| v.as_bool())
    {
        if vision_bool {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

/// 3. llama.cpp: Inspects llama.cpp server model/props metadata.
/// - `modalities.vision` or `multimodal` is true: Supported / Runtime
/// - `modalities.vision` or `multimodal` is false: Unsupported / Runtime
/// - If absent: Unknown / Runtime
pub fn inspect_llamacpp_capabilities(server_metadata: Option<&Value>) -> ModelCapabilities {
    let Some(data) = server_metadata else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(vision_bool) = data
        .get("modalities")
        .and_then(|m| m.get("vision"))
        .and_then(|v| v.as_bool())
    {
        if vision_bool {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    if let Some(multimodal_bool) = data.get("multimodal").and_then(|v| v.as_bool()) {
        if multimodal_bool {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

/// 4. vLLM: Inspects vLLM model object.
/// vLLM standard /v1/models does not include capability metadata.
/// If explicit capability metadata is present from an extension:
/// - `capabilities.vision` is true: Supported / Runtime
/// - `capabilities.vision` is false: Unsupported / Runtime
/// Otherwise: Unknown / Runtime
pub fn inspect_vllm_capabilities(model_metadata: Option<&Value>) -> ModelCapabilities {
    let Some(data) = model_metadata else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(vision_bool) = data
        .get("capabilities")
        .and_then(|c| c.get("vision"))
        .and_then(|v| v.as_bool())
    {
        if vision_bool {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

/// 5. MLX: Inspects MLX runtime metadata.
/// Distinguishes mlx-vlm (which declares vision/capabilities or runtime "mlx-vlm") from mlx-lm.
/// - If capabilities contains "vision" or runtime is "mlx-vlm": Supported / Runtime
/// - If capabilities present and does not contain "vision": Unsupported / Runtime
/// - If insufficient metadata: Unknown / Runtime
pub fn inspect_mlx_capabilities(runtime_metadata: Option<&Value>) -> ModelCapabilities {
    let Some(data) = runtime_metadata else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(caps) = data.get("capabilities").and_then(|c| c.as_array()) {
        if caps.iter().any(|v| v.as_str() == Some("vision")) {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    if let Some(runtime_str) = data.get("runtime").and_then(|r| r.as_str()) {
        if runtime_str == "mlx-vlm" {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

/// 6. Unsloth: Inspects Unsloth Studio / local inference model metadata.
/// - If capabilities or modalities explicitly reports vision: Supported / Runtime
/// - If explicitly reports false: Unsupported / Runtime
/// - If insufficient metadata: Unknown / Runtime
pub fn inspect_unsloth_capabilities(model_metadata: Option<&Value>) -> ModelCapabilities {
    let Some(data) = model_metadata else {
        return ModelCapabilities::runtime(CapabilityStatus::Unknown);
    };

    if let Some(vision_bool) = data
        .get("capabilities")
        .and_then(|c| c.get("vision"))
        .and_then(|v| v.as_bool())
    {
        if vision_bool {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    if let Some(caps) = data.get("capabilities").and_then(|c| c.as_array()) {
        if caps.iter().any(|v| v.as_str() == Some("vision")) {
            return ModelCapabilities::runtime(CapabilityStatus::Supported);
        } else {
            return ModelCapabilities::runtime(CapabilityStatus::Unsupported);
        }
    }

    ModelCapabilities::runtime(CapabilityStatus::Unknown)
}

// ---------------------------------------------------------------------------
// Unified Capability Dispatcher & Conservative Fallback
// ---------------------------------------------------------------------------

/// Dispatches capability inspection to the specific runtime inspector.
pub fn inspect_provider_capabilities(
    provider: &str,
    metadata: Option<&Value>,
) -> ModelCapabilities {
    match provider.to_lowercase().as_str() {
        "ollama" => inspect_ollama_capabilities(metadata),
        "lmstudio" => inspect_lmstudio_capabilities(metadata),
        "llamacpp" => inspect_llamacpp_capabilities(metadata),
        "vllm" => inspect_vllm_capabilities(metadata),
        "mlx" => inspect_mlx_capabilities(metadata),
        "unsloth" => inspect_unsloth_capabilities(metadata),
        _ => ModelCapabilities::runtime(CapabilityStatus::Unknown),
    }
}

/// Resolves model capabilities according to the strict priority contract:
/// 1. Inspect actual provider/runtime metadata first.
/// 2. If runtime explicitly says Supported or Unsupported, return immediately.
///    A fallback mechanism must NEVER override an explicit runtime declaration!
/// 3. ONLY if runtime returns Unknown may the fallback heuristic be evaluated.
pub fn resolve_model_capabilities(
    provider: &str,
    metadata: Option<&Value>,
    model_id: &str,
) -> ModelCapabilities {
    let runtime_caps = inspect_provider_capabilities(provider, metadata);

    // Explicit runtime declarations are authoritative and final
    if runtime_caps.image_input != CapabilityStatus::Unknown {
        return runtime_caps;
    }

    // Only Unknown reaches fallback
    apply_fallback_heuristic(model_id)
}

/// Conservative fallback heuristic for image input, clearly isolated from runtime detection.
/// Marked with CapabilitySource::Fallback.
pub fn apply_fallback_heuristic(model_id: &str) -> ModelCapabilities {
    let lower = model_id.to_lowercase();
    let is_likely_vision = lower.contains("-vl")
        || lower.contains("_vl")
        || lower.contains("vl-")
        || lower.contains("-vision")
        || lower.contains("_vision")
        || lower.contains("llava")
        || lower.contains("minicpm-v");

    if is_likely_vision {
        ModelCapabilities::fallback(CapabilityStatus::Supported)
    } else {
        // If there is insufficient evidence, Unknown is preferable to incorrectly claiming support or unsupport
        ModelCapabilities::fallback(CapabilityStatus::Unknown)
    }
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // 1. Explicit runtime Supported -> Supported / Runtime
    #[test]
    fn test_explicit_runtime_supported() {
        let fixture = json!({
            "capabilities": {
                "vision": true
            }
        });
        let res = inspect_lmstudio_capabilities(Some(&fixture));
        assert_eq!(res.image_input, CapabilityStatus::Supported);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 2. Explicit runtime Unsupported -> Unsupported / Runtime
    #[test]
    fn test_explicit_runtime_unsupported() {
        let fixture = json!({
            "capabilities": {
                "vision": false
            }
        });
        let res = inspect_lmstudio_capabilities(Some(&fixture));
        assert_eq!(res.image_input, CapabilityStatus::Unsupported);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 3. Missing capability metadata -> Unknown / Runtime
    #[test]
    fn test_missing_capability_metadata_returns_unknown() {
        let fixture = json!({
            "id": "some-text-model"
        });
        let res = inspect_lmstudio_capabilities(Some(&fixture));
        assert_eq!(res.image_input, CapabilityStatus::Unknown);
        assert_eq!(res.source, CapabilitySource::Runtime);

        let none_res = inspect_lmstudio_capabilities(None);
        assert_eq!(none_res.image_input, CapabilityStatus::Unknown);
        assert_eq!(none_res.source, CapabilitySource::Runtime);
    }

    // 4. Fallback runs only after Unknown
    #[test]
    fn test_fallback_runs_only_after_unknown() {
        // Unknown runtime metadata allows fallback to evaluate model_id
        let res = resolve_model_capabilities("vllm", None, "Qwen/Qwen2.5-VL-7B-Instruct");
        assert_eq!(res.image_input, CapabilityStatus::Supported);
        assert_eq!(res.source, CapabilitySource::Fallback);

        let unknown_res = resolve_model_capabilities("vllm", None, "meta-llama/Llama-3.1-8B-Instruct");
        assert_eq!(unknown_res.image_input, CapabilityStatus::Unknown);
        assert_eq!(unknown_res.source, CapabilitySource::Fallback);
    }

    // 5. Explicit Unsupported cannot be overridden by fallback
    #[test]
    fn test_explicit_unsupported_cannot_be_overridden_by_fallback() {
        // Model name has "vision" in it, but runtime explicitly reports capabilities without vision!
        let fixture = json!({
            "capabilities": ["completion", "tools"]
        });
        let res = resolve_model_capabilities("ollama", Some(&fixture), "custom-vision-named-model");
        assert_eq!(res.image_input, CapabilityStatus::Unsupported);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 6. Explicit Supported cannot be overridden by fallback
    #[test]
    fn test_explicit_supported_cannot_be_overridden_by_fallback() {
        // Model name has NO vision hints, but runtime explicitly reports vision support!
        let fixture = json!({
            "capabilities": ["completion", "vision"]
        });
        let res = resolve_model_capabilities("ollama", Some(&fixture), "custom-unnamed-checkpoint");
        assert_eq!(res.image_input, CapabilityStatus::Supported);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 7. Ollama actual capability parsing
    #[test]
    fn test_ollama_actual_capability_parsing() {
        // Ollama POST /api/show with capabilities: ["completion", "vision"]
        let vision_fixture = json!({
            "capabilities": ["completion", "vision"],
            "details": { "family": "gemma4" }
        });
        assert_eq!(
            inspect_ollama_capabilities(Some(&vision_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Supported)
        );

        // Ollama POST /api/show without vision capability
        let text_fixture = json!({
            "capabilities": ["completion"],
            "details": { "family": "qwen2" }
        });
        assert_eq!(
            inspect_ollama_capabilities(Some(&text_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Unsupported)
        );

        // Ollama POST /api/show where capabilities field is absent -> Unknown
        let missing_caps_fixture = json!({
            "details": { "family": "qwen2" }
        });
        assert_eq!(
            inspect_ollama_capabilities(Some(&missing_caps_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Unknown)
        );
    }

    // 8. LM Studio actual capability parsing
    #[test]
    fn test_lmstudio_actual_capability_parsing() {
        let vision_fixture = json!({
            "id": "qwen2.5-vl-7b",
            "capabilities": { "vision": true }
        });
        assert_eq!(
            inspect_lmstudio_capabilities(Some(&vision_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Supported)
        );

        let non_vision_fixture = json!({
            "id": "qwen2.5-coder-7b",
            "capabilities": { "vision": false }
        });
        assert_eq!(
            inspect_lmstudio_capabilities(Some(&non_vision_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Unsupported)
        );

        let absent_fixture = json!({
            "id": "unreported-model"
        });
        assert_eq!(
            inspect_lmstudio_capabilities(Some(&absent_fixture)),
            ModelCapabilities::runtime(CapabilityStatus::Unknown)
        );
    }

    // 9. llama.cpp actual multimodal capability parsing
    #[test]
    fn test_llamacpp_actual_multimodal_capability_parsing() {
        // llama-server /props with modalities.vision = true
        let props_vision = json!({
            "modalities": { "vision": true }
        });
        assert_eq!(
            inspect_llamacpp_capabilities(Some(&props_vision)),
            ModelCapabilities::runtime(CapabilityStatus::Supported)
        );

        // llama-server /props with modalities.vision = false
        let props_no_vision = json!({
            "modalities": { "vision": false }
        });
        assert_eq!(
            inspect_llamacpp_capabilities(Some(&props_no_vision)),
            ModelCapabilities::runtime(CapabilityStatus::Unsupported)
        );

        // llama-server with multimodal: true boolean
        let mm_true = json!({
            "multimodal": true
        });
        assert_eq!(
            inspect_llamacpp_capabilities(Some(&mm_true)),
            ModelCapabilities::runtime(CapabilityStatus::Supported)
        );

        // No modality metadata
        let mm_absent = json!({
            "assistant_name": "Assistant"
        });
        assert_eq!(
            inspect_llamacpp_capabilities(Some(&mm_absent)),
            ModelCapabilities::runtime(CapabilityStatus::Unknown)
        );
    }

    // 10. vLLM with no explicit capability metadata -> Unknown
    #[test]
    fn test_vllm_with_no_explicit_capability_metadata_returns_unknown() {
        // Standard vLLM GET /v1/models ModelCard has no capability dictionary
        let standard_vllm_card = json!({
            "id": "meta-llama/Llama-3.1-8B-Instruct",
            "object": "model",
            "created": 1720000000,
            "owned_by": "vllm",
            "max_model_len": 8192
        });
        let res = inspect_vllm_capabilities(Some(&standard_vllm_card));
        assert_eq!(res.image_input, CapabilityStatus::Unknown);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 11. MLX text-serving runtime without image capability metadata -> Unknown
    #[test]
    fn test_mlx_text_serving_runtime_without_image_metadata_returns_unknown() {
        // Standard mlx-lm server model listing
        let mlx_lm_card = json!({
            "id": "mlx-community/Qwen2.5-7B-Instruct-4bit",
            "object": "model"
        });
        let res = inspect_mlx_capabilities(Some(&mlx_lm_card));
        assert_eq!(res.image_input, CapabilityStatus::Unknown);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 12. MLX-VLM/runtime metadata that explicitly establishes image support -> Supported
    #[test]
    fn test_mlx_vlm_runtime_metadata_explicit_support() {
        // mlx-vlm / mlx-serve model card with capabilities: ["chat", "vision"]
        let mlx_vlm_card = json!({
            "id": "mlx-community/Qwen2-VL-7B-Instruct-4bit",
            "capabilities": ["chat", "vision"]
        });
        let res = inspect_mlx_capabilities(Some(&mlx_vlm_card));
        assert_eq!(res.image_input, CapabilityStatus::Supported);
        assert_eq!(res.source, CapabilitySource::Runtime);

        // runtime: "mlx-vlm" explicitly declared
        let mlx_vlm_runtime = json!({
            "id": "custom-mlx-model",
            "runtime": "mlx-vlm"
        });
        let res2 = inspect_mlx_capabilities(Some(&mlx_vlm_runtime));
        assert_eq!(res2.image_input, CapabilityStatus::Supported);
        assert_eq!(res2.source, CapabilitySource::Runtime);
    }

    // 13. Unsloth runtime without reliable capability metadata -> Unknown
    #[test]
    fn test_unsloth_runtime_without_reliable_capability_metadata_returns_unknown() {
        let unsloth_opaque_card = json!({
            "id": "unsloth/gemma-3-27b-it-GGUF",
            "object": "model"
        });
        let res = inspect_unsloth_capabilities(Some(&unsloth_opaque_card));
        assert_eq!(res.image_input, CapabilityStatus::Unknown);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 14. Unsloth runtime metadata that explicitly establishes image support -> Supported
    #[test]
    fn test_unsloth_runtime_metadata_explicit_support() {
        let unsloth_vision_card = json!({
            "id": "unsloth/Llama-3.2-11B-Vision-Instruct-GGUF",
            "capabilities": {
                "vision": true
            }
        });
        let res = inspect_unsloth_capabilities(Some(&unsloth_vision_card));
        assert_eq!(res.image_input, CapabilityStatus::Supported);
        assert_eq!(res.source, CapabilitySource::Runtime);
    }

    // 15. Provider metadata schemas must not be assumed interchangeable
    #[test]
    fn test_provider_schemas_not_interchangeable() {
        // Ollama format (capabilities: ["vision"]) passed to LM Studio (which expects capabilities.vision: bool)
        // must NOT be falsely recognized by LM Studio
        let ollama_fixture = json!({
            "capabilities": ["vision"]
        });
        let lmstudio_res = inspect_lmstudio_capabilities(Some(&ollama_fixture));
        assert_eq!(lmstudio_res.image_input, CapabilityStatus::Unknown);

        // llama.cpp format (modalities: { vision: true }) passed to Ollama
        let llamacpp_fixture = json!({
            "modalities": { "vision": true }
        });
        let ollama_res = inspect_ollama_capabilities(Some(&llamacpp_fixture));
        assert_eq!(ollama_res.image_input, CapabilityStatus::Unknown);
    }
}
