import { CapabilityStatus, CapabilitySource, ModelCapabilities } from './types';

/**
 * 1. Ollama: Inspects POST /api/show response.
 * Uses the actual documented capability information as the primary source of truth:
 * - `capabilities` array containing "vision": Supported / Runtime
 * - `capabilities` array present but without "vision": Unsupported / Runtime
 * - If `capabilities` array is absent: Unknown / Runtime
 */
export function inspectOllamaCapabilities(showResponse?: any): ModelCapabilities {
  if (!showResponse || typeof showResponse !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (Array.isArray(showResponse.capabilities)) {
    if (showResponse.capabilities.includes('vision')) {
      return { image_input: 'Supported', source: 'Runtime' };
    } else {
      return { image_input: 'Unsupported', source: 'Runtime' };
    }
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * 2. LM Studio: Inspects model object from LM Studio API.
 * - `capabilities.vision` is true: Supported / Runtime
 * - `capabilities.vision` is false: Unsupported / Runtime
 * - If `capabilities` or `capabilities.vision` is absent: Unknown / Runtime
 */
export function inspectLMStudioCapabilities(modelMetadata?: any): ModelCapabilities {
  if (!modelMetadata || typeof modelMetadata !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (modelMetadata.capabilities && typeof modelMetadata.capabilities.vision === 'boolean') {
    return {
      image_input: modelMetadata.capabilities.vision ? 'Supported' : 'Unsupported',
      source: 'Runtime',
    };
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * 3. llama.cpp: Inspects llama.cpp server model/props metadata.
 * - `modalities.vision` or `multimodal` is true: Supported / Runtime
 * - `modalities.vision` or `multimodal` is false: Unsupported / Runtime
 * - If absent: Unknown / Runtime
 */
export function inspectLlamaCppCapabilities(serverMetadata?: any): ModelCapabilities {
  if (!serverMetadata || typeof serverMetadata !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (serverMetadata.modalities && typeof serverMetadata.modalities.vision === 'boolean') {
    return {
      image_input: serverMetadata.modalities.vision ? 'Supported' : 'Unsupported',
      source: 'Runtime',
    };
  }

  if (typeof serverMetadata.multimodal === 'boolean') {
    return {
      image_input: serverMetadata.multimodal ? 'Supported' : 'Unsupported',
      source: 'Runtime',
    };
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * 4. vLLM: Inspects vLLM model object.
 * Standard vLLM /v1/models does not include capability metadata.
 * If explicit capability metadata is present from an extension:
 * - `capabilities.vision` is true: Supported / Runtime
 * - `capabilities.vision` is false: Unsupported / Runtime
 * Otherwise: Unknown / Runtime
 */
export function inspectVllmCapabilities(modelMetadata?: any): ModelCapabilities {
  if (!modelMetadata || typeof modelMetadata !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (modelMetadata.capabilities && typeof modelMetadata.capabilities.vision === 'boolean') {
    return {
      image_input: modelMetadata.capabilities.vision ? 'Supported' : 'Unsupported',
      source: 'Runtime',
    };
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * 5. MLX: Inspects MLX runtime metadata.
 * Distinguishes mlx-vlm from mlx-lm.
 * - If capabilities contains "vision" or runtime is "mlx-vlm": Supported / Runtime
 * - If capabilities present and does not contain "vision": Unsupported / Runtime
 * - If insufficient metadata: Unknown / Runtime
 */
export function inspectMlxCapabilities(runtimeMetadata?: any): ModelCapabilities {
  if (!runtimeMetadata || typeof runtimeMetadata !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (Array.isArray(runtimeMetadata.capabilities)) {
    if (runtimeMetadata.capabilities.includes('vision')) {
      return { image_input: 'Supported', source: 'Runtime' };
    } else {
      return { image_input: 'Unsupported', source: 'Runtime' };
    }
  }

  if (runtimeMetadata.runtime === 'mlx-vlm') {
    return { image_input: 'Supported', source: 'Runtime' };
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * 6. Unsloth: Inspects Unsloth Studio / local inference model metadata.
 * - If capabilities or modalities explicitly reports vision: Supported / Runtime
 * - If explicitly reports false: Unsupported / Runtime
 * - If insufficient metadata: Unknown / Runtime
 */
export function inspectUnslothCapabilities(modelMetadata?: any): ModelCapabilities {
  if (!modelMetadata || typeof modelMetadata !== 'object') {
    return { image_input: 'Unknown', source: 'Runtime' };
  }

  if (modelMetadata.capabilities && typeof modelMetadata.capabilities.vision === 'boolean') {
    return {
      image_input: modelMetadata.capabilities.vision ? 'Supported' : 'Unsupported',
      source: 'Runtime',
    };
  }

  if (Array.isArray(modelMetadata.capabilities)) {
    if (modelMetadata.capabilities.includes('vision')) {
      return { image_input: 'Supported', source: 'Runtime' };
    } else {
      return { image_input: 'Unsupported', source: 'Runtime' };
    }
  }

  return { image_input: 'Unknown', source: 'Runtime' };
}

/**
 * Dispatches capability inspection to the specific runtime inspector.
 */
export function inspectProviderCapabilities(provider: string, metadata?: any): ModelCapabilities {
  switch (provider.toLowerCase()) {
    case 'ollama':
      return inspectOllamaCapabilities(metadata);
    case 'lmstudio':
      return inspectLMStudioCapabilities(metadata);
    case 'llamacpp':
      return inspectLlamaCppCapabilities(metadata);
    case 'vllm':
      return inspectVllmCapabilities(metadata);
    case 'mlx':
      return inspectMlxCapabilities(metadata);
    case 'unsloth':
      return inspectUnslothCapabilities(metadata);
    default:
      return { image_input: 'Unknown', source: 'Runtime' };
  }
}

/**
 * Conservative fallback heuristic for image input, clearly isolated from runtime detection.
 * Marked with CapabilitySource: 'Fallback'.
 */
export function applyFallbackHeuristic(modelId: string): ModelCapabilities {
  const lower = modelId.toLowerCase();
  const isLikelyVision =
    lower.includes('-vl') ||
    lower.includes('_vl') ||
    lower.includes('vl-') ||
    lower.includes('-vision') ||
    lower.includes('_vision') ||
    lower.includes('llava') ||
    lower.includes('minicpm-v');

  if (isLikelyVision) {
    return { image_input: 'Supported', source: 'Fallback' };
  }
  return { image_input: 'Unknown', source: 'Fallback' };
}

/**
 * Resolves model capabilities according to the strict priority contract:
 * 1. Inspect actual provider/runtime metadata first.
 * 2. If runtime explicitly says Supported or Unsupported, return immediately.
 *    A fallback mechanism must NEVER override an explicit runtime declaration!
 * 3. ONLY if runtime returns Unknown may the fallback heuristic be evaluated.
 */
export function resolveModelCapabilities(
  provider: string,
  metadata: any,
  modelId: string
): ModelCapabilities {
  const runtimeCaps = inspectProviderCapabilities(provider, metadata);

  if (runtimeCaps.image_input !== 'Unknown') {
    return runtimeCaps;
  }

  return applyFallbackHeuristic(modelId);
}
