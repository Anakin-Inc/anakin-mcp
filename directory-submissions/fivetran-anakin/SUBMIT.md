# Fivetran — submission instructions

Real, PR-buildable, no live paid account needed for the initial build —
confirmed one of the strongest candidates in the whole research round.
`fivetran/community_connectors`, built on the open-source
`fivetran/connector_sdk`.

## What's here

```
connector.py          schema() + update(), plain `requests` (pre-installed, no extra deps)
configuration.json     api_key, search_prompt, search_limit placeholders
requirements.txt       empty — requests is pre-installed
README.md              follows the repo's real README_template.md structure
```

Built directly against the real `_template_connector` scaffold (pulled live
via `gh api`), not guessed. Covers every genuinely synchronous Anakin
endpoint (clean fit for a sync-and-upsert connector), across seven tables:
`POST /v1/search` (original), plus `GET /ai-visibility/sources`,
`GET /wire/catalog`, `GET /wire/resolve`, `GET /sessions`, `GET /monitors`,
and `GET /monitors/{id}/changes` (added in a re-examination pass — see
README's "Capabilities covered" / "Capabilities not covered"). Deliberately
still scopes out `scrape`, `crawl`, `map`, `agentic-search`, and Wire action
execution (`wire_read_action`/`wire_write_action`) since those are async job
endpoints (submit, then poll) and don't fit the template's schema/update
model without real incremental-sync design work; noted as a follow-on in the
README rather than forced in.

## Verified, not assumed

- `python3 -m py_compile` passes on `connector.py` — checked on Python
  3.10, 3.11, 3.12, and 3.13 (the file uses `from __future__ import
  annotations` so its `X | None` type hints stay compatible with the SDK's
  documented Python 3.9 floor too, though 3.9 itself wasn't available to
  test against in this sandbox).
- `configuration.json` is valid JSON with the three new optional keys
  (`wire_discover_query`, `wire_discover_limit`, `session_domain`) alongside
  the original three.
- Field-level schemas for `sessions`, `wire_catalog`, and
  `wire_discover_results` are read from Anakin's published `anakin-py` SDK
  models and Wire's own OpenAPI spec (`anakin-mcp/openapi.yaml`), not
  guessed. `monitors`/`monitor_changes` field names are best-effort (those
  two endpoint families aren't in any published Anakin SDK yet) — each row
  also carries a `raw_json` fallback column so nothing is silently dropped,
  the same convention `anakin-tap-anakin`'s equivalent streams already use
  for the same reason.
- README follows the real, current `README_template.md` style rules found
  in the repo (H1 format, no title case in subheadings, hyphens not
  asterisks for bullets, etc.) — not a generic README.
- **Never run `fivetran debug`** — that requires the `fivetran-connector-sdk`
  CLI, which needs `pip install`, blocked by this sandbox's network
  restrictions (same issue hit by every other Python package this session).

## Steps (needs the account owner)

1. Fork `fivetran/community_connectors`, add this directory as
   `anakin/` (or similar) at the repo root, alongside the other connector
   examples.
2. Fill in `configuration.json` with a real API key, run
   `fivetran debug` locally to actually exercise the connector against
   live Anakin data before opening a PR — this is the one verification
   step this session couldn't do.
3. Follow their PR template (masked test-output screenshots required per
   the research) — CLA bot signs automatically, then Copilot review + two
   Fivetran team approvals.

## Not done

Never run — verified by close reading against the real template and
`py_compile` only.
