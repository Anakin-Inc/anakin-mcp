# AnakinWireBuildTool

## Description

Requests a brand-new [Anakin Wire](https://anakin.io) action for a website
that isn't in the catalog yet. Describe the site (`website_url`) and what
the action should do or extract (`goal`); Wire generates and auto-tests a
scraper, then publishes it. Asynchronous (returns status `"pending"`) and
charges credits, refunded automatically if the build fails. Only use this
after `AnakinWireDiscoverTool` / `AnakinWireCatalogTool` confirm no existing
action covers the site. Does not build payment or fund-transfer actions —
such requests are refused.

This tool calls the Anakin REST API directly (`POST /wire/build-request`) —
Wire build requests are not yet part of `anakin-sdk`.

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
from crewai_tools import AnakinWireBuildTool

tool = AnakinWireBuildTool(visibility="private")
tool.run(
    website_url="https://example-shop.com",
    goal="Extract product name, price, and stock status from a product page",
)
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `visibility`: Optional. Action visibility, `"private"` or `"public"`.
  Default: `"private"`.
- `website_url` (call-time): The site to build an action for.
- `goal` (call-time): What the action should do or extract.
- `catalog_id` (call-time): Optional. Attach to an existing catalog.
- `force` (call-time): Optional. Build even if similar actions already
  exist for the domain. Default: `False`.
