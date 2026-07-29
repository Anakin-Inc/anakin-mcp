# AnakinScrapeTool

## Description

[Anakin](https://anakin.io) turns any website into clean markdown or
AI-extracted structured JSON — web scraping, crawling, AI search, and
multi-stage agentic research over hundreds of popular sites.

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
from crewai_tools import AnakinScrapeTool

tool = AnakinScrapeTool(generate_json=True)
tool.run(url="https://anakin.io/pricing")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `generate_json`: Optional. AI-extract structured JSON from the page
  content. Default: `False`.
- `use_browser`: Optional. Use a headless browser — best for JS-heavy
  sites. Default: `False`.
