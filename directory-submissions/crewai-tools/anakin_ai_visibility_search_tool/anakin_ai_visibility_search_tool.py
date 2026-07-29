from __future__ import annotations

import os
import time
from typing import Any
from urllib.parse import quote

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30
POLL_INTERVAL_S = 3
POLL_MAX_ATTEMPTS = 60  # 3 minutes total, matching anakin-mcp's client.ts


def _error_message(method: str, path: str, resp: requests.Response) -> str:
    message = f"{method} {path} failed ({resp.status_code})"
    try:
        body = resp.json()
    except ValueError:
        return message
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict) and isinstance(err.get("message"), str):
        return err["message"]
    if isinstance(err, str):
        return err
    return message


class AnakinAIVisibilitySearchToolSchema(BaseModel):
    query: str = Field(
        description="The question to ask every engine (max 2000 characters)", max_length=2000
    )


class AnakinAIVisibilitySearchTool(BaseTool):
    """Tool for asking multiple AI answer engines (ChatGPT, Gemini, Google AI
    Overview) the same question and comparing their answers, via the Anakin
    API. Returns one result per engine — status, an answer summary, latency,
    credits used, and a consensus/outlier verdict — plus an AI-generated
    synthesis of where the engines agree and diverge. Use for brand/AI-SEO
    visibility checks ("what do AI engines say about X"), answer comparison,
    and geo-specific AI answers. Billed per source at that Wire action's
    rate; failed sources are free. Submits the search and polls to
    completion (typically 1-2 minutes; a failed run still returns whatever
    sources did answer). To run this tool, you need an Anakin API key — get
    one free at https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        sources (list[str]): Engine slugs to query (see
            AnakinAIVisibilitySourcesTool). Omit to query all enabled
            engines.
        country (str): Two-letter ISO country for the search geography
            (proxy exit). Default: "us".
        include_full_content (bool): Include each engine's raw full answer
            in the results (large). Default: False — summaries and the
            synthesis are returned regardless.
    """

    name: str = "Anakin AI visibility search tool"
    description: str = (
        "Ask multiple AI answer engines the same question and compare their "
        "answers via Anakin, returning per-engine results and a synthesis"
    )
    args_schema: type[BaseModel] = AnakinAIVisibilitySearchToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
    sources: list[str] = Field(default_factory=list)
    country: str = "us"
    include_full_content: bool = False
    env_vars: list[EnvVar] = Field(
        default_factory=lambda: [
            EnvVar(
                name="ANAKIN_API_KEY",
                description="API key for Anakin services",
                required=True,
            ),
        ]
    )

    def __init__(self, api_key: str | None = None, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("ANAKIN_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Anakin API key not found. Pass api_key or set the ANAKIN_API_KEY "
                "environment variable. Get a free key at https://anakin.io/dashboard."
            )

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key, "Content-Type": "application/json"}

    def _get(self, path: str) -> Any:
        resp = requests.get(f"{self.base_url}{path}", headers=self._headers(), timeout=REQUEST_TIMEOUT_S)
        if not resp.ok:
            raise RuntimeError(_error_message("GET", path, resp))
        return resp.json() if resp.content else {}

    def _post(self, path: str, body: dict[str, Any]) -> Any:
        resp = requests.post(
            f"{self.base_url}{path}", headers=self._headers(), json=body, timeout=REQUEST_TIMEOUT_S
        )
        if not resp.ok:
            raise RuntimeError(_error_message("POST", path, resp))
        return resp.json() if resp.content else {}

    def _run(self, query: str) -> Any:
        body: dict[str, Any] = {"query": query}
        if self.sources:
            body["sources"] = self.sources
        if self.country:
            body["country"] = self.country

        submitted = self._post("/ai-visibility/search", body)
        search_id = submitted.get("search_id") or submitted.get("id")
        if not search_id:
            raise RuntimeError(
                f"Anakin API response did not include a search_id: {submitted!r}"
            )

        path = f"/ai-visibility/search/{quote(search_id)}"
        search = submitted
        for _ in range(POLL_MAX_ATTEMPTS):
            search = self._get(path)
            if search.get("status") != "running":
                break
            time.sleep(POLL_INTERVAL_S)
        else:
            raise TimeoutError(
                f"AI visibility search {search_id} timed out after 3 minutes; "
                "poll it later via the dashboard or retry"
            )

        results = search.get("results") or []
        if not self.include_full_content:
            results = [{k: v for k, v in r.items() if k != "full_content"} for r in results]

        return {
            "search_id": search.get("search_id", search_id),
            "status": search.get("status"),
            "country": search.get("country"),
            "synthesis": search.get("synthesis"),
            "results": results,
        }
