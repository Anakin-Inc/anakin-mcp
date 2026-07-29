# CrewAI tools — submission instructions

Real, PR-buildable path — confirmed via `crewAIInc/crewAI/lib/crewai-tools`
(consolidated from the previously separate `crewAIInc/crewAI-tools` repo,
archived 2025-11-10). Direct precedent already merged: Firecrawl, Tavily,
Exa, Serper, Brave — all comparable web-scraping/search/browser-automation
APIs.

## What's here

All 21 Anakin MCP capabilities (`anakin-mcp/src/tools/*.ts`), each as its
own `crewai_tools`-style directory: `anakin_<name>_tool/{__init__.py,
anakin_<name>_tool.py, README.md}`.

### SDK-backed (9) — wrap `anakin-sdk` (PyPI `anakin-sdk`, v0.1.0)

| Directory | Wraps |
|---|---|
| `anakin_scrape_tool` | `client.scrape()` |
| `anakin_search_tool` | `client.search()` |
| `anakin_map_tool` | `client.map()` |
| `anakin_crawl_tool` | `client.crawl()` |
| `anakin_agentic_search_tool` | `client.agentic_search()` |
| `anakin_wire_read_action_tool` | `client.wire()` (read-typed actions) |
| `anakin_wire_write_action_tool` | `client.wire()` (write-typed actions, refuses financial intents) |
| `anakin_session_list_tool` | `client.sessions.list()` |
| `anakin_session_delete_tool` | `client.sessions.delete()` |

### Raw HTTP (12) — `anakin-sdk` v0.1.0 has no method for these; each tool
calls `https://api.anakin.io/v1` directly via `requests` (`X-API-Key`
header), matching `anakin-mcp/src/client.ts` exactly — same pattern already
used and verified in `kubeflow-anakin/anakin_web_scraper/component.py` and
matching how `SerperDevTool` (the real, current crewai-tools search tool)
calls its API directly with `requests`.

| Directory | Endpoint(s) |
|---|---|
| `anakin_wire_discover_tool` | `GET /wire/resolve` |
| `anakin_wire_catalog_tool` | `GET /wire/catalog[/:slug]` |
| `anakin_wire_identities_tool` | `GET /wire/identities` |
| `anakin_wire_login_tool` | `POST /wire/login` |
| `anakin_wire_build_tool` | `POST /wire/build-request` |
| `anakin_monitor_create_tool` | `POST /monitors` |
| `anakin_monitor_list_tool` | `GET /monitors[/:id]` |
| `anakin_monitor_changes_tool` | `GET /monitors/:id/changes` |
| `anakin_monitor_control_tool` | `POST /monitors/:id/pause\|resume\|run`, `DELETE /monitors/:id` |
| `anakin_ai_visibility_search_tool` | `POST /ai-visibility/search`, polls `GET /ai-visibility/search/:id` |
| `anakin_ai_visibility_sources_tool` | `GET /ai-visibility/sources` |
| `anakin_browser_task_tool` | `POST /ai/evaluate` (async), polls `GET /ai/jobs/:id` |

That's all 21 — the full MCP surface. Nothing was excluded as "doesn't make
sense"; every capability got a tool.

## Design choices, explained

- **Per-call vs constructor-level args**: mirrors the real
  `FirecrawlScrapeWebsiteTool`/`FirecrawlCrawlWebsiteTool` split — `url` (or
  `prompt`/`action_id`) is the only per-call `args_schema` field where the
  MCP tool has one obvious required input; secondary options (limits,
  depth, country, scope, etc.) are constructor-level fields, same as
  `generate_json`/`use_browser` on the existing `AnakinScrapeTool`. Where an
  MCP tool has a large optional-field surface (`monitor_create`, 20+
  fields), the tool follows `FirecrawlCrawlWebsiteTool`'s `config: dict`
  pattern instead of one Pydantic field per option.
- **Wire read/write split**: kept as two separate tools
  (`AnakinWireReadActionTool` / `AnakinWireWriteActionTool`), matching
  anakin-mcp's `wire_read_action`/`wire_write_action` split — the MCP
  comment explains this is required by the Anthropic Connectors Directory
  so read-only and destructive operations carry honest, separate
  annotations. CrewAI's `BaseTool` has no equivalent annotation system, but
  the split is preserved anyway for behavioral parity and so the write tool
  can carry its own financial-intent refusal.
- **Financial-transaction refusal**: `anakin_wire_write_action_tool`,
  `anakin_wire_build_tool`, and `anakin_browser_task_tool` each refuse
  requests whose `action_id`/`goal`/`prompt` look like a payment or fund
  transfer, mirroring `financialBlockReason()` in
  `anakin-mcp/src/tools/policy.ts` (the live API also rejects these
  server-side; this is a client-side fast-fail, not the only enforcement).
- **Secret redaction**: `anakin_monitor_*_tool` files redact
  `alertWebhookSecret` from API responses before returning them, mirroring
  `redactSecrets()` in `anakin-mcp/src/tools/monitor.ts` — an HMAC secret
  that lands in an agent transcript is compromised by definition.
- **`anakin_wire_login_tool`** omits the 1Password `source_id`/`source_ref`
  fields present in the MCP tool — a narrower, password-login-only surface;
  noted in its README as a possible follow-up, not fabricated.

## Verified, not assumed

- `python3 -m py_compile` passes on all 42 `.py` files (21 tool dirs ×
  `__init__.py` + `anakin_<name>_tool.py`).
- `pip install crewai` / `anakin-sdk` hung on private-registry lookups in
  this sandbox (`10.0.135.189:8081` — the internal PyPI mirror — times out
  repeatedly; confirmed via the raw pip log), same restriction hit
  previously by `langchain-anakin` and the original two tools here — never
  got a live import/instantiate/run. `requests` (needed by the 12 raw-HTTP
  tools) *is* preinstalled locally, but `crewai`/`pydantic` are not, so no
  full `BaseTool` instantiation was possible either.
- Every structural detail (the `BaseTool`/`EnvVar`/`PrivateAttr` pattern,
  the lazy-import-with-`click.confirm`-install fallback,
  `package_dependencies`, `model_rebuild()` at module load, the `config:
  dict` catch-all pattern for wide option surfaces) copied from the real,
  current `FirecrawlScrapeWebsiteTool` / `FirecrawlCrawlWebsiteTool` /
  `SerperDevTool` sources, pulled live via `gh api
  repos/crewAIInc/crewAI/contents/...`, not guessed.
- Every endpoint, param name, and response shape for the 12 raw-HTTP tools
  was read directly from `anakin-mcp/src/client.ts` and
  `anakin-mcp/src/tools/*.ts` — not invented.
- Did **not** hand-edit `tool.specs.json` (the tools registry) — inspecting
  it showed it's clearly auto-generated from each tool's Pydantic schemas
  (full JSON Schema dumps, not hand-maintainable), so it needs to be
  regenerated by their build tooling, not edited directly.

## Known limitation: Wire auth pass-through

`anakin-sdk` v0.1.0's `client.wire(action_id, params)` does not accept
`credential_id`/`identity_id` (unlike `anakin-mcp`'s `wireRun()`), so
`anakin_wire_read_action_tool` / `anakin_wire_write_action_tool` can't pass
one through either. Auth-required actions run against whatever identity is
connected in the Anakin dashboard for that site and fail with
`AUTH_REQUIRED` if none is connected. Documented in both tools' README
"Known limitation" sections — not silently dropped.

## Steps (needs the account owner)

1. Fork `crewAIInc/crewAI`, add all 21 directories under
   `lib/crewai-tools/src/crewai_tools/tools/`.
2. Register all 21 classes in
   `lib/crewai-tools/src/crewai_tools/tools/__init__.py` (import + `__all__`
   entry each, same as the Firecrawl tools' entries there).
3. Run whatever generates `tool.specs.json` (not identified — check their
   build scripts/Makefile) rather than hand-editing it.
4. Add `anakin-sdk` as an optional dependency in
   `lib/crewai-tools/pyproject.toml`, matching how `firecrawl-py` is
   declared there. The 12 raw-HTTP tools need no new dependency (`requests`
   is already a base `crewai[tools]` dependency, same as `SerperDevTool`).
5. Open a PR.

## Not done

Never installed, imported, or run against `crewai` itself — verified by
close reading against real reference source (pulled live via `gh api`) and
`python3 -m py_compile` only.
