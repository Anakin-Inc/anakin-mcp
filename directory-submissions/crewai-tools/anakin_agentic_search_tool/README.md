# AnakinAgenticSearchTool

## Description

[Anakin](https://anakin.io)'s multi-stage deep research pipeline: it searches
the web, scrapes the most relevant citations, and uses an LLM to structure the
combined data into a unified answer. Use this when a single URL or a flat
search result will not answer the question — comparative analysis,
multi-jurisdictional research, market intelligence. Async under the hood
(typically 1-5 minutes); this tool polls to completion for you.

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
from crewai_tools import AnakinAgenticSearchTool

tool = AnakinAgenticSearchTool(
    output_schema={
        "type": "object",
        "properties": {"vendors": {"type": "array", "items": {"type": "string"}}},
    }
)
tool.run(prompt="Compare the top 3 headless CMS platforms on pricing and API limits")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `use_browser`: Optional. Use the headless browser when scraping cited pages
  — more reliable for JavaScript-heavy sources. Default: `True`.
- `output_schema`: Optional. JSON Schema describing the desired
  `structured_data` shape. If omitted, the engine infers a schema from the
  prompt.
