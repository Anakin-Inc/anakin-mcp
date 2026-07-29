# AnakinAIVisibilitySourcesTool

## Description

Lists the AI answer engines (ChatGPT, Gemini, Google AI Overview, etc.)
available to `AnakinAIVisibilitySearchTool` — each with its slug (what you
pass as `sources`) and display label.

This tool calls the Anakin REST API directly
(`GET /ai-visibility/sources`) — AI visibility is not yet part of
`anakin-sdk`.

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
from crewai_tools import AnakinAIVisibilitySourcesTool

tool = AnakinAIVisibilitySourcesTool()
tool.run()
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
