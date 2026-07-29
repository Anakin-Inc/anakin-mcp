# AnakinWireReadActionTool

## Description

[Anakin Wire](https://anakin.io) is a catalog of pre-built automation actions
across hundreds of websites (Amazon, Walmart, LinkedIn, Airbnb, Zillow, and
others). This tool runs a Wire **read** action — one that extracts data
without changing state on the target site (search listings, fetch a
category's products, get a product's price/specs/reviews, read a profile,
pull dashboard metrics). Discover `action_id`s with `AnakinWireDiscoverTool`
or `AnakinWireCatalogTool` first. For state-changing actions use
`AnakinWireWriteActionTool` instead.

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
from crewai_tools import AnakinWireReadActionTool

tool = AnakinWireReadActionTool()
tool.run(action_id="walmart.search_products", params={"query": "espresso machine"})
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `action_id` (call-time): The Wire action to run.
- `params` (call-time): The action's input parameters, matching its schema
  from discovery.

## Known limitation

Most read actions need no authentication. For the minority that do, Wire's
`credential_id`/`identity_id` override is not yet exposed by `anakin-sdk`
v0.1.0's `wire()` method — auth-required actions run against whatever
identity is connected in the Anakin dashboard, and fail with an
`AUTH_REQUIRED` error if none is connected.
