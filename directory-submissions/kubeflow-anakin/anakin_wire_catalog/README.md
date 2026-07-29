# Anakin Wire Catalog ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Browse the [Anakin](https://anakin.io) Wire catalog.

With no `slug`, lists every supported website and its action count. Pass a catalog `slug` to get that site's full action list with exact parameter schemas, each action's type (read/write), auth mode, and credit cost.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `wire_catalog` | `dsl.Output[dsl.Dataset]` | `None` | Raw catalog JSON response is written here. |
| `slug` | `str` | `""` | Catalog slug to inspect (e.g. "walmart"). Empty lists all catalogs. |

## Metadata 🗂️

- **Name**: anakin_wire_catalog
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
