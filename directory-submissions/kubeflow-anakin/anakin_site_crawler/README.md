# Anakin Site Crawler ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Bulk-fetch markdown across a site with [Anakin](https://anakin.io).

Use when a downstream step needs the contents of many pages at once (catalog ingestion, site-wide RAG corpus). Pair with the include/exclude pattern parameters to scope which URLs are fetched. Submits the job and polls until it completes or fails.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `str` | *(required)* | Starting URL. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `crawled_pages` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{url, totalPages, completedPages, pages[], durationMs}` is written here. |
| `max_pages` | `int` | `10` | Hard cap on pages fetched. |
| `depth` | `int` | `1` | Link-hops from the starting URL to follow. |
| `country` | `str` | `"us"` | Two-letter proxy egress country code. |
| `use_browser` | `bool` | `False` | Render each page in a headless browser -- for SPAs. |
| `include_patterns_csv` | `str` | `""` | Comma-separated glob/regex patterns; only matching URLs are fetched. |
| `exclude_patterns_csv` | `str` | `""` | Comma-separated glob/regex patterns; matching URLs are skipped. |
| `session_id` | `str` | `""` | Optional saved-browser-session ID for login-protected sites. |

## Metadata 🗂️

- **Name**: anakin_site_crawler
- **Stability**: alpha
- **Dependencies**:
  - Kubeflow:
    - Name: Pipelines, Version: >=2.15.2
  - External Services:
    - Name: Anakin API, Version: v1
- **Tags**:
  - data_processing
  - web_scraping
  - data_collection
- **Owners**:
  - Approvers: *(fill in with the submitting account's GitHub handle)*

## Additional Resources 📚

- **Docs**: [https://anakin.io/docs](https://anakin.io/docs)
- **Get an API key**: [https://anakin.io/dashboard](https://anakin.io/dashboard)
