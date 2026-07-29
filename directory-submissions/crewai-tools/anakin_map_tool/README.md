# AnakinMapTool

## Description

[Anakin](https://anakin.io) discovers every reachable URL under a website —
sitemap plus link traversal — so an agent can scope a crawl or pick which
sub-pages to scrape before spending credits on the full content.

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
from crewai_tools import AnakinMapTool

tool = AnakinMapTool(limit=200, depth=3)
tool.run(url="https://anakin.io")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `limit`: Optional. Maximum number of URLs to return overall. Default: `100`.
- `depth`: Optional. How many link-hops from the starting URL to follow.
  Default: `2`.
- `limit_per_level`: Optional. Maximum URLs collected per depth level
  (controls breadth). Default: `100`.
- `include_subdomains`: Optional. Include URLs on subdomains of the starting
  host. Default: `False`.
- `include_external_links`: Optional. Also collect (but do not follow)
  external links. Default: `False`.
- `use_browser`: Optional. Render with a headless browser — best for
  JavaScript-heavy single-page apps. Default: `False`.
