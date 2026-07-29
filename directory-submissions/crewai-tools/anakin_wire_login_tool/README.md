# AnakinWireLoginTool

## Description

Signs in to a credentials-mode [Anakin Wire](https://anakin.io) site and
returns a `credential_id` usable immediately with `AnakinWireReadActionTool` /
`AnakinWireWriteActionTool`. The password is never stored, only the
encrypted session. Only needed for actions whose `auth_mode` is
`"required"`, and only for catalogs that support password sign-in;
cookie-based sites use the Anakin dashboard connect flow instead.

This tool calls the Anakin REST API directly (`POST /wire/login`) — Wire
login is not yet part of `anakin-sdk`.

**Side effect**: this stores an encrypted session server-side. Do not put
secrets you don't own into `params`.

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
from crewai_tools import AnakinWireLoginTool

tool = AnakinWireLoginTool()
tool.run(catalog_slug="neb", params={"email": "you@example.com", "password": "..."})
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `catalog_slug` (call-time): The catalog to sign in to.
- `params` (call-time): Login fields defined by the catalog's
  `login_input_schema` (see `AnakinWireCatalogTool`).
- `identity_name` (call-time): Optional name for the identity.
