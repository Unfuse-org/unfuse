# Unfuse

> **The Sovereign, Local-First AI Developer Workstation.**  
> Unfuse your code and intelligence from closed cloud silos, vendor moats, and telemetry.

---

## ⚡ Overview

**Unfuse** is a high-performance local AI coding workstation designed to orchestrate multi-agent development workflows directly on your machine. Connect your local model runners (Ollama, LM Studio, vLLM, Apple MLX, Jan.ai, llama.cpp), link your local databases and tools, and build with autonomous agents with zero cloud middleware.

### 🌟 Key Highlights

- **Unified Multi-Provider Local Swarm**: Auto-detects local loopback ports (Ollama `11434`, LM Studio `1234`, vLLM `8000`, MLX `8080`, Jan `1337`).
- **Universal Stream Normalizer**: Translates NDJSON, OpenAI-compatible SSE chunks, and raw token buffers into a unified zero-latency internal stream format.
- **Hardware & VRAM Budgeting**: Dynamic parameter routing across Micro (0.5B–3B), Standard (7B–14B), and Heavy (32B–70B) tiers.
- **Zero-Cloud Integrations Hub**: Direct local integrations with GitHub, Linear, PostgreSQL, SQLite, Brave Search, DuckDuckGo, Tavily, Sentry, Slack, and Model Context Protocol (MCP).
- **100% Offline & Private**: Zero cloud telemetry, zero remote tracking, pure local execution.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [Rust](https://rustup.rs/) (for Tauri desktop builds)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/Unfuse-org/unfuse.git
cd unfuse

# Install dependencies
npm install

# Start local frontend development server
npm run dev

# Run full desktop application with Tauri
npm run tauri dev
```

### Production Build

```bash
# Compile TypeScript & bundle frontend
npm run build

# Package desktop binary for macOS / Linux / Windows
npm run tauri build
```

---

## 🛠️ Architecture

```
unfuse/
├── src/              # React desktop workstation UI & client engine
│   ├── components/   # Chat canvas, model rack, diff viewer, integrations hub
│   ├── engine/       # Multi-provider LLM client, tool executor, DB client, MCP
│   └── assets/       # Icons, brand assets & typography
├── src-tauri/        # Rust native desktop core & system bridges
│   └── src/          # Native OS filesystem, shell executor, SQLite DB, telemetry
└── website/          # Official landing page & marketing site
```

---

## 📄 License

MIT License. Built for developers who own their code.
