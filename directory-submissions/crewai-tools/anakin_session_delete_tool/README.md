# AnakinSessionDeleteTool

## Description

Permanently deletes a saved [Anakin](https://anakin.io) browser session and
its encrypted login data. Irreversible — the user must log in again through
the Anakin dashboard to recreate it, and any monitors or requests
referencing that `session_id` will lose authenticated access. Find ids with
`AnakinSessionListTool`.

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
from crewai_tools import AnakinSessionDeleteTool

tool = AnakinSessionDeleteTool()
tool.run(session_id="sess_abc123")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `session_id` (call-time): The session ID to delete.
