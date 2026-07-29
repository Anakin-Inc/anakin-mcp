# Anakin AI Visibility Search ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Ask multiple AI answer engines (ChatGPT, Gemini, Google AI Overview) the same question via [Anakin](https://anakin.io).

Returns one result per engine plus an AI-generated synthesis of where the engines agree and diverge -- useful for brand / AI-SEO visibility checks. Submits the search and polls to a terminal state; a partial/failed run is still written to the artifact (per-source results are useful either way), not raised.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `str` | *(required)* | The question to ask every engine (max 2000 characters). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `visibility_results` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{search_id, status, country, synthesis, results[]}` is written here. |
| `sources_csv` | `str` | `""` | Comma-separated engine slugs to query. Empty queries all enabled engines. |
| `country` | `str` | `"us"` | Two-letter ISO country for the search geography. |
| `include_full_content` | `bool` | `False` | Include each engine's raw full answer (large). |

## Metadata 🗂️

- **Name**: anakin_ai_visibility_search
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - ai_search
  - monitoring
  - brand_analytics
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
