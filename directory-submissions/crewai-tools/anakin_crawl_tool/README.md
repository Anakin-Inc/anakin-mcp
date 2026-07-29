# AnakinCrawlTool

## Description

[Anakin](https://anakin.io) bulk-fetches markdown across a site — use it when
an agent needs the contents of many pages at once (catalog ingestion,
site-wide RAG corpus). Pair with `include_patterns` / `exclude_patterns` to
scope which URLs are fetched.

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
from crewai_tools import AnakinCrawlTool

tool = AnakinCrawlTool(max_pages=25, include_patterns=["/docs/*"])
tool.run(url="https://anakin.io/docs")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `max_pages`: Optional. Hard cap on pages fetched. Default: `10`.
- `depth`: Optional. Link-hops from the starting URL to follow. Default: `1`.
- `country`: Optional. Two-letter proxy egress country code. Default: `"us"`.
- `use_browser`: Optional. Render each page in a headless browser — best for
  JavaScript-heavy sites. Default: `False`.
- `include_patterns`: Optional. Glob/regex patterns; only URLs matching at
  least one pattern are fetched.
- `exclude_patterns`: Optional. Glob/regex patterns; URLs matching any
  pattern are skipped.
- `session_id`: Optional. Saved-browser-session ID for login-protected sites.
