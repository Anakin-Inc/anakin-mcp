# AnakinAIVisibilitySearchTool

## Description

Asks multiple AI answer engines (ChatGPT, Gemini, Google AI Overview) the
same question via [Anakin](https://anakin.io) and compares their answers.
Returns one result per engine — status, an answer summary, latency, credits
used, and a consensus/outlier verdict — plus an AI-generated synthesis of
where the engines agree and diverge. Use for brand/AI-SEO visibility checks
("what do AI engines say about X"). Submits the search and polls to
completion (typically 1-2 minutes).

This tool calls the Anakin REST API directly
(`POST /ai-visibility/search`, polling `GET /ai-visibility/search/:id`) —
AI visibility is not yet part of `anakin-sdk`.

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
from crewai_tools import AnakinAIVisibilitySearchTool

tool = AnakinAIVisibilitySearchTool(sources=["chatgpt", "gemini"], country="us")
tool.run(query="What is the best headless CMS for a Next.js site?")
```

## Arguments

- `api_key`: Optional. Specifies the Anakin API key. Defaults to the
  `ANAKIN_API_KEY` environment variable.
- `sources`: Optional. Engine slugs to query (see
  `AnakinAIVisibilitySourcesTool`). Omit to query all enabled engines.
- `country`: Optional. Two-letter ISO country for the search geography.
  Default: `"us"`.
- `include_full_content`: Optional. Include each engine's raw full answer
  in the results (large). Default: `False`.
- `query` (call-time): The question to ask every engine (max 2000
  characters).
