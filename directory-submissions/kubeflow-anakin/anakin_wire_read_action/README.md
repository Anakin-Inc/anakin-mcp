# Anakin Wire Read Action ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Run an Anakin Wire (https://anakin.io) READ action -- one that extracts data and does not change state on the target site.

Wire is Anakin's catalog of pre-built automation actions across hundreds of sites. Discover `action_id`s first with `anakin_wire_discover` or `anakin_wire_catalog` and confirm the action's type is "read"; use `anakin_wire_write_action` for state-changing actions instead.

**Known SDK limitation**: anakin-sdk v0.1.0's `wire()` method does not yet accept `credential_id`/`identity_id`, so this component currently only runs actions whose `auth_mode` is `"none"`.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action_id` | `str` | *(required)* | The action to run (from anakin_wire_discover / anakin_wire_catalog). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `action_result` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{job_id, status, data, credits_used, execution_ms}` is written here. |
| `params_json` | `str` | `"{}"` | The action's input parameters as a JSON-encoded string. |

## Metadata 🗂️

- **Name**: anakin_wire_read_action
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - automation
  - web_scraping
  - third_party_integration
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
