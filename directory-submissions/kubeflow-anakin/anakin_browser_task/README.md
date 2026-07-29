# Anakin Browser Task ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Run a natural-language AI browser automation task with [Anakin](https://anakin.io).

A real cloud browser driven by an AI agent navigates, clicks, types, scrolls, and extracts on your behalf. Use when a plain scrape can't do the job and no Wire action covers the site (check `anakin_wire_discover` first). For login-protected tasks pass a `session_id` from `anakin_session_list` -- never put passwords in the prompt. Refuses tasks that look like they complete a payment or transfer funds. Submits async and polls to completion (up to 6 minutes).

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | `str` | *(required)* | The task in natural language. Never include passwords -- use session_id. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `task_result` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{success, result, steps_taken, iterations, cached, duration_ms, run_id}` is written here. |
| `url` | `str` | `""` | Navigate here before starting. Empty lets the agent follow URLs named in the prompt. |
| `session_id` | `str` | `""` | Saved browser-session ID so the task runs logged in. |
| `max_steps` | `int` | `-1` | Cap on agent steps. -1 = unset (API default). |
| `timeout_ms` | `int` | `-1` | Task timeout in milliseconds. -1 = unset (API default). |
| `output_schema_json` | `str` | `""` | JSON Schema (JSON-encoded string) for structured output. |

## Metadata 🗂️

- **Name**: anakin_browser_task
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - browser_automation
  - ai_agent
  - automation
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
