# Anakin Agentic Search ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Multi-stage AI research pipeline with [Anakin](https://anakin.io): searches the web, scrapes the most relevant citations, and uses an LLM to structure the combined data into a unified answer.

Use when one URL or a flat search result can't answer the question (comparative analysis, multi-jurisdictional research, market intelligence). Submits the job and polls to completion. Costs 10 credits.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | `str` | *(required)* | The research question or task in natural language. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `research_result` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{id, status, summary, structured_data, data_schema, cached}` is written here. |
| `schema_json` | `str` | `""` | Optional JSON Schema (JSON-encoded string) for the desired output shape. Empty infers a schema from the prompt. |
| `use_browser` | `bool` | `True` | Use the headless browser when scraping cited pages. |

## Metadata 🗂️

- **Name**: anakin_agentic_search
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - data_processing
  - ai_search
  - data_collection
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
