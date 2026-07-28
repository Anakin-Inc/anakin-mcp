"""Syncs AI search results from Anakin (https://anakin.io) for a configured
search prompt. Anakin turns any website into clean markdown or AI-extracted
structured JSON — this connector covers the synchronous /v1/search endpoint;
see README.md for why scrape/crawl (async job endpoints) aren't included in
this first pass.
"""

import json

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

BASE_URL = "https://api.anakin.io/v1"


def validate_configuration(configuration: dict):
    """Ensure required configuration values are present.

    Args:
        configuration: a dictionary that holds the configuration settings for the connector.
    Raises:
        ValueError: if any required configuration parameter is missing.
    """
    required_configs = ["api_key", "search_prompt"]
    for key in required_configs:
        if key not in configuration:
            raise ValueError(f"Missing required configuration value: {key}")


def schema(configuration: dict):
    """Define the schema this connector delivers — one table, one row per
    search result returned for the configured prompt.

    Args:
        configuration: a dictionary that holds the configuration settings for the connector.
    """
    return [
        {
            "table": "search_results",
            "primary_key": ["url"],
            "columns": {
                "url": "STRING",
                "title": "STRING",
                "snippet": "STRING",
                "date": "STRING",
                "last_updated": "STRING",
            },
        },
    ]


def update(configuration: dict, state: dict):
    """Run one Anakin AI search per sync and upsert the results.

    Anakin's search endpoint is synchronous (no polling) and stateless per
    call — there's no natural "since last sync" cursor for a search query,
    so every sync re-runs the search and upserts the current result set
    (primary-keyed on `url`, so re-running is idempotent, not duplicative).

    Args:
        configuration: A dictionary containing connection details
        state: A dictionary containing state information from previous runs
    """
    validate_configuration(configuration=configuration)

    api_key = configuration.get("api_key")
    search_prompt = configuration.get("search_prompt")
    limit = int(configuration.get("search_limit", 5))

    try:
        response = requests.post(
            f"{BASE_URL}/search",
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            json={"prompt": search_prompt, "limit": limit},
            timeout=30,
        )
        response.raise_for_status()
        body = response.json()
        results = body.get("results", [])

        log.info(f"Processing {len(results)} result(s)")

        for record in results:
            op.upsert(table="search_results", data=record)

        op.checkpoint({"last_search_id": body.get("id")})
        log.info(f"Data synced successfully. Search id: {body.get('id')}")

    except requests.RequestException as e:
        raise RuntimeError(f"Failed to sync data from Anakin: {str(e)}")


connector = Connector(update=update, schema=schema)

if __name__ == "__main__":
    with open("configuration.json", "r") as f:
        configuration = json.load(f)
    connector.debug(configuration=configuration)
