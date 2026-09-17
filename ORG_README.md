<div align="center">

  <img src="https://raw.githubusercontent.com/Unfuse-org/unfuse/main/macos-squircle-icon.png" alt="Unfuse Logo" width="130" height="130" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />

  # U N F U S E
  
  ### The Sovereign, Local-First AI Developer Workstation
  
  <p align="center">
    <b>Unfuse your code and intelligence from closed cloud silos, telemetry moats, and proprietary API gateways.</b><br />
    Harness the full power of autonomous multi-agent coding workflows directly on your local silicon.
  </p>

  <p align="center">
    <a href="https://github.com/Unfuse-org/unfuse"><img src="https://img.shields.io/badge/Desktop_App-v1.0.0-8B5CF6?style=for-the-badge&logo=tauri&logoColor=white" alt="Version" /></a>
    <a href="https://github.com/Unfuse-org/unfuse/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge" alt="License" /></a>
    <a href="https://github.com/Unfuse-org/unfuse"><img src="https://img.shields.io/badge/Architecture-Tauri%20%2B%20Rust%20%2B%20React-000000?style=for-the-badge&logo=rust&logoColor=orange" alt="Stack" /></a>
    <a href="https://github.com/Unfuse-org/unfuse"><img src="https://img.shields.io/badge/Privacy-100%25%20Offline%20%26%20Air--Gapped-3B82F6?style=for-the-badge&logo=shield&logoColor=white" alt="Privacy" /></a>
    <a href="https://github.com/Unfuse-org/unfuse"><img src="https://img.shields.io/badge/MCP-Protocol%20Ready-EC4899?style=for-the-badge&logo=json&logoColor=white" alt="MCP Ready" /></a>
  </p>

  <p align="center">
    <a href="https://github.com/Unfuse-org/unfuse#readme"><b>Explore Workstation</b></a> •
    <a href="https://github.com/Unfuse-org/unfuse#-getting-started"><b>Quickstart</b></a> •
    <a href="#-the-unfuse-engine"><b>Architecture</b></a> •
    <a href="#-supported-local-runners"><b>Local Runners</b></a> •
    <a href="#-ecosystem-repositories"><b>Ecosystem</b></a> •
    <a href="#-manifesto"><b>Manifesto</b></a>
  </p>

</div>

---

> [!IMPORTANT]
> **Zero Telemetry. Zero Cloud Gateways. 100% Sovereign Execution.**  
> Unfuse operates entirely within your local machine. Your codebase, AST maps, weights, and agent scratchpads never leave your loopback interface.

---

## ⚡ Why Unfuse?

Modern AI developer tools force you to beam entire repositories, proprietary trade secrets, and API credentials to centralized cloud providers. 

**Unfuse fundamentally redesigns the AI development stack around local silicon:**

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎛️ Dynamic Model Rack</h3>
      Mount, hot-swap, and orchestrate multiple local model instances (Ollama, LM Studio, vLLM, Apple MLX, llama.cpp, Jan) into a unified inference blade.
    </td>
    <td width="50%" valign="top">
      <h3>📊 Btop-Style VRAM Telemetry</h3>
      Real-time hardware metrics tracking GPU pressure, memory bandwidth, context utilization, and token generation velocities.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🌊 Universal Stream Normalizer</h3>
      Zero-latency stream pipeline unifying OpenAI SSE, NDJSON, Anthropic chunks, and raw token buffers into a structured agent stream.
    </td>
    <td width="50%" valign="top">
      <h3>🌳 Tree-Sitter AST Indexer</h3>
      Deep local repo intelligence with symbol dependency graphs, token-budget router, and semantic context slicing without cloud embeddings.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🛡️ Zero-Cloud Security Shield</h3>
      Path traversal containment, deterministic Myers diff reviews, interactive terminal guardrails, and automated secret redactors.
    </td>
    <td width="50%" valign="top">
      <h3>🔌 Extensible MCP & Integrations</h3>
      Native Model Context Protocol (MCP) server support plus local links to Linear, GitHub, PostgreSQL, SQLite, Brave, and DuckDuckGo.
    </td>
  </tr>
</table>

---

## 🏗️ Architecture Blueprint

Unfuse bridges native desktop performance with high-throughput local inference runners via a secure, zero-latency loopback architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      UNFUSE DESKTOP WORKSTATION                        │
│            React 18  •  Tailwind CSS  •  Lucide  •  Ant Design         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tauri v2 IPC Bridge (Native Rust Core)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       LOCAL BACKEND ORCHESTRATOR                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   AST Indexer    │  │  Security Guard  │  │   Telemetry Engine   │  │
│  │  (Tree-sitter)   │  │ (Path / Secrets) │  │  (GPU/VRAM Tracking) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │              │
│  ┌────────▼─────────────────────▼───────────────────────▼───────────┐  │
│  │      Universal Stream Normalizer & Dynamic Token Budgeter        │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │ Loopback HTTP / IPC (127.0.0.1)
┌─────────────────────────────────▼──────────────────────────────────────┐
│                       SOVEREIGN LOCAL RUNNERS                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────┐ │
│  │  Ollama   │  │ LM Studio │  │   vLLM    │  │ Apple MLX │  │ llama │ │
│  │  :11434   │  │   :1234   │  │   :8000   │  │   :8080   │  │  .cpp │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Supported Local Runners & Model Matrix

Unfuse auto-discovers local loopback endpoints out of the box:

| Local Runner | Default Port | Auto-Discovery | Recommended Model Families | Primary Use Case |
| :--- | :---: | :---: | :--- | :--- |
| **[Ollama](https://ollama.com/)** | `11434` | ✅ Detected | `deepseek-r1`, `qwen2.5-coder`, `llama3.3` | General agentic workflows & coding |
| **[LM Studio](https://lmstudio.ai/)** | `1234` | ✅ Detected | `Qwen 2.5 Coder 14B/32B`, `Mistral Small` | Interactive chat & local model testing |
| **[vLLM](https://vllm.ai/)** | `8000` | ✅ Detected | High-concurrency quantized endpoints | High-throughput batch reasoning |
| **[Apple MLX](https://github.com/ml-explore/mlx)** | `8080` | ✅ Detected | Apple Silicon optimized 4-bit/8-bit models | Mac Studio & MacBook Pro hardware acceleration |
| **[Jan.ai](https://jan.ai/)** | `1337` | ✅ Detected | Cortex local engine models | Lightweight offline coding assistance |
| **[llama.cpp](https://github.com/ggerganov/llama.cpp)** | `8080` | ✅ Detected | Raw GGUF quantizations | Maximum CPU/GPU hardware flexibility |

---

## 🚀 Quickstart in 60 Seconds

Experience the sovereign developer workstation on your local machine:

### 1. Clone & Setup
```bash
# Clone the core desktop workstation
git clone https://github.com/Unfuse-org/unfuse.git
cd unfuse

# Install dependencies
npm install
```

### 2. Launch Development Workstation
```bash
# Start frontend preview
npm run dev

# Or launch full native desktop environment (Rust + Tauri)
npm run tauri dev
```

### 3. Spin Up Your Local Model
In a separate terminal, launch your preferred local inference server:
```bash
# Example using Ollama
ollama run qwen2.5-coder:14b

# Or reasoning with DeepSeek
ollama run deepseek-r1:14b
```
*Unfuse will immediately detect your runner on loopback and mount it into your active Model Rack.*

---

## 📦 Ecosystem Repositories

| Repository | Status | Description |
| :--- | :---: | :--- |
| **[unfuse](https://github.com/Unfuse-org/unfuse)** | `Stable` | The flagship sovereign, local-first AI developer workstation (Tauri + React + Rust). |
| **[mcp-servers](https://github.com/Unfuse-org)** | `Coming Soon` | Curated, hardened Model Context Protocol servers for local developer toolchains. |
| **[engine](https://github.com/Unfuse-org)** | `Active` | Standalone local-first AST indexer, stream normalizer, and model router backend. |
| **[.github](https://github.com/Unfuse-org/.github)** | `Maintained` | Organization profile, community guidelines, and issue templates. |

---

## 📜 Manifesto: The Sovereign Developer

> 1. **Code Privacy is Non-Negotiable**: No developer should be forced to upload proprietary IP or client source code to unverified cloud servers.
> 2. **Local Hardware is Powerful Enough**: Modern NPUs, Apple Silicon chips, and consumer GPUs have the compute capacity to run world-class reasoning models locally.
> 3. **No Vendor Lock-in**: Your developer environment should never break because an external cloud API throttled your quota or depreciated a model endpoint.
> 4. **Deterministic Transparency**: Every file modification, terminal command, and tool call must be auditable before execution.

---

## 🤝 Join the Movement

We are building the future of sovereign, local-first software engineering. Here is how you can get involved:

- ⭐ **Star the project** on [GitHub](https://github.com/Unfuse-org/unfuse) to support the mission.
- 🐛 **Report issues** or suggest local runner integrations via [Issues](https://github.com/Unfuse-org/unfuse/issues).
- 💡 **Submit Pull Requests** to improve our Tree-sitter parsers, telemetry metrics, or UI components.
- 🗣️ **Join the conversation** in our [GitHub Discussions](https://github.com/Unfuse-org/unfuse/discussions).

<div align="center">
  <sub>Built with ⚡ by the Unfuse Community. For developers who own their code.</sub>
</div>
