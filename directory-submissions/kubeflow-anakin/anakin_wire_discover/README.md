# Anakin Wire Discover ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Find [Anakin](https://anakin.io) Wire actions for a task from a natural-language intent.

Wire is a catalog of pre-built automation actions across hundreds of websites. Returns ranked candidate actions -- each with its `action_id`, type (read/write), required/optional params, credit cost, and whether auth is needed -- to feed into `anakin_wire_read_action` / `anakin_wire_write_action`.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | `str` | *(required)* | The intent in natural language, e.g. "top phones on walmart". |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `wire_actions` | `dsl.Output[dsl.Dataset]` | `None` | Raw JSON `{results[], next}` response is written here. |
| `limit` | `int` | `5` | Maximum number of candidate actions to return. |

## Metadata 🗂️

- **Name**: anakin_wire_discover
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - automation
  - third_party_integration
  - data_collection
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
