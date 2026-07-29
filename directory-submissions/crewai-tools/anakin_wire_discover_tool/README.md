# AnakinWireDiscoverTool

## Description

[Anakin Wire](https://anakin.io) is a catalog of pre-built automation
actions across hundreds of websites. This tool turns a natural-language
intent ("top phones on walmart") into ranked candidate `action_id`s, each
with its type (`read`/`write`), parameter schema, credit cost, and whether
authentication is needed. Run a returned action with
`AnakinWireReadActionTool` or `AnakinWireWriteActionTool`.

This tool calls the Anakin REST API directly (`GET /wire/resolve`) — Wire
discovery is not yet part of `anakin-sdk`.

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
from crewai_tools import AnakinWireDiscoverTool

tool = AnakinWireDiscoverTool(limit=5)
tool.run(q="top phones on walmart")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `limit`: Optional. Default maximum number of candidate actions to return
  when not overridden per call. Default: `5`.
- `q` (call-time): The intent in natural language.
- `limit` (call-time): Optional override of the constructor default.
