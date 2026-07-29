# Anakin Site Mapper ✨

> ⚠️ **Stability: alpha** — This asset is not yet stable and may change.

## Overview 🧾

Discover all reachable URLs under a site with [Anakin](https://anakin.io) -- sitemap + link traversal.

Useful for understanding a domain's structure before crawling, or for fanning out the sub-pages a downstream `anakin_web_scraper` / `anakin_site_crawler` step should fetch. Submits the job and polls until it completes or fails.

## Inputs 📥

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `str` | *(required)* | The starting URL for discovery. |
| `api_key` | `str` | *(required)* | Anakin API key. Get a free one at [anakin.io/dashboard](https://anakin.io/dashboard) (300 credits, no card required). |
| `site_map` | `dsl.Output[dsl.Dataset]` | `None` | JSON `{url, links, totalLinks, externalLinks, totalExternalLinks, durationMs}` is written here. |
| `limit` | `int` | `100` | Maximum number of URLs to return overall. |
| `depth` | `int` | `2` | How many link-hops from the starting URL to follow. |
| `limit_per_level` | `int` | `100` | Maximum URLs collected per depth level. |
| `include_subdomains` | `bool` | `False` | Include URLs on subdomains of the starting host. |
| `include_external_links` | `bool` | `False` | Also collect (but do not follow) external links. |
| `use_browser` | `bool` | `False` | Render with a headless browser -- best for SPAs. |
| `search` | `str` | `""` | Optional keyword filter on URL path/title. Empty means no filter. |

## Metadata 🗂️

- **Name**: anakin_site_mapper
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
