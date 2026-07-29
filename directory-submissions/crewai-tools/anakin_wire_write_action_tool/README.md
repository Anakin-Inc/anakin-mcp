# AnakinWireWriteActionTool

## Description

[Anakin Wire](https://anakin.io) is a catalog of pre-built automation actions
across hundreds of websites. This tool runs a Wire **write** action — one
that performs a state-changing interaction on the target site (submit a
form, add an item to a cart, post or send content, update account settings).
Discover `action_id`s with `AnakinWireDiscoverTool` or `AnakinWireCatalogTool`
first. For read-only data extraction use `AnakinWireReadActionTool` instead.
It does not execute payments or transfer funds — such requests are refused
both client-side and by the API.

## Installation

- Get a free API key at [anakin.io/dashboard](https://anakin.io/dashboard)
  (300 credits, no card required) and set it as `ANAKIN_API_KEY`.
- Install the [Anakin SDK](https://github.com/Anakin-Inc/anakin-py) along
  with `crewai[tools]`:

```
pip install anakin-sdk 'crewai[tools]'
```

## Example

```python
from crewai_tools import AnakinWireWriteActionTool

tool = AnakinWireWriteActionTool()
tool.run(
    action_id="linkedin.send_connection_request",
    params={"profile_url": "https://linkedin.com/in/example", "note": "Hi!"},
)
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `action_id` (call-time): The Wire action to run.
- `params` (call-time): The action's input parameters, matching its schema
  from discovery.

## Known limitation

Most write actions need authentication. Wire's `credential_id`/`identity_id`
override is not yet exposed by `anakin-sdk` v0.1.0's `wire()` method — the
action runs against whatever identity is connected in the Anakin dashboard
for that site, and fails with an `AUTH_REQUIRED` error if none is connected.
