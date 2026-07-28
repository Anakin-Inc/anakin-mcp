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
via `gh api`), not guessed. Covers `POST /v1/search` (synchronous, clean fit
for a sync-and-upsert connector) — deliberately scoped out `scrape` and
`agentic-search` since those are async job endpoints and don't fit the
template's schema/update model without real incremental-sync design work;
noted as a follow-on in the README rather than forced in.

## Verified, not assumed

- `python3 -m py_compile` passes on `connector.py`.
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
