# Kubeflow — submission instructions

Real, PR-buildable component registry —
`kubeflow/pipelines-components`, distinct from arbitrary per-pipeline
components (any Kubeflow user can already call Anakin's API from a plain
`@dsl.component` with zero registry involvement; this repo exists purely
for discoverability/reuse of common ones).

Kubeflow components are one-per-operation (unlike a multi-endpoint SDK), so
Anakin's MCP tool surface — 21 tools across `anakin-mcp/src/tools/*.ts` — is
split into 21 sibling component directories, one per tool, each independently
usable as a pipeline step.

## What's here

Every directory mirrors the real `components/data_processing/yoda_data_processor/`
example structure exactly (pulled live via `gh api`):

```
<component_name>/__init__.py
<component_name>/component.py       @dsl.component wrapping one Anakin API call
<component_name>/metadata.yaml
<component_name>/README.md
<component_name>/OWNERS             needs the submitting account's GitHub handle
<component_name>/tests/test_component_unit.py
```

| Directory | MCP tool | Wraps |
|---|---|---|
| `anakin_web_scraper` | `scrape` | `POST /url-scraper` (submit + poll) |
| `anakin_web_search` | `search` | `POST /search` (sync) |
| `anakin_agentic_search` | `agentic_search` | `POST /agentic-search` (submit + poll) |
| `anakin_site_mapper` | `map` | `POST /map` (submit + poll) |
| `anakin_site_crawler` | `crawl` | `POST /crawl` (submit + poll) |
| `anakin_wire_discover` | `wire_discover` | `GET /wire/resolve` |
| `anakin_wire_catalog` | `wire_catalog` | `GET /wire/catalog[/:slug]` |
| `anakin_wire_read_action` | `wire_read_action` | `wire()` (Wire, type=read) |
| `anakin_wire_write_action` | `wire_write_action` | `wire()` (Wire, type=write; financial-transaction guard) |
| `anakin_wire_identities` | `wire_identities` | `GET /wire/identities` |
| `anakin_wire_login` | `wire_login` | `POST /wire/login` |
| `anakin_wire_build` | `wire_build` | `POST /wire/build-request` (financial-transaction guard) |
| `anakin_monitor_create` | `monitor_create` | `POST /monitors` |
| `anakin_monitor_list` | `monitor_list` | `GET /monitors[/:id]` |
| `anakin_monitor_changes` | `monitor_changes` | `GET /monitors/:id/changes` |
| `anakin_monitor_control` | `monitor_control` | `POST /monitors/:id/pause|resume|run`, `DELETE /monitors/:id` |
| `anakin_ai_visibility_search` | `ai_visibility_search` | `POST /ai-visibility/search` + poll `GET /ai-visibility/search/:id` |
| `anakin_ai_visibility_sources` | `ai_visibility_sources` | `GET /ai-visibility/sources` |
| `anakin_session_list` | `session_list` | `sessions.list()` |
| `anakin_session_delete` | `session_delete` | `sessions.delete()` |
| `anakin_browser_task` | `browser_task` | `POST /ai/evaluate` (async) + poll `GET /ai/jobs/:id`; financial-transaction guard |

21/21 MCP tools now have a component. `session_create` (interactive noVNC
login) and `wire_write_action`'s payment/fund-transfer branch are the only
deliberate exclusions, matching the same policy the MCP server itself
enforces (`anakin-mcp/src/tools/sessions.ts`, `anakin-mcp/src/tools/policy.ts`).

## anakin-sdk vs. raw `requests`

**Correction to an earlier note in this file**: `anakin-sdk` (PyPI) was
previously unpublished when `anakin_web_scraper` was written, so that
component talks to the API directly via `requests` with a hand-rolled
submit+poll loop. **`anakin-sdk` is now live on PyPI at v0.1.0** (verified:
`pip index`/`pypi.org/pypi/anakin-sdk/json` → `{"name": "anakin-sdk",
"version": "0.1.0"}`), and every new component below reuses it where the SDK
has a matching method, rather than re-implementing HTTP/polling logic:

- **`anakin-sdk` (`packages_to_install=["anakin-sdk"]`)**: `anakin_web_search`
  (`Anakin.search`), `anakin_agentic_search` (`Anakin.agentic_search`),
  `anakin_site_mapper` (`Anakin.map`), `anakin_site_crawler` (`Anakin.crawl`),
  `anakin_wire_read_action` / `anakin_wire_write_action` (`Anakin.wire`),
  `anakin_session_list` / `anakin_session_delete` (`Anakin.sessions.list` /
  `.delete`).
- **Raw `requests` (`packages_to_install=["requests"]`)**: every Wire
  discovery/identity/login/build tool, the full Monitor family, AI Visibility,
  and `browser_task` — none of these have an `anakin-sdk` method yet
  (verified against `anakin-py/src/anakin/client.py`); each talks to the API
  directly using the exact endpoints in `anakin-mcp/src/client.ts` /
  `anakin-mcp/src/tools/*.ts` (ground truth), including the submit+poll
  pattern for the two genuinely async endpoints (`ai_visibility_search`,
  `browser_task`).

`anakin_web_scraper` itself was **not** migrated to `anakin-sdk` in this pass
— it wasn't in scope for this batch and its current `requests`-based
implementation is still correct, just no longer the *only* option. Migrating
it is a reasonable small follow-up now that the SDK is published.

**Known SDK gap, called out in both Wire component docstrings**:
`anakin-sdk` v0.1.0's `Anakin.wire(action_id, params)` does not yet accept
`credential_id` / `identity_id` (unlike the raw `POST /v1/wire/task`
endpoint `anakin-mcp` calls). `anakin_wire_read_action` and
`anakin_wire_write_action` therefore currently only work for actions whose
`auth_mode` is `"none"`; auth-required Wire actions need the raw endpoint
until the SDK adds that parameter. This is stated plainly in each
component's docstring/README rather than glossed over.

## Verified, not assumed

- `python3 -m py_compile` passes on every `component.py` and test file in
  all 21 directories (re-run after every edit in this batch).
- Component/metadata/README/OWNERS/tests structure copied from the real,
  current `yoda_data_processor` example, not guessed.
- Every endpoint, HTTP method, and payload shape was read directly from
  `anakin-mcp/src/client.ts` and `anakin-mcp/src/tools/*.ts` (ground truth)
  — not invented. Where `anakin-sdk` covers the call, the component defers
  to the SDK's own (independently verified) request/poll logic instead of
  duplicating it.
- The financial-transaction/fund-transfer refusal guard in
  `anakin_wire_write_action`, `anakin_wire_build`, and `anakin_browser_task`
  is a direct port of the regex in `anakin-mcp/src/tools/policy.ts`
  (`DEFAULT_FINANCIAL_PATTERN`), kept byte-for-byte equivalent in intent.
- The `alertWebhookSecret` redaction in `anakin_monitor_create` /
  `anakin_monitor_list` mirrors `anakin-mcp/src/tools/monitor.ts`'s
  `redactSecrets()` — a secret that reaches a pipeline artifact/log is
  compromised by definition.
- **Could not actually run the test suite** the same way `anakin_web_scraper`
  couldn't: it imports `kfp`, and a `pip install kfp anakin-sdk` was
  attempted in an isolated venv during this session but did not finish
  downloading within the session's working window (kfp's dependency tree —
  protobuf, the Kubernetes client, google-cloud-storage, etc. — is large).
  Every test's mocked logic (submit → poll loop → redact/strip → write to
  the output-artifact path, or SDK-method-call → write) was reviewed by
  hand against the real request/response shapes, not executed.

## Steps (needs the account owner)

1. Fill in `OWNERS` in all 21 directories with a real GitHub handle.
2. Fork `kubeflow/pipelines-components`, add each directory as
   `components/data_processing/<component_name>/`.
3. `pip install -e .` and run the test suite for real — never done here.
4. Open a PR per the repo's contribution guide (`AGENTS.md` / `README.md`
   at repo root). Consider splitting into a few PRs (e.g. core
   scrape/search/map/crawl, then Wire, then Monitor/AI-Visibility/sessions/
   browser) if the maintainers prefer smaller reviewable diffs — 21
   directories in one PR is a lot to review at once.

## Not done

- Never installed `kfp` successfully in this session — verified by close
  reading against real reference source and `py_compile` only, same
  limitation as the original `anakin_web_scraper` submission.
- `anakin_web_scraper` was not migrated to `anakin-sdk` (see above) — left
  as-is since it was out of scope for this batch.
- `wire_read_action` / `wire_write_action` do not yet support
  `credential_id` / `identity_id` — an `anakin-sdk` limitation, not a bug in
  these components (see above).
