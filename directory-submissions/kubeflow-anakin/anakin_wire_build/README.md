# Anakin Wire Build ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Request a brand-new [Anakin](https://anakin.io) Wire action for a website not yet in the catalog.

Describe the site and what the action should do or extract; Wire generates and auto-tests a scraper, then publishes it. Asynchronous -- returns status "pending" immediately (this component does not poll to completion). Refuses goals that look like they complete a payment or transfer funds.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `website_url` | `str` | *(required)* | The site to build an action for. |
| `goal` | `str` | *(required)* | Natural-language description of what the action should do or extract. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `wire_build_status` | `dsl.Output[dsl.Dataset]` | `None` | Raw build-request JSON response is written here. |
| `catalog_id` | `str` | `""` | Optional -- attach to an existing catalog instead of creating one. |
| `visibility` | `str` | `"private"` | Action visibility: "private" or "public". |
| `force` | `bool` | `False` | Build even if similar actions already exist for the domain. |

## Metadata 🗂️

- **Name**: anakin_wire_build
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - automation
  - third_party_integration
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
