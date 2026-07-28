# Anakin Connector Example

## Connector overview
This connector syncs AI-powered web search results from [Anakin](https://anakin.io) — a web scraping, search, and deep-research API — into a single `search_results` table. Configure a search prompt and the connector re-runs that search on every sync, upserting the current result set. It covers Anakin's synchronous `/v1/search` endpoint; scraping and agentic-research endpoints are async job-based (submit, then poll) and aren't covered by this first pass.

## Requirements
- [Supported Python versions](https://github.com/fivetran/community_connectors/blob/main/README.md#requirements)
- Operating system:
  - Windows: 10 or later (64-bit only)
  - macOS: 13 (Ventura) or later (Apple Silicon [arm64] or Intel [x86_64])
  - Linux: Distributions such as Ubuntu 20.04 or later, Debian 10 or later, or Amazon Linux 2 or later (arm64 or x86_64)

## Getting started
Refer to the [Connector SDK Setup Guide](https://fivetran.com/docs/connectors/connector-sdk/setup-guide) to get started.

## Features
- Syncs structured search results (URL, title, snippet, publish date) for a configured search prompt.
- No pagination or incremental cursor needed — Anakin's search endpoint is synchronous and returns a bounded result set per call.

## Configuration file
`configuration.json` requires:
- `api_key` – an Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required).
- `search_prompt` – the search query or question to run on every sync.
- `search_limit` – optional, maximum number of results to return (default `5`, max `20`).

> Note: Keep `configuration.json` out of version control if it contains a real API key.

## Requirements file
`requirements.txt` is empty — this connector only uses `requests`, which is pre-installed in the Connector SDK base environment.

## Authentication
Requests are authenticated with the `X-API-Key` header, set from the `api_key` configuration value. Refer to `def update(configuration, state)`.

## Data handling
Each sync calls `POST /v1/search` once with the configured prompt and limit, then upserts every returned result into `search_results`, primary-keyed on `url`. Refer to `def update(configuration, state)`.

## Error handling
API errors (non-2xx responses, network failures) raise a `RuntimeError` with the underlying `requests` exception message. Refer to `def update(configuration, state)`.

## Tables created
The connector creates the `SEARCH_RESULTS` table:
- `url` (STRING, primary key)
- `title` (STRING)
- `snippet` (STRING)
- `date` (STRING)
- `last_updated` (STRING)

## Additional considerations
This connector was tested with `python3 -m py_compile` for syntax validity only — it has not been run against `fivetran debug` or a live Anakin API key. Scrape and agentic-research endpoints (async, submit-then-poll) would need a second connector or an extension of this one using Fivetran's incremental/stateful sync patterns for long-running jobs.
