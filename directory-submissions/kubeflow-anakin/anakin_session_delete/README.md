# Anakin Session Delete ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Permanently delete a saved [Anakin](https://anakin.io) browser session.

Irreversible -- the user must log in again through the dashboard to recreate it, and any monitors or steps referencing this `session_id` will lose authenticated access. Find ids with `anakin_session_list`. Useful as a cleanup step at the end of a pipeline that used a temporary session.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `session_id` | `str` | *(required)* | The session ID to delete (from anakin_session_list). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `deletion_status` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{session_id, deleted}` is written here. |

## Metadata 🗂️

- **Name**: anakin_session_delete
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
