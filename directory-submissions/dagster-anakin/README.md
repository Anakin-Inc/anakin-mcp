# dagster-anakin

Dagster integration with [Anakin](https://anakin.io) — web scraping, AI
search, and multi-stage agentic research over hundreds of popular sites.

## Install

```sh
pip install dagster-anakin
```

## Usage

```python
from dagster import AssetExecutionContext, Definitions, EnvVar, asset
from dagster_anakin import AnakinResource


@asset(compute_kind="anakin")
def scraped_page(context: AssetExecutionContext, anakin: AnakinResource):
    with anakin.get_client() as client:
        doc = client.scrape("https://example.com")
        return doc.markdown


defs = Definitions(
    assets=[scraped_page],
    resources={"anakin": AnakinResource(api_key=EnvVar("ANAKIN_API_KEY"))},
)
```

Get a free API key at [anakin.io/dashboard](https://anakin.io/dashboard) —
300 credits, no card required.

## Test

```sh
make test
```

## Build

```sh
make build
```
