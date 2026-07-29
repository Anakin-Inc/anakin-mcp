# Anakin Monitor List ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

List [Anakin](https://anakin.io) website monitors, or fetch one by id.

Use this to find a monitor's `id` before `anakin_monitor_changes` or `anakin_monitor_control`. Any `alertWebhookSecret` in the response is redacted before being written to the artifact.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `monitors` | `dsl.Output[dsl.Dataset]` | `None` | Raw monitor(s) JSON (secret redacted) is written here. |
| `id` | `str` | `""` | Monitor ID -- fetch just this monitor. Empty lists all monitors. |

## Metadata 🗂️

- **Name**: anakin_monitor_list
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
