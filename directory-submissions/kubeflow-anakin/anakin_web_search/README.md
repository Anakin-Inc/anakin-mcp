# Anakin Web Search ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

AI-powered web search with [Anakin](https://anakin.io) -- returns ranked result URLs, titles, and snippets.

Synchronous (no polling); useful as a lightweight discovery step that feeds URLs into a downstream `anakin_web_scraper` or `anakin_site_crawler` step. Costs 3 credits per call.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | `str` | *(required)* | The search query in natural language. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `search_results` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{id, results[]}` is written here. |
| `limit` | `int` | `5` | Maximum number of results to return. |

## Metadata 🗂️

- **Name**: anakin_web_search
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - data_processing
  - web_scraping
  - ai_search
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
