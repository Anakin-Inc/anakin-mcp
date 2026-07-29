# Anakin Monitor Control ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Control an existing [Anakin](https://anakin.io) website monitor.

`action` "pause" stops scheduled checks, "resume" restarts them, "run_now" triggers an immediate out-of-schedule check (billed like a normal check), and "delete" permanently removes the monitor and its history. Use `anakin_monitor_list` to find the id.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `str` | *(required)* | The monitor ID (from anakin_monitor_list or anakin_monitor_create). |
| `action` | `str` | *(required)* | One of "pause", "resume", "run_now", "delete". |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `monitor_status` | `dsl.Output[dsl.Dataset]` | `None` | Raw response JSON is written here. |

## Metadata 🗂️

- **Name**: anakin_monitor_control
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - monitoring
  - alerting
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
