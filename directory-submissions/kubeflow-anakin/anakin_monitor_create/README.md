# Anakin Monitor Create ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Create a scheduled [Anakin](https://anakin.io) website monitor.

Checks a URL every `interval_minutes` (min 15) and records a change when the content differs -- optionally alerting a webhook or email. `scope` "page" (default) watches one URL; "site" crawls the site each run; "wire" runs a Wire action each check and diffs its JSON. Active-monitor caps per plan: Free 5, Pro 20, Scale 100.

The response's `alertWebhookSecret` is redacted before it's written to the artifact -- a secret that enters a pipeline artifact/log is compromised by definition; retrieve the real value from the dashboard.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `str` | *(required)* | The URL to watch (root URL for site scope; the Wire site's URL for wire scope). |
| `interval_minutes` | `int` | *(required)* | Check frequency in minutes. Minimum 15. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `monitor` | `dsl.Output[dsl.Dataset]` | `None` | The created monitor's JSON (secret redacted) is written here. |
| `scope` | `str` | `"page"` | "page", "site", or "wire". |
| `watch_mode` | `str` | `"full_page"` | "full_page" or "specific_data". |
| `watch_format` | `str` | `"markdown"` | Format compared in full_page mode. |
| `output_schema_json` | `str` | `""` | JSON Schema (JSON-encoded string) of fields to track. Required for specific_data. |
| `ai_mode` | `bool` | `False` | AI meaningful-change filtering (+1 credit/check). |
| `ai_goal` | `str` | `""` | Natural-language description of what counts as a meaningful change. |
| `use_browser` | `bool` | `False` | Render checks with a stealth headless browser. |
| `country` | `str` | `"us"` | Two-letter proxy country code. |
| `session_id` | `str` | `""` | Saved browser-session ID for login-protected pages. |
| `is_active` | `bool` | `True` | Start running immediately. |
| `expires_at` | `str` | `""` | Optional end date (ISO 8601 or YYYY-MM-DD). |
| `alert_webhook_url` | `str` | `""` | Webhook URL that receives signed change alerts. |
| `alert_emails` | `str` | `""` | Comma-separated email recipients for change alerts. |
| `max_pages` | `int` | `-1` | Site scope: max pages crawled per run. -1 = unset. |
| `max_depth` | `int` | `-1` | Site scope: crawl depth (1-5). -1 = unset. |
| `include_patterns_csv` | `str` | `""` | Site scope: comma-separated patterns/URLs to track. |
| `exclude_patterns_csv` | `str` | `""` | Site scope: comma-separated patterns to skip. |
| `wire_action_id` | `str` | `""` | Wire scope (required there): the action run each check. |
| `wire_catalog_slug` | `str` | `""` | Wire scope: catalog slug of the Wire site. |
| `wire_credential_id` | `str` | `""` | Wire scope: credential ID when the action needs auth. |
| `wire_params_json` | `str` | `""` | Wire scope: parameters passed to the action each check (JSON-encoded). |
| `wire_watch_paths_csv` | `str` | `""` | Wire scope: comma-separated JSON paths to diff. |

## Metadata 🗂️

- **Name**: anakin_monitor_create
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - monitoring
  - data_processing
  - alerting
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
