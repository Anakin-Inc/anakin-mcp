# Nango — submission instructions

Real, fully self-serve, no partner gate — confirmed the strongest candidate
in this whole research round. Nango's integration catalog is an open-source
YAML file; adding a provider is a single entry, no code.

## What's here

`provider-entry.yaml` — the `anakin:` block to append into
`packages/providers/providers.yaml` in `NangoHQ/nango`.

## Verified, not assumed

- Pulled the real, current `providers.yaml` (25,514 lines) and used the
  `exa:` entry (Exa — a comparable AI search API) as the template, not a
  guessed shape.
- Validated the YAML parses (Ruby's Psych — same fallback used elsewhere
  this session since `pyyaml` isn't installable in this sandbox).
- Pulled the real JSON Schema (`scripts/validation/providers/schema.json`)
  and confirmed: top-level key `anakin` matches the required
  `^[a-z0-9-]+$` pattern, and the only two required per-provider fields are
  `display_name` and `docs` — both present. `categories: [search,
  dev-tools]` uses two of the real category strings pulled from the file
  (not invented — `search`, `dev-tools`, `analytics`, `crm`, etc. are the
  actual enum in use).

## Steps (needs the account owner)

1. Fork `NangoHQ/nango`, append the `anakin:` block from
   `provider-entry.yaml` into `packages/providers/providers.yaml`
   (alphabetically, near the top given the name).
2. The `docs:` field points at `nango.dev/docs/integrations/all/anakin` —
   confirm whether that page is auto-generated from this YAML entry or
   needs a companion doc page authored separately (couldn't confirm either
   way; no dedicated CONTRIBUTING.md for providers was found in the repo).
3. Open a PR — standard code review, no application/partner tier.

## Not done

Never run their local validation tooling (`npm test` in
`packages/providers/`) or opened the PR — needs the account owner's GitHub
identity.
