# Anakin Wire Write Action ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Run an Anakin Wire (https://anakin.io) WRITE action -- one that performs a state-changing interaction on the target site (submit a form, add to cart, post content, update account settings).

Discover `action_id`s first with `anakin_wire_discover` or `anakin_wire_catalog` and confirm the action's type is "write"; use `anakin_wire_read_action` for data-extraction actions instead. Refuses actions that look like they complete a payment or transfer funds (Anthropic Connectors Directory policy, mirrored from anakin-mcp's `src/tools/policy.ts`).

**Known SDK limitation**: anakin-sdk v0.1.0's `wire()` method does not yet accept `credential_id`/`identity_id`, so this component currently only runs actions whose `auth_mode` is `"none"`.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action_id` | `str` | *(required)* | The action to run (from anakin_wire_discover / anakin_wire_catalog). |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `action_result` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{job_id, status, data, credits_used, execution_ms}` is written here. |
| `params_json` | `str` | `"{}"` | The action's input parameters as a JSON-encoded string. |

## Metadata 🗂️

- **Name**: anakin_wire_write_action
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
