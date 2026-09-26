# Supported Model Types & Taxonomy — Unfuse

This document defines the canonical classification of models supported in **Unfuse** (both Desktop & CLI). It outlines the supported model categories, their role in the multi-model assembly line, tool permission boundaries, and why secondary categories are absorbed or excluded.

---

## 1. Overview & Strategy

Unfuse is an AI coding assistant and agent environment engineered for local hardware execution (Ollama, LM Studio, vLLM, llama.cpp). 

Rather than treating all models as generic chat bots, Unfuse classifies local open-weight models into **4 First-Class User-Facing Tiers** and **1 Background Infrastructure Tier**. This ensures:
1. **Strict Tool Safety**: Models only receive the tools relevant to their architectural capability.
2. **Context Efficiency**: Context handoffs stay under ~600 tokens by transferring structured deliverables rather than noisy chat transcripts.
3. **VRAM Protection**: Memory is scheduled sequentially on local GPUs to prevent out-of-memory errors and thrashing.

---

## 2. The Core Model Taxonomy

```text
UNFUSE MODEL TAXONOMY
│
├── USER-FACING (Pipeline Relay Tiers)
│   ├── [CODE]     Coding Models          (e.g., Qwen2.5-Coder, DeepSeek-Coder, Codestral)
│   ├── [REASON]   Reasoning Models       (e.g., DeepSeek-R1, QwQ-32B, Phi-4)
│   ├── [VISION]   Vision-Language (VLM)  (e.g., Qwen2-VL, LLaVA-NeXT, Llama-3.2-Vision)
│   └── [GENERAL]  General / Instruct     (e.g., Llama 3.1, Gemma 4, Mistral-Nemo)
│
└── BACKGROUND INFRASTRUCTURE
    └── [RETRIEVAL] Embedding & Reranker   (e.g., nomic-embed-text, bge-m3, bge-reranker)
```

---

## 3. Tier Breakdown & Permission Matrix

| Model Tier | Badge | Architectural Role | Benchmark / Training Focus | Tool Permissions | Example Models |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Coding** | `[CODE]` | **The Workhorse:** File creation, surgical diff edits, compiler error resolution, Fill-In-The-Middle (FIM) syntax. | Code token training, HumanEval, SWE-bench, RepoBench. | Full Development Suite:<br>`[read, write, edit, bash]` | `qwen2.5-coder:7b/32b`, `deepseek-coder-v2`, `codestral-22b` |
| **Reasoning** | `[REASON]` | **The Architect:** Deep multi-step problem solving, architecture planning, logic verification, and security auditing. | Reinforcement Learning, long Chain-of-Thought (`<think>`), MATH, ARC. | Thinking Only / Audit:<br>`[]` or `[read]` *(Never writes code blindly)* | `deepseek-r1:8b/14b/32b`, `qwq-32b`, `phi-4` |
| **Vision (VLM)** | `[VISION]` | **The Eyes:** Analyzing UI screenshots, wireframes, component layouts, and visual error modals. | Multimodal ViT/SigLIP visual encoding, DocVQA, spatial layout. | Visual Perception Only:<br>`[]` *(No file system access)* | `qwen2-vl:7b`, `llava-v1.6`, `llama-3.2-11b-vision` |
| **General** | `[GENERAL]` | **The Communicator:** Human-friendly summaries, technical documentation, pair-programming dialogue, and PR descriptions. | Instruction-tuned chat (SFT + DPO/RLHF), broad knowledge. | Conversational / Read-Only:<br>`[read]` | `llama3.1:8b/70b`, `gemma-4:12b`, `mistral-nemo:12b` |
| **Retrieval** | `[RETRIEVAL]` | **The Indexer:** Background vectorization and re-scoring of codebase files for semantic code search (RAG). | Dense vector representations, bi-encoder similarity, cross-encoder reranking. | Background Service:<br>*(Does not participate in chat UI)* | `nomic-embed-text`, `bge-m3`, `bge-reranker-large` |

---

## 4. Why Other Theoretical Categories Are Omitted or Absorbed

Modern open-weight benchmarks catalog dozens of niche tasks. Unfuse purposefully avoids cluttering the interface with redundant categories:

### A. `OCR` & `Document Understanding` $\rightarrow$ Absorbed by `Vision (VLM)`
* **Rationale:** Modern Vision-Language Models (e.g., `Qwen2-VL`) natively combine visual layout comprehension with high-accuracy character recognition. 
* **Outcome:** When a developer attaches an image of an error dialog or a PDF schema, the `Vision` model handles both pixel interpretation and text extraction in a single pass. A separate OCR blade is redundant.

### B. `Math` $\rightarrow$ Absorbed by `Reasoning`
* **Rationale:** Software engineering mathematical logic (algorithmic complexity, bounds, cryptographic invariants) requires deductive reasoning rather than rote calculator lookups.
* **Outcome:** `Reasoning` models (`DeepSeek-R1`, `QwQ`) natively dominate math evaluations (GSM8K, MATH). A separate math category is unnecessary.

### C. `Translation` $\rightarrow$ Absorbed by `General` & `Coding`
* **Natural language translation** (e.g., English to Japanese comments or localization) is handled natively by `General/Instruct` models.
* **Code translation** (e.g., Python to Rust) requires deep syntax and compiler AST knowledge, which is executed by `Coding` models.

### D. `Audio / Speech` $\rightarrow$ Handled as Input Peripheral (Not an Agent)
* **Rationale:** Developers do not chat with `@whisper` to solve coding problems.
* **Outcome:** Audio transcription (STT via Whisper) is integrated as an optional voice input button in the chat prompt bar, converting voice to text before the prompt enters the execution pipeline.

### E. `Video` $\rightarrow$ Excluded
* **Rationale:** Video models require extreme VRAM (30GB–48GB+) and operate on 30fps image sequences.
* **Outcome:** Software debugging relies on static snapshots (screenshots, stack traces, diagrams), which `Vision` models handle efficiently without local hardware crashes.

### F. `Agent / Tool-use` $\rightarrow$ Unfuse IS the Agent Harness
* **Rationale:** "Tool use" is not an independent task modality; it is an API protocol (function calling).
* **Outcome:** Unfuse provides the tool sandbox. Coding and General models are dynamically granted or denied tool access via the `ToolPolicyGate`.

---

## 5. Multi-Model Pipeline Behavior

When multiple models are invoked in a prompt (e.g., `@qwen2-vl @deepseek-r1 @qwen2.5-coder @llama3.1`), Unfuse assigns their roles and tool sets based on this taxonomy:

```text
[User Prompt + Screenshot]
        │
        ▼
1. @qwen2-vl [VISION] ──────> Analyzes visual bug (Tools: [])
        │                     Produces: "Button hidden behind modal backdrop."
        ▼
2. @deepseek-r1 [REASON] ───> Plans fix architecture (Tools: [])
        │                     Produces: "Z-index ordering fix in checkout.css."
        ▼
3. @qwen2.5-coder [CODE] ───> Implements solution (Tools: [read, write, edit, bash])
        │                     Produces: Code diff modifying checkout.css.
        ▼
4. @llama3.1 [GENERAL] ─────> Summarizes turn for user (Tools: [])
                              Produces: Final explanation and test commands.
```

### When Models Belong to the Same Category
If a user specifies multiple models of the same category (e.g., `@qwen-coder @deepseek-coder`):
1. **Mention Order (Left-to-Right)**: The first model acts as the **Author** (drafts the implementation); the second acts as the **Critic/Auditor** (audits the code in read-only mode).
2. **Parameter Hierarchy**: If parameter sizes differ (e.g., `7b` vs `32b`), the smaller model drafts the boilerplate quickly, and the larger model reviews for edge cases.

---

## 6. Supported Local Runtimes & Default Endpoints

Unfuse connects to all local providers via OpenAI-compatible streaming endpoints:

| Runtime | Default Base URL | Default Port | Notes |
| :--- | :--- | :--- | :--- |
| **Ollama** | `http://localhost:11434/v1` | `11434` | Automatic hardware layer and model pulling. |
| **LM Studio** | `http://localhost:1234/v1` | `1234` | Full GUI and Apple Silicon MLX/Metal support. |
| **vLLM** | `http://localhost:8000/v1` | `8000` | High-throughput PagedAttention server. |
| **llama.cpp** | `http://localhost:8080/v1` | `8080` | Native GGUF inference server. |
| **Jan.ai** | `http://localhost:1337/v1` | `1337` | Local desktop runner. |
| **Unsloth** | `http://localhost:8888/v1` | `8888` | Fast fine-tuned local inference. |
