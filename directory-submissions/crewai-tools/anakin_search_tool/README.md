# AnakinSearchTool

## Description

[Anakin](https://anakin.io)'s AI-powered web search — synchronous, returns
structured results with URL, title, snippet, and date. No polling needed.

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
from crewai_tools import AnakinSearchTool

tool = AnakinSearchTool(limit=10)
tool.run(query="latest developments in AI agents")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `limit`: Optional. Maximum number of results to return (max 20).
  Default: `5`.
