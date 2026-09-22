# Unfuse Integrations — Connection & Permissions Reference

---

## 🔍 Web Search (user picks one as default)

### DuckDuckGo
- **Auth:** None — zero config, no API key
- **Connects via:** Direct HTTP `https://api.duckduckgo.com/?q={query}&format=json`
- **Can do:** Read-only web search results
- **Cannot do:** Anything else

### Brave Search
- **Auth:** API key → `X-Subscription-Token` header
- **Connects via:** `https://api.search.brave.com/res/v1/web/search`
- **Can do:** Read-only web search results
- **Cannot do:** Anything else

### Tavily
- **Auth:** API key → `Authorization: Bearer` header
- **Connects via:** `https://api.tavily.com/search`
- **Can do:** Read-only search + full page content extraction from URLs (most agent-friendly format)
- **Cannot do:** Anything else

### Exa Neural
- **Auth:** API key → `x-api-key` header
- **Connects via:** `https://api.exa.ai/search`
- **Can do:** Read-only semantic/neural search — good for code and docs
- **Cannot do:** Anything else

### Google Custom Search
- **Auth:** API key + Search Engine ID (CX) — user gets both from Google Cloud Console
- **Connects via:** `https://www.googleapis.com/customsearch/v1`
- **Can do:** Read-only search results from configured Google engine
- **Cannot do:** Anything else

---

## 🛠️ Dev Tools

### GitHub
- **Auth:** Personal Access Token (PAT) — user generates at `github.com/settings/tokens`
- **Connects via:** GitHub REST API (`api.github.com`) via Octokit
- **Can do:**
  - Read repos, branches, files, commits
  - Read + create issues
  - Read + create PRs (draft only — user merges)
  - Read GitHub Actions run results
- **Cannot do:**
  - Push directly to `main` — agent can only push to a branch it creates
  - Delete repos
  - Change repo settings or permissions

### Linear
- **Auth:** API key from Linear settings
- **Connects via:** Linear GraphQL API (`api.linear.app/graphql`)
- **Can do:**
  - Read issues, projects, cycles, team members
  - Create issues, update issue status
  - Add comments to issues
- **Cannot do:**
  - Delete issues or projects
  - Change team or workspace settings

### Sentry
- **Auth:** Auth token from Sentry settings (read-only scope preferred)
- **Connects via:** `sentry.io/api/0/`
- **Can do:**
  - Read issues, stack traces, error events
  - Read release info
- **Cannot do:**
  - Resolve, assign, or delete issues — agent reads only, human acts

---

## 💬 Communication

### Slack
- **Auth:** Bot OAuth token (`xoxb-` token) — user creates a Slack App and invites the bot to channels
- **Connects via:** Slack Web API `chat.postMessage`
- **Can do:**
  - Post messages to channels the bot has been invited to
  - Send code review summaries, alerts, build results
- **Cannot do:**
  - Read channel history
  - DM users directly
  - Join or leave channels on its own

---

## 🔌 MCP (Model Context Protocol)

### MCP Servers
- **Auth:** Depends on the server (none, API key, or headers)
- **Connects via:**
  - `stdio` — local process launched with a command + args
  - `sse` — HTTP endpoint with a URL
- **Can do:** Whatever tools the MCP server exposes
- **Hard rule:** Every MCP tool call goes through the **same permission gate** as native tools — agent cannot auto-execute without user Allow/Reject

---

## Summary Table

| Integration | Auth Method | Agent Can Read | Agent Can Write | Hard Limits |
|---|---|---|---|---|
| DuckDuckGo | None | Web results | ❌ | — |
| Brave | API key | Web results | ❌ | — |
| Tavily | API key | Web results + page content | ❌ | — |
| Exa | API key | Neural search results | ❌ | — |
| Google Search | API key + CX ID | Web results | ❌ | — |
| GitHub | PAT token | Repo, issues, PRs, Actions | Issues, PRs (branch only) | No push to main, no settings |
| Linear | API key | Issues, projects, cycles | Create/update issues, comments | No delete |
| Sentry | Auth token | Errors, stack traces, releases | ❌ | Read-only |
| Slack | Bot token (`xoxb-`) | ❌ | Post to invited channels | No DMs, no reading history |
| MCP | stdio / SSE / headers | Depends on server | Depends on server | Always through permission gate |
