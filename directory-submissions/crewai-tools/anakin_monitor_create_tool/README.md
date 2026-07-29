# AnakinMonitorCreateTool

## Description

Creates a scheduled [Anakin](https://anakin.io) website monitor that checks
a URL every `interval_minutes` (min 15) and records a change when the
content differs — optionally alerting a webhook or email. `scope: "page"`
(default) watches one URL; `"site"` crawls the site each run; `"wire"` runs
a Wire action each check and diffs its JSON. This creates a recurring,
credit-billed job.

This tool calls the Anakin REST API directly (`POST /monitors`) — website
monitoring is not yet part of `anakin-sdk`. The response's
`alertWebhookSecret` (an HMAC signing secret) is redacted before it reaches
the agent — retrieve the real value from the Anakin dashboard.

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
from crewai_tools import AnakinMonitorCreateTool

tool = AnakinMonitorCreateTool(
    config={
        "watchMode": "specific_data",
        "outputSchema": {"type": "object", "properties": {"price": {"type": "number"}}},
        "aiGoal": "only when the price drops or it goes out of stock",
    }
)
tool.run(url="https://example-shop.com/product/123", interval_minutes=30)
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `config`: Optional. Extra monitor fields beyond `url`/`interval_minutes`,
  in the API's camelCase (`scope`, `watchMode`, `watchFormat`,
  `outputSchema`, `aiMode`, `aiGoal`, `useBrowser`, `country`, `sessionId`,
  `isActive`, `expiresAt`, `alertWebhookUrl`, `alertEmails`, `maxPages`,
  `maxDepth`, `includePatterns`, `excludePatterns`, `wireActionId`,
  `wireCatalogSlug`, `wireCredentialId`, `wireParams`, `wireWatchPaths`).
- `url` (call-time): The URL to watch.
- `interval_minutes` (call-time): Check frequency in minutes (minimum 15).
