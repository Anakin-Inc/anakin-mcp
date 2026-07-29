# Anakin Wire Login ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Sign in to a credentials-mode [Anakin](https://anakin.io) Wire site and get a credential.

The `credential_id` in the output is usable with `anakin_wire_read_action` / `anakin_wire_write_action` once the SDK's `wire()` call supports passing one. The password is never stored by Anakin, only the encrypted session.

**Security note**: `params_json` typically carries a password. Supply it via a Kubeflow Secret-backed pipeline parameter, never hardcoded into a checked-in pipeline definition.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `catalog_slug` | `str` | *(required)* | The catalog to sign in to (e.g. "neb"). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `wire_credential` | `dsl.Output[dsl.Dataset]` | `None` | Raw login JSON response (incl. the new credential_id) is written here. |
| `params_json` | `str` | `"{}"` | Login fields defined by the catalog, as a JSON-encoded string. |
| `identity_name` | `str` | `""` | Optional name for the identity. |

## Metadata 🗂️

- **Name**: anakin_wire_login
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
