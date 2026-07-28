# Power Platform custom connector — submission instructions

Covers **4 rows in the tracker at once**: Power Automate, Power Apps, Azure
Logic Apps, and (per the certification docs' own wording) Copilot Studio —
one submission lights up all four, confirmed directly from
`learn.microsoft.com/connectors/custom-connectors/submit-certification`.

## What's here

Mirrors the real, current `independent-publisher-connectors/Tavily/`
example (pulled live via `gh api` — Tavily is a close functional analog:
search + scrape/crawl/map, comparable API shape):

```
apiDefinition.swagger.json   5 operations: scrape (submit+poll), search (sync), agentic search (submit+poll)
apiProperties.json           connection parameter (api_key) + publisher metadata
readme.md                    matches the real Tavily readme.md structure
```

No `script.csx` — Tavily needed one only to prepend `"Bearer "` to its
`Authorization` header; Anakin's `X-API-Key` header takes the raw key
value directly, so the `securityDefinitions` → `connectionParameters`
auto-wiring (confirmed from the Tavily example: a security definition
named `api_key` of type `apiKey` automatically binds to a connection
parameter of the same name) is sufficient with no transform script.

## Verified, not assumed

- `apiDefinition.swagger.json` parses as valid JSON (`python3 -c
  "import json; json.load(...)"` — clean).
- Every field (the `securityDefinitions`/`apiProperties.json` auth-wiring
  mechanism, the `x-ms-connector-metadata` block, the readme.md section
  structure) copied from the real, current, live Tavily connector, not
  guessed — including the subtlety that `security: []` at the swagger root
  is correct (matches the reference) even though a `securityDefinitions`
  entry exists.
- **Never validated against Microsoft's actual paconn/connector validation
  tooling** — that requires `pip install paconn` (or the Power Platform CLI),
  not attempted given this sandbox's confirmed network restrictions on pip.

## Steps (needs the account owner)

1. Fork `microsoft/PowerPlatformConnectors`, add this directory as
   `independent-publisher-connectors/Anakin/`.
2. Validate with `paconn validate` or the Power Platform connector UI
   before submitting — never done here.
3. Submit via Partner Center per
   `learn.microsoft.com/connectors/custom-connectors/submit-certification`
   — Independent Publisher track (free, no backend ownership required).
4. Community-reported turnaround ~1-2 weeks.

## Not done

Never run through Microsoft's own validation tooling — verified by JSON
parsing and close structural comparison against the real Tavily connector
only.
