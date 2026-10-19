# Graph Report - unfuse  (2026-10-15)

## Corpus Check
- 226 files · ~450,805 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .xml 2, .ipynb 1)

## Summary
- 1271 nodes · 2382 edges · 170 communities (42 shown, 128 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: unavailable for semantic workers; AST uses no LLM tokens. Placeholder numeric fields are not usage measurements.

## Community Hubs (Navigation)
- Agent Execution Lifecycle
- Provider Streaming Protocol
- External Service Adapters
- Filesystem Access Guardrails
- Integration Configuration UI
- SQLite Session Database
- Chat Integration Presentation
- Runtime Capability Discovery
- Backend Plans and Constraints
- MCP Client Transport
- Storage Boundary Tests
- Frontend Runtime Dependencies
- Model Rack Configuration
- Provider Brand Components
- UI Development Guidelines
- Chat Sidebar Organization
- Accessibility Contrast Tools
- Native Terminal Sessions
- Chat Message Presentation
- Persisted Event Schema
- Vite Development Instrumentation
- Workspace Tools Panel
- Legacy JSONL History
- Themes and Settings
- Tool Dispatch Policy
- Shell Process Execution
- Workspace Mascot Launcher
- Legacy Chat Backend Client
- Tauri Application Configuration
- TypeScript Compiler Configuration
- Session Storage API
- Application Navigation Shell
- Legacy SQLite Index
- Reticle Setup Nudge
- ARGUS Terminal Prototype
- Chat Visual Renderers
- Provider Connection Onboarding
- Historical Backend Issues
- Code Diff Presentation
- Model Metadata Resolution
- Library File Previews
- UI Review Handoff
- Integration Type Contracts
- Motion Performance Guidance
- Runtime UI Verification
- Build Verification Workflow
- HTML Application Entry
- Package Run Scripts
- Legacy Import Identity
- UI Baseline Constraints
- Image Module Types
- Black curved triangular emblem split
- White pixel octopus inside a
- unfuse-desktop
- Blue four-point star with circular
- White pixel octopus seated at
- White pixel octopus on black
- White pixel octopus reaching toward
- White pixel octopus surrounded by
- White pixel octopus wearing a
- White pixel octopus running beside
- Octopus mascot holding money beside
- Meditating octopus mascot beneath moon
- Pixel octopus mascot seated at
- Armored octopus mascot with a
- Octopus mascot inside a round
- Pixel octopus mascot drinking from
- Microsoft four colored square mark
- AI21 black typographic wordmark
- AI2 pink four arm geometric
- Aleph Alpha black curved symmetric
- Apple black bitten apple silhouette
- Arcee teal radiating triangular wedges
- Aya blue leaf cluster mark
- BAAI black outlined interlocking geometric
- Baichuan orange vertical geometric wordmark
- Bilibili Index black atom shaped
- ChatGLM blue elephant inside a
- CodeGeeX cyan and blue opposed
- CogView multicolored parrot over a
- Cohere green capsule with orange
- DBRX red outlined stack of
- Deep Cogito blue outlined triangular
- DeepSeek blue whale silhouette
- Dolphin black halftone jumping dolphin
- Essential AI purple ring and
- FLUX black triangular geometric mark
- Gemma blue four point star
- Hugging Face yellow smiling face
- Hunyuan blue circular flowing wave
- IBM black striped letter wordmark
- InternLM gray illustrated scholarly face
- Jina black lowercase j shaped
- Kolors bright lime rounded loop
- LG white face formed from
- Liquid black angular diamond with
- LongCat green angular arch framing
- Meta blue continuous infinity loop
- Microsoft four colored square mark
- MiniMax pink to orange vertical
- Mistral pixelated orange yellow and
- Moonshot black striped circular mark
- Nous Research monochrome illustrated woman
- NVIDIA green stylized eye and
- OpenAI black interlocking six loop
- OpenChat blue rounded speech bubble
- Qwen purple interlocking angular star
- RWKV purple bird silhouette
- SenseNova overlapping purple and green
- Skywork blue and turquoise opposing
- Snowflake blue six arm snowflake
- Stability purple S with separate
- StepFun blue angular step mark
- TII purple letters within an
- Upstage purple rising diagonal stack
- Wenxin blue outlined hexagonal cube
- Xiaomi MiMo black two line
- Yi black branching Y shaped
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a
- White pixel octopus on a

## God Nodes (most connected - your core abstractions)
1. `react` - 41 edges
2. `lucide-react` - 34 edges
3. `renderIntegrationLogo()` - 29 edges
4. `StorageManager` - 24 edges
5. `PersistedEvent` - 23 edges
6. `EventPayload` - 20 edges
7. `ServiceConfig` - 19 edges
8. `LocalModelBlade` - 19 edges
9. `run_agent_loop()` - 18 edges
10. `ChatMessage` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Surgical Changes` --conceptually_related_to--> `Minimal Diff`  [INFERRED]
  .agents/skills/karpathy-guidelines/SKILL.md → AGENTS.md
- `sync_integration_config()` --references--> `ServiceConfig`  [EXTRACTED]
  src-tauri/src/main.rs → src-tauri/src/integrations/mod.rs
- `import_rejects_malformed_and_changed_logs_without_partial_session()` --calls--> `compute_workspace_hash()`  [INFERRED]
  src-tauri/src/storage/sqlite.rs → src-tauri/src/storage/mod.rs
- `PluginDetailCanvasProps` --references--> `ServiceId`  [EXTRACTED]
  src/components/integrations/PluginDetailCanvas.tsx → src/components/integrations/types.ts
- `SettingsViewProps` --references--> `LocalModelBlade`  [EXTRACTED]
  src/components/settings/SettingsView.tsx → src/components/rack/types.ts

## Import Cycles
- None detected.

## Communities (170 total, 128 thin omitted)

### Community 0 - "Agent Execution Lifecycle"
Cohesion: 0.05949367088607595
Nodes (50): cancel_agent_turn(), cleanup_test_session(), get_or_create_session(), is_session_cancelled(), LlmConfigPayload, make_capturing_sink(), make_test_config(), MAX_CONTEXT_TOOL_OUTPUT_CHARS (+42 more)

### Community 1 - "Provider Streaming Protocol"
Cohesion: 0.06821480406386067
Nodes (29): AssembledToolCall, base64_encode(), ContentPart, AudioUrl, ImageUrl, Text, VideoUrl, load_image_ref_to_data_url() (+21 more)

### Community 3 - "External Service Adapters"
Cohesion: 0.12323232323232323
Nodes (20): BraveProvider, DatadogProvider, DuckDuckGoProvider, ExaProvider, ExternalTool, FirecrawlProvider, GitHubProvider, GoogleProvider (+12 more)

### Community 4 - "Filesystem Access Guardrails"
Cohesion: 0.08527131782945736
Nodes (31): PromptIngestor, edit_file(), MAX_EDIT_FILE_BYTES, MAX_READ_BYTES, read_file(), test_edit_multiple_occurrences_error(), test_edit_not_found_error(), test_edit_preserves_crlf() (+23 more)

### Community 5 - "Integration Configuration UI"
Cohesion: 0.14169570267131243
Nodes (36): IntegrationsModal(), DEFAULT_STATES, deleteMcpServer(), disconnectService(), getAllServiceStates(), getManagedMcpConfigForService(), getMcpServers(), getServiceState() (+28 more)

### Community 6 - "SQLite Session Database"
Cohesion: 0.11522048364153627
Nodes (14): backup_restore_includes_wal_and_preserves_previous_backup(), branch_continuation_survives_reopen_without_jsonl(), directory(), failed_append_rolls_back_event_sequence_leaf_and_title(), import_rejects_malformed_and_changed_logs_without_partial_session(), lock_runtime(), MIGRATION_1, migration_immutability_and_constraints() (+6 more)

### Community 7 - "Chat Integration Presentation"
Cohesion: 0.16516516516516516
Nodes (33): CodebaseFileItem, COMMAND_LIST, WORKSPACE_FILES, buildPlatformReadCommand(), buildPlatformShellCommand(), extractDomain(), ParsedTool, parseToolInfo() (+25 more)

### Community 8 - "Runtime Capability Discovery"
Cohesion: 0.1411764705882353
Nodes (31): CapabilitySource, Fallback, Runtime, CapabilityStatus, Supported, Unknown, Unsupported, inspect_llamacpp_capabilities() (+23 more)

### Community 9 - "Backend Plans and Constraints"
Cohesion: 0.0625
Nodes (6): Karpathy Guidelines, Backend first deliverable: history baseline and contract proposal, SQLite storage implementation, StorageManager, run_agent_turn, Unfuse

### Community 10 - "MCP Client Transport"
Cohesion: 0.12043010752688173
Nodes (9): test_mcp_server(), extract_content_text(), get_enriched_path(), McpClient, McpServerConfig, McpTestResult, McpTool, probe_mcp_server() (+1 more)

### Community 11 - "Storage Boundary Tests"
Cohesion: 0.15402298850574714
Nodes (17): SessionSummary, create_session(), default_storage_dir(), GLOBAL_STORAGE, list_sessions(), search_sessions(), storage_dir_from_home(), test_append_read_round_trip() (+9 more)

### Community 12 - "Frontend Runtime Dependencies"
Cohesion: 0.06436781609195402
Nodes (30): dependencies, diff, eventsource-parser, lucide-react, prismjs, react, react-dom, react-markdown (+22 more)

### Community 13 - "Model Rack Configuration"
Cohesion: 0.1425287356321839
Nodes (23): ChatPanelProps, MainChatPanelProps, ModelFamilyLogo(), modelLogoCatalog, DashboardView(), BladeConfigView(), BladeConfigViewProps, ModelBladeCard() (+15 more)

### Community 15 - "UI Development Guidelines"
Cohesion: 0.06896551724137931
Nodes (7): antislop-code, antislop-copywriting, antislop-human, antislop-layoutmobile, antislop, antislop-ui, fixing-accessibility

### Community 16 - "Chat Sidebar Organization"
Cohesion: 0.09852216748768473
Nodes (11): INITIAL_SESSIONS, SessionItem(), SessionItemProps, SidebarPanel(), SidebarPanelProps, NewChatIcon(), PinIcon(), SearchIcon() (+3 more)

### Community 17 - "Accessibility Contrast Tools"
Cohesion: 0.12962962962962962
Nodes (18): contrast_ratio(), linearize(), luminance(), main(), parse_hex(), parse_pairing(), parse_reference_rows(), reference_doc_path() (+10 more)

### Community 18 - "Native Terminal Sessions"
Cohesion: 0.13675213675213677
Nodes (13): Session, shell_input_resize_and_cleanup(), size(), terminal_close(), terminal_open(), terminal_resize(), terminal_write(), TerminalOutput (+5 more)

### Community 19 - "Chat Message Presentation"
Cohesion: 0.13105413105413105
Nodes (20): @tauri-apps/api, BtopTelemetryPopover(), BtopTelemetryPopoverProps, ChatInputProps, ClarificationPanelProps, MessageItem(), MessageItemProps, PROMPT_EASTER_EGG_COLORS (+12 more)

### Community 20 - "Persisted Event Schema"
Cohesion: 0.09
Nodes (18): EventPayload, ActiveLeaf, AssistantTurn, Cancellation, Compaction, Error, PermissionDecision, PipelineStageComplete (+10 more)

### Community 21 - "Vite Development Instrumentation"
Cohesion: 0.09486166007905138
Nodes (21): name, private, type, version, autoprefixer, eventsource-parser, postcss, @reticlehq/react (+13 more)

### Community 22 - "Workspace Tools Panel"
Cohesion: 0.1067193675889328
Nodes (21): simple-icons, @xterm/addon-fit, @xterm/xterm, AddPanel(), AddPanelOption, AddPanelProps, ArtifactItem, CONTROL_FLOW_KEYWORDS (+13 more)

### Community 23 - "Legacy JSONL History"
Cohesion: 0.1761904761904762
Nodes (8): PersistedEvent, ActiveContext, JsonlSessionStore, RecoveryReport, RecoveryStatus, Clean, Interrupted, SessionRecoveryScanner

### Community 24 - "Themes and Settings"
Cohesion: 0.17142857142857143
Nodes (15): detailSections, sections, SettingRow, SettingsDetails(), SettingsView(), SettingsViewProps, ThemeIcon(), themeIcons (+7 more)

### Community 25 - "Tool Dispatch Policy"
Cohesion: 0.1523809523809524
Nodes (15): canonical_tool_name(), execute_tool(), execute_tool_with_context(), execute_tool_with_pid_callback(), get_filtered_tool_definitions(), get_tool_action_type(), get_tool_definitions(), is_tool_allowed() (+7 more)

### Community 26 - "Shell Process Execution"
Cohesion: 0.1695906432748538
Nodes (15): BashOutput, DEFAULT_TIMEOUT_SECS, execute_bash(), execute_bash_with_pid_callback(), MAX_OUTPUT_BYTES, MAX_TIMEOUT_SECS, OutputMsg, Chunk (+7 more)

### Community 27 - "Workspace Mascot Launcher"
Cohesion: 0.1111111111111111
Nodes (8): createShuffledDeck(), DEFAULT_RECENTS, MascotItem, MASCOTS, RecentProject, WORKSPACE_QUOTES, WorkspaceLauncher(), WorkspaceLauncherProps

### Community 28 - "Legacy Chat Backend Client"
Cohesion: 0.15204678362573099
Nodes (16): ChatInput(), ChatPanel(), FALLBACK_OFFLINE_MODEL, fetchLocalOllamaModels(), INITIAL_MESSAGES, LeftPanelToggleIcon(), RightPanelToggleIcon(), ClarificationPanel() (+8 more)

### Community 29 - "Tauri Application Configuration"
Cohesion: 0.10526315789473684
Nodes (18): app, macOSPrivateApi, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+10 more)

### Community 30 - "TypeScript Compiler Configuration"
Cohesion: 0.1111111111111111
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 31 - "Session Storage API"
Cohesion: 0.20833333333333334
Nodes (5): ActiveContextPayload, get_storage(), load_session(), rebuild_index(), StorageManager

### Community 32 - "Application Navigation Shell"
Cohesion: 0.25274725274725274
Nodes (9): lucide-react, App(), NavigationIcon(), MainChatPanel(), starters, instructionScopes, MemoryView(), ModelLogsView() (+1 more)

### Community 34 - "Reticle Setup Nudge"
Cohesion: 0.24242424242424243
Nodes (6): main(), needsNudge(), NUDGED_FILE, pinnedServer(), readJson(), WEB_DEPS

### Community 36 - "Chat Visual Renderers"
Cohesion: 0.21212121212121213
Nodes (6): react, CodeBlock(), CodeBlockProps, CONTROL_FLOW_KEYWORDS, LanguageIcon(), LanguageIconProps

### Community 37 - "Provider Connection Onboarding"
Cohesion: 0.3484848484848485
Nodes (11): DetectedModel, OnboardingModal(), OnboardingModalProps, getProviderLogo(), LlamaCppLogo(), LMStudioLogo(), MLXLogo(), OllamaLogo() (+3 more)

### Community 38 - "Historical Backend Issues"
Cohesion: 0.18181818181818182
Nodes (4): Architectural Issues & Technical Debt, events_to_chat_messages, execute_tool_with_context, run_agent_loop_multimodal

### Community 39 - "Code Diff Presentation"
Cohesion: 0.2
Nodes (7): diff, prismjs, detectLangFromFilename(), DiffViewer(), DiffViewerProps, ChangesPanel(), ChangesPanelProps

### Community 40 - "Model Metadata Resolution"
Cohesion: 0.2727272727272727
Nodes (9): ModelInfoModal(), formatBytes(), formatModelSubtitle(), logoFamilies, logoNames, logoPublishers, ResolvedModelInfo, resolveModelInfo() (+1 more)

### Community 41 - "Library File Previews"
Cohesion: 0.26666666666666666
Nodes (8): react-dom, react-markdown, remark-gfm, AttachmentCategory, AttachmentItem, LibraryView(), PreviewItem, QuickLookPreview()

### Community 42 - "UI Review Handoff"
Cohesion: 0.2222222222222222
Nodes (3): Improve UI interface policy, Design plan template, Improve UI

### Community 43 - "Integration Type Contracts"
Cohesion: 0.4
Nodes (5): CommandItem, IntegrationsModalProps, CategorySection, ServiceConnectModalProps, ServiceId

### Community 48 - "Package Run Scripts"
Cohesion: 0.5
Nodes (4): scripts, build, dev, tauri

### Community 49 - "Legacy Import Identity"
Cohesion: 0.8333333333333334
Nodes (3): compute_workspace_hash(), test_legacy_import_is_idempotent_and_preserves_originals(), test_read_events_corrupted_middle_line_rejected()

## Knowledge Gaps
- **173 isolated node(s):** `@tauri-apps/plugin-shell`, `@types/diff`, `@types/prismjs`, `eventsource-parser`, `@reticlehq/react` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 579 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **128 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Chat Visual Renderers` to `Application Navigation Shell`, `Integration Configuration UI`, `Provider Connection Onboarding`, `Chat Integration Presentation`, `Code Diff Presentation`, `Library File Previews`, `Model Metadata Resolution`, `Model Rack Configuration`, `Provider Brand Components`, `Chat Sidebar Organization`, `Chat Message Presentation`, `Vite Development Instrumentation`, `Workspace Tools Panel`, `Themes and Settings`, `Workspace Mascot Launcher`, `Legacy Chat Backend Client`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `@tauri-apps/plugin-shell`, `@types/diff`, `@types/prismjs` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Execution Lifecycle` be split into smaller, more focused modules?**
  _Cohesion score 0.05949367088607595 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Application Navigation Shell` to `Model Logo Catalog`, `Chat Visual Renderers`, `Integration Configuration UI`, `Provider Connection Onboarding`, `Chat Integration Presentation`, `Code Diff Presentation`, `Library File Previews`, `Model Metadata Resolution`, `Model Rack Configuration`, `Chat Sidebar Organization`, `Chat Message Presentation`, `Vite Development Instrumentation`, `Workspace Tools Panel`, `Themes and Settings`, `Workspace Mascot Launcher`, `Legacy Chat Backend Client`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `Provider Streaming Protocol` be split into smaller, more focused modules?**
  _Cohesion score 0.06821480406386067 - nodes in this community are weakly interconnected._
- **Why does `EventPayload` connect `Persisted Event Schema` to `Legacy SQLite Index`, `Storage Boundary Tests`, `SQLite Session Database`, `Legacy JSONL History`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `Model Logo Catalog` be split into smaller, more focused modules?**
  _Cohesion score 0.0392156862745098 - nodes in this community are weakly interconnected._
## Coverage and integrity limits

- 91 code files processed structurally; 4 yielded no symbols.
- 20 documents and 114 images processed semantically. One PDF was excluded because pypdf is unavailable.
- .npmrc skipped as sensitive. Unclassified formats, including notebook and CSS, were not extracted.
- Worker token usage was not exposed: token totals shown as 0 are placeholders, not zero-cost claims. AST itself uses no LLM.
- Integrity warning: 219 dangling-endpoint edges and 60 undirected same-endpoint relationship collapses were reported; 0 missing endpoints and 0 self-loops. See GRAPH_HEALTH.txt.
- Semantic documentation assertions may describe historical plans; they do not verify current runtime behavior. Logo/image nodes are visual descriptions, not evidence of provider functionality.
- graphify-out/ was written into the working tree and is currently untracked; .gitignore was not changed. See https://docs.graphify.com/guides/team-workflows.
