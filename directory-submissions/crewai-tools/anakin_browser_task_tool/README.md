# AnakinBrowserTaskTool

## Description

Runs a natural-language task in a real cloud browser driven by an AI agent,
via [Anakin](https://anakin.io): it navigates, clicks, types, scrolls, and
extracts on your behalf ("find the cheapest 65-inch TV on this site and
list its specs", "fill the contact form with ..."). Use when scraping
cannot do the job (multi-step flows, interactions, complex navigation) and
no Wire action covers the site. Runs up to ~5 minutes; this tool polls to
completion. Does not execute payments or transfer funds — such tasks are
refused.

This tool calls the Anakin REST API directly (`POST /ai/evaluate`, polling
`GET /ai/jobs/:id`) — browser automation is not yet part of `anakin-sdk`.

**Never put passwords in the prompt.** For login-protected tasks, pass
`session_id` from `AnakinSessionListTool`.

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
from crewai_tools import AnakinBrowserTaskTool

tool = AnakinBrowserTaskTool(url="https://example-shop.com", max_steps=25)
tool.run(prompt="Find the cheapest 65-inch TV and list its specs")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `url`: Optional. Navigate here before starting. Omit to let the agent
  follow URLs named in the prompt.
- `session_id`: Optional. Saved browser-session ID so the task runs logged
  in.
- `max_steps`: Optional. Cap on agent steps (navigation/click/type
  actions).
- `timeout_ms`: Optional. Task timeout in milliseconds (server caps runs at
  ~330s regardless).
- `output_schema`: Optional. JSON Schema for the result — the agent returns
  structured data conforming to it.
- `prompt` (call-time): The task in natural language.
