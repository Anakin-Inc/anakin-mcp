# AnakinSessionListTool

## Description

[Anakin](https://anakin.io) saved browser sessions are encrypted login states
(cookies + localStorage) created once via the Anakin dashboard or Browser
API, then reused for authenticated scraping/crawling/monitoring. This tool
lists them so an agent can find a `session_id` before an authenticated call.
Creating a session is not exposed here — it is an interactive flow (a live
browser the user logs into) that cannot run inside a tool call.

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
from crewai_tools import AnakinSessionListTool

tool = AnakinSessionListTool()
tool.run(domain="amazon.com")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `domain` (call-time): Optional. Filter to sessions for one website domain.
