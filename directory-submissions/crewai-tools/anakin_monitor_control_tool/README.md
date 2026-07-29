# AnakinMonitorControlTool

## Description

Controls an existing [Anakin](https://anakin.io) website monitor:
`"pause"` stops scheduled checks, `"resume"` restarts them (may hit the
plan's active-monitor cap), `"run_now"` triggers an immediate
out-of-schedule check (billed like a normal check), and `"delete"`
permanently removes the monitor and its history. Use
`AnakinMonitorListTool` to find the id.

This tool calls the Anakin REST API directly
(`POST /monitors/:id/pause|resume|run`, `DELETE /monitors/:id`) — website
monitoring is not yet part of `anakin-sdk`.

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
from crewai_tools import AnakinMonitorControlTool

tool = AnakinMonitorControlTool()
tool.run(id="mon_abc123", action="pause")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `id` (call-time): The monitor ID.
- `action` (call-time): One of `"pause"`, `"resume"`, `"run_now"`,
  `"delete"`.
