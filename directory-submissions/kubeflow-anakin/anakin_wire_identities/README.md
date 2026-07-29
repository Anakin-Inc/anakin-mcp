# Anakin Wire Identities ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

List saved [Anakin](https://anakin.io) Wire identities and their credentials.

An identity is a named account on a site; each credential's `id` is the `credential_id` needed to run auth-required actions once the SDK supports passing one to `wire()` (see `anakin_wire_read_action` / `anakin_wire_write_action`).

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `wire_identities` | `dsl.Output[dsl.Dataset]` | `None` | Raw identities JSON response is written here. |
| `catalog_id` | `str` | `""` | Optional -- restrict to identities for a single catalog. |

## Metadata 🗂️

- **Name**: anakin_wire_identities
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - automation
  - third_party_integration
  - credential_management
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
