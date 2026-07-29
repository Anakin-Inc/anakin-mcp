# AnakinMonitorChangesTool

## Description

Gets the detected changes for an [Anakin](https://anakin.io) website
monitor — each entry records when the watched content differed from the
previous check, with a diff/summary (and the AI change summary when
`aiMode` is on). Use `AnakinMonitorListTool` first to find the monitor id.

This tool calls the Anakin REST API directly
(`GET /monitors/:id/changes`) — website monitoring is not yet part of
`anakin-sdk`. The response's `alertWebhookSecret` is redacted before it
reaches the agent.

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
from crewai_tools import AnakinMonitorChangesTool

tool = AnakinMonitorChangesTool()
tool.run(id="mon_abc123")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `id` (call-time): The monitor ID.
