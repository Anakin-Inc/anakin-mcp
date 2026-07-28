# Anakin Web Scraper ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Scrape a URL with [Anakin](https://anakin.io) and save the result as a
pipeline artifact.

Turns any website into clean markdown or AI-extracted structured JSON —
useful as an upstream data-collection step feeding a training or evaluation
dataset. Submits the scrape job and polls until it completes or fails.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `str` | *(required)* | The URL to scrape. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `scraped_content` | `dsl.Output[dsl.Dataset]` | `None` | The page's markdown (or generated JSON, if requested) is written here. |
| `generate_json` | `bool` | `False` | AI-extract structured JSON from the page content instead of markdown. |
| `use_browser` | `bool` | `False` | Use a headless browser — best for JS-heavy sites. |

## Metadata 🗂️

- **Name**: anakin_web_scraper
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
