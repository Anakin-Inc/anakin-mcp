# Anakin Monitor Changes ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Get the detected changes for an [Anakin](https://anakin.io) website monitor.

Each entry records when the watched content differed from the previous check, with a diff/summary (and the AI change summary when `ai_mode` was on). Use `anakin_monitor_list` first to find the monitor id.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `str` | *(required)* | The monitor ID (from anakin_monitor_list or anakin_monitor_create). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `changes` | `dsl.Output[dsl.Dataset]` | `None` | Raw changes JSON is written here. |

## Metadata 🗂️

- **Name**: anakin_monitor_changes
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - monitoring
  - data_processing
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
