# Anakin Connector Example

## Connector overview
This connector syncs data from [Anakin](https://anakin.io) — a web scraping, search, automation, website-monitoring, and AI-visibility API — into seven tables. It covers every Anakin endpoint that is genuinely **synchronous end to end**: either a single request/response with no job to poll, or a bounded sequence of such requests (list-then-detail, still no polling).

Anakin also has several endpoints that are **asynchronous job endpoints** (`scrape`, `crawl`, `map`, `agentic-search`, and Wire action execution via `wire_read_action`/`wire_write_action`) — submit a task, then poll `GET /jobs/{id}` (or `GET /wire/jobs/{id}`) until it reaches a terminal state. Those don't fit Fivetran's `schema()`/`update()` sync model, which has no polling primitive, without real incremental-sync design work (e.g. a checkpointed "pending jobs" queue spanning syncs). They are deliberately excluded — see "Capabilities not covered" below.

## Requirements
- [Supported Python versions](https://github.com/fivetran/community_connectors/blob/main/README.md#requirements)
- Operating system:
  - Windows: 10 or later (64-bit only)
  - macOS: 13 (Ventura) or later (Apple Silicon [arm64] or Intel [x86_64])
  - Linux: Distributions such as Ubuntu 20.04 or later, Debian 10 or later, or Amazon Linux 2 or later (arm64 or x86_64)

## Getting started
Refer to the [Connector SDK Setup Guide](https://fivetran.com/docs/connectors/connector-sdk/setup-guide) to get started.

## Features
- Syncs structured search results (URL, title, snippet, publish date) for a configured search prompt (`POST /search`).
- Syncs the roster of AI answer engines available to Anakin's AI Visibility feature (`GET /ai-visibility/sources`).
- Syncs Anakin's Wire catalog — every site Wire supports automation actions for (`GET /wire/catalog`).
- Optionally syncs ranked Wire actions for a configured natural-language intent (`GET /wire/resolve`).
- Syncs saved browser sessions (`GET /sessions`), website monitors (`GET /monitors`), and each monitor's detected changes (`GET /monitors/{id}/changes`).
- No pagination or incremental cursor needed anywhere — every endpoint above is synchronous and returns a bounded result set per call.

## Configuration file
`configuration.json`:
- `api_key` – an Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). **Required.**
- `search_prompt` – the search query or question to run on every sync. **Required.**
- `search_limit` – optional, maximum number of `/search` results to return (default `5`, max `20`).
- `wire_discover_query` – optional natural-language intent to resolve against the Wire catalog every sync (e.g. `"search airbnb listings in Lisbon"`). Leave empty to skip the `wire_discover_results` table — there's no default intent to resolve.
- `wire_discover_limit` – optional, maximum number of ranked actions `wire_discover_query` returns (default `5`).
- `session_domain` – optional, restrict the `sessions` table to one website domain (e.g. `"amazon.com"`). Leave empty to sync all saved sessions.

> Note: Keep `configuration.json` out of version control if it contains a real API key.

## Requirements file
`requirements.txt` is empty — this connector only uses `requests` and the Python standard library (`json`, `urllib.parse`), both pre-installed in the Connector SDK base environment.

## Authentication
Requests are authenticated with the `X-API-Key` header, set from the `api_key` configuration value. Refer to `def update(configuration, state)` and `def _get_json(path, api_key, params)`.

## Data handling
Each sync makes one call per capability below and upserts every returned record; none has a natural "since last sync" cursor, so every sync re-lists the current state and upserts (primary-keyed for idempotent re-runs, not duplication) — the same approach the original `search_results` table already used. Refer to `def update(configuration, state)`.

- **search_results** — `POST /search` once with the configured prompt and limit.
- **ai_visibility_sources** — `GET /ai-visibility/sources`. No input; a small, account-independent roster.
- **wire_catalog** — `GET /wire/catalog`. No input; not paginated (confirmed against Anakin Wire's own OpenAPI spec — `CatalogEntry` has no cursor/offset).
- **wire_discover_results** — `GET /wire/resolve?q=...`, only when `wire_discover_query` is configured (otherwise skipped with a log message, not an error).
- **sessions** — `GET /sessions`, optionally filtered by `session_domain`.
- **monitors** — `GET /monitors`.
- **monitor_changes** — `GET /monitors/{id}/changes`, once per monitor id. Monitor ids are **auto-discovered** from the `monitors` sync in the same run rather than requiring the user to hand-maintain an id list in `configuration.json` — a monitor added on the dashboard is picked up automatically on the next sync. This is a bounded list-then-detail fan-out (Anakin's active-monitor caps are 5/20/100 per plan tier), not polling — every call in the chain is still a single synchronous GET.

Response envelopes are unwrapped tolerantly (`_unwrap_list`): a bare JSON array, `{"<key>": [...]}`, or an empty/null wrapper are all handled, mirroring the same defensive helper already used by this same endpoint family in `anakin-tap-anakin` (this repo's Singer tap for Anakin).

**Field-name confidence.** `search_results`, `sessions`, `wire_catalog`, and `wire_discover_results` are backed by a published, versioned schema (the `anakin-py` SDK's `BrowserSession` model for sessions; Anakin Wire's own OpenAPI spec for the catalog and resolve responses) — their columns are read from those sources, not guessed. `monitors` and `monitor_changes` are **not** in any published Anakin SDK yet, so beyond a handful of high-confidence fields (drawn from what `POST /monitors` is documented to accept), each row also carries a `raw_json` column with the full object serialized verbatim, so nothing is silently dropped if a best-effort field name turns out to be wrong. `monitors.raw_json` has the `alertWebhookSecret` field stripped first — it's an HMAC signing secret, and a secret that lands in a synced destination table is exposed to everyone who can query it; the real value is only ever available from the Anakin dashboard.

## Error handling
API errors (non-2xx responses, network failures) raise a `RuntimeError` naming the failing endpoint, via the shared `_get_json` helper (GET endpoints) or inline for the `POST /search` call. Any failure aborts the whole sync — Fivetran surfaces the error rather than the sync silently completing with partial data. Refer to `def update(configuration, state)` and `def _get_json(path, api_key, params)`.

## Tables created
- **SEARCH_RESULTS** — `url` (STRING, primary key), `title`, `snippet`, `date`, `last_updated` (STRING)
- **AI_VISIBILITY_SOURCES** — `slug` (STRING, primary key), `label` (STRING)
- **WIRE_CATALOG** — `slug` (STRING, primary key), `id`, `name`, `url`, `domain`, `category`, `description`, `logo_url`, `auth_type`, `auth_login_url`, `status`, `created_at`, `updated_at` (STRING), plus auto-inferred `auth_required` (boolean), `auth_types`/`supported_sources` (JSON-serialized STRING), `action_count` (integer)
- **WIRE_DISCOVER_RESULTS** — `action_id` (STRING, primary key), `catalog`, `params_required`, `params_optional` (JSON-serialized STRING), plus auto-inferred `credits` (integer), `auth_required`/`auth_satisfied` (boolean)
- **SESSIONS** — `id` (STRING, primary key), `name`, `website_url`, `website_domain`, `created_at`, `last_used_at`, `expires_at` (STRING), plus auto-inferred `is_active` (boolean), `cookie_count`/`storage_item_count` (integer)
- **MONITORS** — `id` (STRING, primary key), `url`, `scope`, `watch_mode`, `raw_json` (STRING — full object, secret stripped)
- **MONITOR_CHANGES** — `monitor_id`, `change_id` (STRING, composite primary key), `detected_at`, `raw_json` (STRING — full change object)

## Capabilities covered
Genuinely synchronous, no-polling endpoints — added in this pass:
- `ai_visibility_sources` (`GET /ai-visibility/sources`) — instant, no input.
- `wire_catalog` (`GET /wire/catalog`) — instant, no input, not paginated.
- `wire_discover` (`GET /wire/resolve`) — instant single call per configured intent, same "no cursor, re-run and upsert" shape as `search_results`.
- `session_list` (`GET /sessions`) — instant, optional domain filter.
- `monitor_list` (`GET /monitors`) — instant.
- `monitor_changes` (`GET /monitors/{id}/changes`) — instant per call; fits the sync model as a bounded fan-out over auto-discovered monitor ids, not as a single top-level listing — see "Data handling" above.

## Capabilities not covered
Async job endpoints (submit, then poll to a terminal state) — excluded because Fivetran's `schema()`/`update()` model has no polling primitive:
- `scrape` (`POST /url-scraper` + poll)
- `crawl` (`POST /crawl` + poll)
- `map` (`POST /map` + poll)
- `agentic_search` (`POST /agentic-search` + poll)
- `wire_read_action` / `wire_write_action` (`POST /wire/task` + poll) — Wire's actual action-execution endpoint. (`wire_catalog` and `wire_discover`, covered above, are the synchronous *discovery* endpoints that tell you what actions exist and their parameter schemas — they're distinct from *running* one.)
- `ai_visibility_search` (`POST /ai-visibility/search` + poll) — the search itself is async; only its synchronous `ai-visibility/sources` roster is covered.
- `browser_task` (`POST /ai/evaluate` + poll) — Anakin's AI-driven browser automation.

Each of these would need a second connector, or a real incremental/stateful extension of this one (e.g. a checkpointed "jobs submitted, not yet resolved" list carried in `state` across syncs, polled a bit further each run) — genuine design work, not attempted here.

Two capabilities were deliberately left out even though their underlying calls are synchronous:
- `session_delete` / `monitor_control` (pause/resume/run_now/delete) — destructive, non-idempotent side effects. Running one on every sync isn't a "sync" in any meaningful sense; a sync connector should read state, not mutate it on a schedule.
- `wire_login` / `wire_build` — same reasoning: signing in or building a new Wire action are one-shot actions with real side effects (a stored credential, a newly published catalog action), not something to repeat every sync interval.

## Additional considerations
This connector was tested with `python3 -m py_compile` (Python 3.10–3.14) and `configuration.json`/`requirements.txt` validation for syntax only — it has not been run against `fivetran debug` or a live Anakin API key (blocked by this sandbox's network restrictions). Field-level schemas for `search_results`, `sessions`, `wire_catalog`, and `wire_discover_results` were cross-checked against Anakin's published `anakin-py` SDK models and Wire's OpenAPI spec, not guessed; `monitors`/`monitor_changes` field names are best-effort with a `raw_json` fallback (see "Data handling" above) for the same reason `anakin-tap-anakin`'s equivalent streams carry the same caveat — those two endpoint families aren't in any published Anakin SDK yet.
