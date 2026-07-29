# Anakin Session List ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

List saved [Anakin](https://anakin.io) browser sessions -- encrypted login states (cookies + localStorage) created once via the Anakin dashboard or Browser API, then reused for authenticated work.

Pass a listed session's `id` as `session_id` to `anakin_web_scraper` / `anakin_site_crawler` / `anakin_monitor_create` / `anakin_browser_task`. Creating a session is not exposed as a component -- it's an interactive noVNC login flow that can't run inside a pipeline step.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `sessions` | `dsl.Output[dsl.Dataset]` | `None` | JSON array of session objects is written here. |
| `domain` | `str` | `""` | Filter to sessions for one website domain, e.g. "amazon.com". Empty means no filter. |

## Metadata 🗂️

- **Name**: anakin_session_list
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - browser_automation
  - credential_management
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
