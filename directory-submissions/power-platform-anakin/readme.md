# Anakin (Independent Publisher)
Anakin turns any website into clean markdown or AI-extracted structured JSON — web scraping, AI-powered search, and multi-stage agentic research over hundreds of popular sites.

## Publisher: Anakin

## Prerequisites
To use this connector you must have an Anakin account.

## Obtaining Credentials
Get a free API key at [anakin.io/dashboard](https://anakin.io/dashboard) — 300 credits, no card required.

## Supported Operations
### Extract Website Data
Submit a URL to scrape. Returns a job ID — poll with Get Scrape Result.
### Get Scrape Result
Fetch the status and results of a scrape job.
### Perform AI Search
AI-powered web search with citations. Synchronous — no polling needed.
### Start Agentic Search
Start a multi-stage AI research pipeline: search, scrape citations, extract structured data. Returns a job ID — poll with Get Agentic Search Result.
### Get Agentic Search Result
Fetch the status and results of an agentic search job.

## Known Issues and Limitations
Extract Website Data and Start Agentic Search are asynchronous — add a Delay action between submitting and polling for results, since Power Automate doesn't poll automatically.
