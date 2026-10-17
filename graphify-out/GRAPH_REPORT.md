# Graph Report - unfuse  (2026-10-17)

## Corpus Check
- 151 files · ~407,865 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .xml 2, (none) 1, .icns 1)

## Summary
- 1102 nodes · 2445 edges · 53 communities (45 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Agent Turns and Approvals
- Dashboard and Model Discovery
- Integration Settings and Connections
- Platform Application Icons
- File Tools and Guardrails
- Persisted Event Types
- Tool Approval Presentation
- SQLite Transactions and Backups
- Octopus Mascot Artwork
- Provider Capability Discovery
- External Tool Providers
- Storage Decisions and Handoff
- Model Configuration and Resolution
- Conversation Sidebar Navigation
- Workspace Files and Previews
- Chat Input and Telemetry
- Shell Execution and Timeouts
- Tool Dispatch and Validation
- Native Terminal Sessions
- Workspace Session Storage API
- Frontend Execution and Approvals
- Application Settings and Themes
- Legacy JSONL History
- Syntax Highlighting and Diffs
- Workspace Launcher Artwork
- Tauri Desktop Configuration
- TypeScript Compiler Configuration
- Desktop Startup and Telemetry
- Provider Endpoint Helpers
- Frontend Build Packages
- Session Persistence Regression Tests
- Storage Initialization and Identity
- Frontend Runtime Dependencies
- Model Requests and Tool Calls
- Streaming Content Parser Tests
- Application Navigation and Views
- Cancellation State Scaffolding
- Frontend Development Dependencies
- Multimodal Message Serialization
- Attachment Preview Interfaces
- Qwen Compatibility Tests
- Linux Continuous Integration
- Repository Change Scope Rules
- Multimodal Content Parts
- Frontend Package Scripts
- Terminal Output Events
- HTML Application Entry
- Vite Build Integration
- Voice Input Orb
- Image Module Type Declaration
- Rust Package Identity

## God Nodes (most connected - your core abstractions)
1. `128x128.png — pixel octopus icon` - 47 edges
2. `getModelLogo()` - 45 edges
3. `react` - 41 edges
4. `lucide-react` - 33 edges
5. `renderIntegrationLogo()` - 29 edges
6. `StorageManager` - 24 edges
7. `PersistedEvent` - 23 edges
8. `ChatMessage` - 21 edges
9. `EventPayload` - 20 edges
10. `stream_chat_completion_with_compatibility()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `macOS application icon` --semantically_similar_to--> `Unfuse octopus logo`  [INFERRED] [semantically similar]
  macos-squircle-icon.png → src/assets/logo.png
- `128x128@2x.png — pixel octopus icon` --semantically_similar_to--> `128x128.png — pixel octopus icon`  [INFERRED] [semantically similar]
  src-tauri/icons/128x128@2x.png → src-tauri/icons/128x128.png
- `32x32.png — pixel octopus icon` --semantically_similar_to--> `128x128.png — pixel octopus icon`  [INFERRED] [semantically similar]
  src-tauri/icons/32x32.png → src-tauri/icons/128x128.png
- `64x64.png — pixel octopus icon` --semantically_similar_to--> `128x128.png — pixel octopus icon`  [INFERRED] [semantically similar]
  src-tauri/icons/64x64.png → src-tauri/icons/128x128.png
- `ic_launcher_foreground.png — pixel octopus icon` --semantically_similar_to--> `128x128.png — pixel octopus icon`  [INFERRED] [semantically similar]
  src-tauri/icons/android/mipmap-hdpi/ic_launcher_foreground.png → src-tauri/icons/128x128.png

## Import Cycles
- None detected.

## Communities (53 total, 8 thin omitted)

### Community 0 - "Agent Turns and Approvals"
Cohesion: 0.07
Nodes (53): ActiveTurnGuard, begin_turn(), cancel_agent_turn(), cleanup_test_session(), get_or_create_session(), is_session_cancelled(), LlmConfigPayload, make_capturing_sink() (+45 more)

### Community 1 - "Dashboard and Model Discovery"
Cohesion: 0.12
Nodes (47): DashboardView(), LOADED_MODELS_SAMPLE, LoadedModelInfo, MessageExecutionEvent, SAMPLE_MESSAGE_EVENTS, DetectedModel, OnboardingModal(), OnboardingModalProps (+39 more)

### Community 2 - "Integration Settings and Connections"
Cohesion: 0.12
Nodes (42): CommandItem, IntegrationsModal(), IntegrationsModalProps, DEFAULT_STATES, deleteMcpServer(), disconnectService(), getAllServiceStates(), getDefaultWebSearchProvider() (+34 more)

### Community 3 - "Platform Application Icons"
Cohesion: 0.04
Nodes (48): 128x128@2x.png — pixel octopus icon, 128x128.png — pixel octopus icon, 32x32.png — pixel octopus icon, 64x64.png — pixel octopus icon, ic_launcher_foreground.png — pixel octopus icon, ic_launcher.png — pixel octopus icon, ic_launcher_round.png — pixel octopus icon, ic_launcher_foreground.png — pixel octopus icon (+40 more)

### Community 4 - "File Tools and Guardrails"
Cohesion: 0.09
Nodes (31): PromptIngestor, edit_file(), MAX_EDIT_FILE_BYTES, MAX_READ_BYTES, read_file(), test_edit_multiple_occurrences_error(), test_edit_not_found_error(), test_edit_preserves_crlf() (+23 more)

### Community 5 - "Persisted Event Types"
Cohesion: 0.07
Nodes (20): EventPayload, ActiveLeaf, AssistantTurn, Cancellation, Compaction, Error, PermissionDecision, PipelineStageComplete (+12 more)

### Community 6 - "Tool Approval Presentation"
Cohesion: 0.16
Nodes (34): CodebaseFileItem, COMMAND_LIST, WORKSPACE_FILES, buildPlatformReadCommand(), buildPlatformShellCommand(), extractDomain(), ParsedTool, parseToolInfo() (+26 more)

### Community 7 - "SQLite Transactions and Backups"
Cohesion: 0.12
Nodes (14): backup_restore_includes_wal_and_preserves_previous_backup(), branch_continuation_survives_reopen_without_jsonl(), directory(), failed_append_rolls_back_event_sequence_leaf_and_title(), import_rejects_malformed_and_changed_logs_without_partial_session(), lock_runtime(), MIGRATION_1, migration_immutability_and_constraints() (+6 more)

### Community 8 - "Octopus Mascot Artwork"
Cohesion: 0.06
Nodes (36): White pixel octopus within a dark rounded square, macOS application icon, Monochrome pixel art octopus mascot, White pixel octopus mascot, Unfuse octopus logo, Monochrome pixel art octopus mascot, Octopus reaching toward a flying butterfly, Butterfly mascot scene (+28 more)

### Community 9 - "Provider Capability Discovery"
Cohesion: 0.14
Nodes (31): CapabilitySource, Fallback, Runtime, CapabilityStatus, Supported, Unknown, Unsupported, inspect_llamacpp_capabilities() (+23 more)

### Community 10 - "External Tool Providers"
Cohesion: 0.16
Nodes (14): BraveProvider, DatadogProvider, ExternalTool, FirecrawlProvider, GitHubProvider, handle_api_error(), IntegrationManager, IntegrationResponse (+6 more)

### Community 11 - "Storage Decisions and Handoff"
Cohesion: 0.10
Nodes (26): Historical backend baseline and approved minimal storage, events table, Historical Windows read-only sync defect, JSONL retained for legacy compatibility, Atomic digest-tracked legacy JSONL import, legacy_imports table, Approved migration 1, Unapproved pipeline schema and IPC proposal (+18 more)

### Community 12 - "Model Configuration and Resolution"
Cohesion: 0.14
Nodes (22): ChatPanelProps, MainChatPanelProps, BladeConfigView(), BladeConfigViewProps, ModelBladeCard(), ModelBladeCardProps, ModelInfoModal(), ModelInfoModalProps (+14 more)

### Community 13 - "Conversation Sidebar Navigation"
Cohesion: 0.10
Nodes (11): INITIAL_SESSIONS, SessionItem(), SessionItemProps, SidebarPanel(), SidebarPanelProps, NewChatIcon(), PinIcon(), SearchIcon() (+3 more)

### Community 14 - "Workspace Files and Previews"
Cohesion: 0.09
Nodes (23): diff, @xterm/addon-fit, @xterm/xterm, AddPanel(), AddPanelOption, AddPanelProps, ArtifactItem, CONTROL_FLOW_KEYWORDS (+15 more)

### Community 15 - "Chat Input and Telemetry"
Cohesion: 0.14
Nodes (22): @tauri-apps/api, BtopTelemetryPopover(), BtopTelemetryPopoverProps, ChatInput(), ChatInputProps, ChatPanel(), FALLBACK_OFFLINE_MODEL, fetchLocalOllamaModels() (+14 more)

### Community 16 - "Shell Execution and Timeouts"
Cohesion: 0.12
Nodes (16): BashOutput, DEFAULT_TIMEOUT_SECS, execute_bash(), execute_bash_with_pid_callback(), MAX_OUTPUT_BYTES, MAX_TIMEOUT_SECS, OutputMsg, Chunk (+8 more)

### Community 17 - "Tool Dispatch and Validation"
Cohesion: 0.15
Nodes (17): canonical_tool_name(), execute_tool(), execute_tool_with_context(), execute_tool_with_pid_callback(), get_filtered_tool_definitions(), get_tool_action_type(), get_tool_definitions(), is_tool_allowed() (+9 more)

### Community 18 - "Native Terminal Sessions"
Cohesion: 0.17
Nodes (9): Session, shell_input_resize_and_cleanup(), size(), terminal_close(), terminal_open(), terminal_resize(), terminal_write(), TerminalState (+1 more)

### Community 19 - "Workspace Session Storage API"
Cohesion: 0.14
Nodes (10): ActiveContextPayload, create_session(), default_storage_dir(), get_storage(), list_sessions(), load_session(), rebuild_index(), search_sessions() (+2 more)

### Community 20 - "Frontend Execution and Approvals"
Cohesion: 0.18
Nodes (13): MainChatPanel(), starters, MessageItem(), ToolCallItemProps, ToolCall, AgentConfig, backendClient, BackendEvent (+5 more)

### Community 21 - "Application Settings and Themes"
Cohesion: 0.16
Nodes (16): simple-icons, detailSections, sections, SettingRow, SettingsDetails(), SettingsView(), SettingsViewProps, ThemeIcon() (+8 more)

### Community 22 - "Legacy JSONL History"
Cohesion: 0.18
Nodes (8): PersistedEvent, ActiveContext, JsonlSessionStore, RecoveryReport, RecoveryStatus, Clean, Interrupted, SessionRecoveryScanner

### Community 23 - "Syntax Highlighting and Diffs"
Cohesion: 0.15
Nodes (16): prismjs, react, react-markdown, remark-gfm, CodeBlock(), CodeBlockProps, CONTROL_FLOW_KEYWORDS, detectLangFromFilename() (+8 more)

### Community 24 - "Workspace Launcher Artwork"
Cohesion: 0.11
Nodes (8): createShuffledDeck(), DEFAULT_RECENTS, MascotItem, MASCOTS, RecentProject, WORKSPACE_QUOTES, WorkspaceLauncher(), WorkspaceLauncherProps

### Community 25 - "Tauri Desktop Configuration"
Cohesion: 0.11
Nodes (18): app, macOSPrivateApi, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+10 more)

### Community 26 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 27 - "Desktop Startup and Telemetry"
Cohesion: 0.13
Nodes (7): get_system_info(), get_system_telemetry(), resolve_model_capabilities(), run_collaborative_turn(), sync_integration_config(), SystemInfo, SystemTelemetry

### Community 28 - "Provider Endpoint Helpers"
Cohesion: 0.13
Nodes (6): base64_encode(), chat_endpoint(), DEFAULT_MAX_REQUEST_BYTES, load_image_ref_to_data_url(), qwen_compat_accepts_complete_responses_with_unique_ids(), validate_provider_config()

### Community 29 - "Frontend Build Packages"
Cohesion: 0.12
Nodes (16): name, private, type, version, autoprefixer, eventsource-parser, postcss, tailwindcss (+8 more)

### Community 30 - "Session Persistence Regression Tests"
Cohesion: 0.28
Nodes (11): test_append_read_round_trip(), test_interrupted_session_recovery_without_mutating_jsonl(), test_parent_id_traversal_and_branching(), test_search_sessions_by_title_and_prompt(), test_session_creation_and_index_listing(), test_storage(), test_tool_call_and_result_persistence(), test_turn_count_accumulation_and_title_retention() (+3 more)

### Community 31 - "Storage Initialization and Identity"
Cohesion: 0.17
Nodes (6): compute_workspace_hash(), GLOBAL_STORAGE, select_workspace(), test_legacy_import_is_idempotent_and_preserves_originals(), test_read_events_corrupted_middle_line_rejected(), test_workspace_selection_requires_existing_absolute_folder()

### Community 32 - "Frontend Runtime Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, diff, eventsource-parser, lucide-react, prismjs, react, react-dom, react-markdown (+8 more)

### Community 33 - "Model Requests and Tool Calls"
Cohesion: 0.30
Nodes (10): AssembledToolCall, ChatMessage, check_context_limit(), decode_qwen_tool_response(), ProviderConfig, stream_chat_completion(), stream_chat_completion_with_compatibility(), test_tool_accumulator() (+2 more)

### Community 34 - "Streaming Content Parser Tests"
Cohesion: 0.23
Nodes (10): StreamChunk, Done, Text, Thinking, ToolCall, test_think_tag_parser_across_chunks(), test_think_tag_parser_clean_text(), test_think_tag_parser_split_across_chunks() (+2 more)

### Community 35 - "Application Navigation and Views"
Cohesion: 0.30
Nodes (9): lucide-react, App(), NavigationIcon(), LibraryView(), MemoryView(), sections, ModelLogsView(), sources (+1 more)

### Community 37 - "Frontend Development Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, postcss, tailwindcss, @tauri-apps/cli, @types/node, @types/react, @types/react-dom (+3 more)

### Community 38 - "Multimodal Message Serialization"
Cohesion: 0.24
Nodes (4): MessageContent, Parts, Text, test_multimodal_chat_message_wire_format()

### Community 39 - "Attachment Preview Interfaces"
Cohesion: 0.28
Nodes (7): react-dom, AttachmentCategory, AttachmentItem, PREVIEW_EXAMPLES, SAMPLE_LIBRARY_ATTACHMENTS, PreviewItem, QuickLookPreview()

### Community 40 - "Qwen Compatibility Tests"
Cohesion: 0.25
Nodes (7): qwen_compat_sse_fragmentation_requires_explicit_mode(), qwen_compat_sse_preserves_native_calls_and_rejects_truncation(), sse_fixture(), test_text_chat_message_wire_format(), ToolCallCompatibility, Native, QwenJson

### Community 41 - "Linux Continuous Integration"
Cohesion: 0.29
Nodes (7): Linux frontend and Rust CI, Rust cargo check, Rust cargo test, Frontend npm build, Linux WebKitGTK and desktop dependencies, Node.js 22, Ubuntu latest runner

### Community 43 - "Multimodal Content Parts"
Cohesion: 0.33
Nodes (6): ContentPart, AudioUrl, ImageUrl, Text, VideoUrl, MediaUrlPayload

### Community 44 - "Frontend Package Scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, tauri

### Community 45 - "Terminal Output Events"
Cohesion: 0.50
Nodes (4): TerminalOutput, Data, Error, Exit

### Community 46 - "HTML Application Entry"
Cohesion: 0.67
Nodes (3): Unfuse HTML application entry, Google Fonts typography, src/main.tsx module entry

## Knowledge Gaps
- **137 isolated node(s):** `@tauri-apps/plugin-shell`, `@types/diff`, `@types/prismjs`, `eventsource-parser`, `@tauri-apps/cli` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 391 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Syntax Highlighting and Diffs` to `Dashboard and Model Discovery`, `Integration Settings and Connections`, `Application Navigation and Views`, `Tool Approval Presentation`, `Attachment Preview Interfaces`, `Model Configuration and Resolution`, `Conversation Sidebar Navigation`, `Workspace Files and Previews`, `Chat Input and Telemetry`, `Voice Input Orb`, `Frontend Execution and Approvals`, `Application Settings and Themes`, `Workspace Launcher Artwork`, `Frontend Build Packages`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `128x128.png — pixel octopus icon` (e.g. with `128x128@2x.png — pixel octopus icon` and `32x32.png — pixel octopus icon`) actually correct?**
  _`128x128.png — pixel octopus icon` has 47 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tauri-apps/plugin-shell`, `@types/diff`, `@types/prismjs` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Turns and Approvals` be split into smaller, more focused modules?**
  _Cohesion score 0.07313738892686261 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Application Navigation and Views` to `Dashboard and Model Discovery`, `Integration Settings and Connections`, `Tool Approval Presentation`, `Attachment Preview Interfaces`, `Model Configuration and Resolution`, `Conversation Sidebar Navigation`, `Workspace Files and Previews`, `Chat Input and Telemetry`, `Frontend Execution and Approvals`, `Application Settings and Themes`, `Syntax Highlighting and Diffs`, `Workspace Launcher Artwork`, `Frontend Build Packages`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Dashboard and Model Discovery` be split into smaller, more focused modules?**
  _Cohesion score 0.11607843137254902 - nodes in this community are weakly interconnected._
- **Why does `EventPayload` connect `Persisted Event Types` to `SQLite Transactions and Backups`, `Legacy JSONL History`, `Storage Initialization and Identity`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
## Extraction limits and provenance

This graph describes the local working tree, including unfinished code and historical documentation. Graph connections do not prove code compiles or features are wired into execution.

Token cost: semantic host-agent token usage is unavailable in this session. Zero values in Graphify metadata are placeholders, not a claim of zero usage. AST extraction is local and deterministic.

Graph health warning: 151 dangling-endpoint edges, 59 undirected same-endpoint collapsed edges, and 2 exact duplicate edges were reported before graph building. No missing-endpoint or self-loop edges were reported. See health.json; graph navigation can be incomplete.

Seven code/config files yielded no symbols, including frontend test files. File presence is not proof of complete semantic coverage. The sensitive file .npmrc was skipped.

`graphify-out/` was written into the working tree and is currently untracked. No ignore configuration, source files, commits, or remote state were changed by this mapping.
