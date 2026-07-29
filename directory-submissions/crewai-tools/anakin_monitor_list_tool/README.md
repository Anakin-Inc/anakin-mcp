# AnakinMonitorListTool

## Description

Lists your [Anakin](https://anakin.io) website monitors, or pass `id` to
fetch one monitor's full configuration and status (next/last check time,
active state, per-check credit cost, alert settings). Use this to find a
monitor's `id` before `AnakinMonitorChangesTool` or
`AnakinMonitorControlTool`.

This tool calls the Anakin REST API directly (`GET /monitors[/:id]`) —
website monitoring is not yet part of `anakin-sdk`. The response's
`alertWebhookSecret` is redacted before it reaches the agent.

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
from crewai_tools import AnakinMonitorListTool

tool = AnakinMonitorListTool()
tool.run()  # list all
tool.run(id="mon_abc123")  # fetch one
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `id` (call-time): Optional. Fetch just this monitor instead of the full
  list.
