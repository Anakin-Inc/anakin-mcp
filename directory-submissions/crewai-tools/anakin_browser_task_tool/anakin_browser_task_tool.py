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
# Browser AI tasks are hard-capped server-side at ~330s, so the poll window
# must outlast the longest legitimate run — matches anakin-mcp's client.ts.
POLL_MAX_ATTEMPTS = 120  # 6 minutes total

# Never execute payments or asset transfers — the hosted Anakin API rejects
# such actions server-side, but this tool refuses obviously financial
# requests up front too, matching anakin-mcp's browser_task (see
# src/tools/policy.ts financialBlockReason).
_FINANCIAL_KEYWORDS = (
    "checkout",
    "place order",
    "purchase",
    "pay ",
    "payment",
    "wire transfer",
    "send money",
    "transfer funds",
    "buy now",
)


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


class AnakinBrowserTaskToolSchema(BaseModel):
    prompt: str = Field(
        description=(
            "The task in natural language. Be specific about the goal and what "
            "to return. Never include passwords or secrets — use session_id "
            "(constructor arg) for authenticated sites."
        )
    )


class AnakinBrowserTaskTool(BaseTool):
    """Tool for running a natural-language task in a real cloud browser
    driven by an AI agent via the Anakin API: it navigates, clicks, types,
    scrolls, and extracts on your behalf ("find the cheapest 65-inch TV on
    this site and list its specs"). Use when scraping cannot do the job
    (multi-step flows, interactions, complex navigation) and no Wire action
    covers the site. Runs up to ~5 minutes and this tool polls to
    completion. Does not execute payments or transfer funds — such tasks are
    refused. To run this tool, you need an Anakin API key — get one free at
    https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        url (str): Navigate here before starting. Omit to let the agent
            follow URLs named in the prompt.
        session_id (str): Saved browser-session ID (from
            AnakinSessionListTool) so the task runs logged in. Never put
            passwords in the prompt.
        max_steps (int): Cap on agent steps (navigation/click/type
            actions).
        timeout_ms (int): Task timeout in milliseconds (server caps runs at
            ~330s regardless).
        output_schema (dict): JSON Schema for the result — the agent returns
            structured data conforming to it.
    """

    name: str = "Anakin browser task tool"
    description: str = (
        "Run a natural-language task in a real AI-driven cloud browser via "
        "Anakin (navigate, click, type, extract). Never executes payments."
    )
    args_schema: type[BaseModel] = AnakinBrowserTaskToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
    url: str | None = None
    session_id: str | None = None
    max_steps: int | None = None
    timeout_ms: int | None = None
    output_schema: dict[str, Any] | None = None
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

    def _run(self, prompt: str) -> Any:
        haystack = f"{prompt} {self.url or ''}".lower()
        if any(keyword in haystack for keyword in _FINANCIAL_KEYWORDS):
            raise ValueError(
                "Refused: this task looks like a payment or fund transfer. "
                "Anakin browser tasks do not execute financial transactions."
            )

        body: dict[str, Any] = {"prompt": prompt, "async": True}
        if self.url:
            body["url"] = self.url
        if self.session_id:
            body["session_id"] = self.session_id
        if self.max_steps is not None:
            body["max_steps"] = self.max_steps
        if self.timeout_ms is not None:
            body["timeout_ms"] = self.timeout_ms
        if self.output_schema:
            body["output_schema"] = self.output_schema

        accepted = self._post("/ai/evaluate", body)
        workflow_id = accepted.get("workflow_id")
        if not workflow_id:
            # Service answered synchronously (shouldn't happen with async: true).
            return accepted

        path = f"/ai/jobs/{quote(workflow_id)}"
        job: dict[str, Any] = {}
        for _ in range(POLL_MAX_ATTEMPTS):
            job = self._get(path)
            status = job.get("status")
            if status == "completed":
                result = job.get("result")
                return result if result is not None else job
            if status in ("failed", "timed_out"):
                raise RuntimeError(
                    f"Browser task {status}: {job.get('error', 'unknown')}"
                )
            time.sleep(POLL_INTERVAL_S)

        raise TimeoutError("Browser task timed out after 6 minutes of polling")
