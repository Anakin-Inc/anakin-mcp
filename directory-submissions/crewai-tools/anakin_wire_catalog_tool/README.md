# AnakinWireCatalogTool

## Description

Browse the [Anakin Wire](https://anakin.io) catalog. With no arguments,
lists every supported website and its action count. Pass a catalog `slug`
(e.g. `"walmart"`) to get that site's full action list with exact parameter
schemas, each action's type (read/write), auth mode (none/optional/required),
and credit cost.

This tool calls the Anakin REST API directly (`GET /wire/catalog[/:slug]`) —
Wire catalog browsing is not yet part of `anakin-sdk`.

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
from crewai_tools import AnakinWireCatalogTool

tool = AnakinWireCatalogTool()
tool.run(slug="walmart")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `slug` (call-time): Optional. Catalog slug to inspect. Omit to list all
  catalogs.
