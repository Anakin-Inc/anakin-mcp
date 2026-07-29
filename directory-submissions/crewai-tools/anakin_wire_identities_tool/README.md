# AnakinWireIdentitiesTool

## Description

Lists your saved [Anakin Wire](https://anakin.io) identities and their
credentials. An identity is a named account on a site; each credential's
`id` is the `credential_id` a Wire action needs when its `auth_mode` is
`"required"`. Use this to find an existing credential before running an
auth-required action with `AnakinWireReadActionTool` /
`AnakinWireWriteActionTool` (and confirm its status is `"active"`, not
`"expired"`).

This tool calls the Anakin REST API directly (`GET /wire/identities`) —
Wire identity listing is not yet part of `anakin-sdk`.

## Installation

- Get a free API key at [anakin.io/dashboard](https://anakin.io/dashboard)
  (300 credits, no card required) and set it as `ANAKIN_API_KEY`.
- Install `crewai[tools]` (this tool only needs `requests`, already a
  `crewai[tools]` dependency):

```
pip install 'crewai[tools]'
```

## Example

```python
from crewai_tools import AnakinWireIdentitiesTool

tool = AnakinWireIdentitiesTool()
tool.run(catalog_id="walmart")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `catalog_id` (call-time): Optional. Restrict to identities for a single
  catalog.
