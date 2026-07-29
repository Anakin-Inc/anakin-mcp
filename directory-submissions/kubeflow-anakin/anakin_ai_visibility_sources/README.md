# Anakin AI Visibility Sources ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

List the AI answer engines available to [Anakin](https://anakin.io)'s AI visibility search.

Each entry carries its slug (what you pass as a source to `anakin_ai_visibility_search`) and display label.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `visibility_sources` | `dsl.Output[dsl.Dataset]` | `None` | Raw sources JSON is written here. |

## Metadata 🗂️

- **Name**: anakin_ai_visibility_sources
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - ai_search
  - brand_analytics
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
