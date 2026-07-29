from __future__ import annotations

import os
from typing import Any

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30

# The API returns each monitor's alertWebhookSecret (an HMAC signing secret).
# A secret that enters an agent transcript is compromised by definition, so
# it is redacted before the result reaches the model — mirrors anakin-mcp's
# redactSecrets() in src/tools/monitor.ts. Retrieve the real value from the
# Anakin dashboard.
_SECRET_KEYS = {"alertWebhookSecret"}
_REDACTED = "[redacted — view in the Anakin dashboard]"


def _redact_secrets(value: Any) -> Any:
    if isinstance(value, list):
        return [_redact_secrets(v) for v in value]
    if isinstance(value, dict):
        return {
            k: (_REDACTED if k in _SECRET_KEYS and v else _redact_secrets(v))
            for k, v in value.items()
        }
    return value


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


class AnakinMonitorCreateToolSchema(BaseModel):
    url: str = Field(
        description=(
            "The URL to watch (root URL for site scope; the Wire site's URL "
            "for wire scope)"
        )
    )
    interval_minutes: int = Field(
        description="Check frequency in minutes. Minimum 15.", ge=15
    )


class AnakinMonitorCreateTool(BaseTool):
    """Tool for creating a scheduled Anakin website monitor that checks a URL
    every interval_minutes (min 15) and records a change when the content
    differs — optionally alerting a webhook or email. scope "page" (default)
    watches one URL; "site" crawls the site each run and tracks pages
    added/removed/changed; "wire" runs a Wire action each check and diffs
    its JSON. watch_mode "full_page" (2 credits/check) compares the whole
    page; "specific_data" (3 credits/check) extracts only the fields in
    output_schema with AI — ideal for price/stock/status tracking. Creates a
    recurring, credit-billed job. Active-monitor caps per plan: Free 5,
    Pro 20, Scale 100. To run this tool, you need an Anakin API key — get
    one free at https://anakin.io/dashboard (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
        config (dict): Optional extra monitor fields beyond url/interval, in
            the API's camelCase — e.g. {"scope": "site", "watchMode":
            "specific_data", "outputSchema": {...}, "aiMode": True, "aiGoal":
            "...", "useBrowser": True, "country": "us", "sessionId": "...",
            "alertWebhookUrl": "...", "alertEmails": "a@b.com,c@d.com",
            "maxPages": 20, "includePatterns": [...], "wireActionId": "..."}.
            See the Anakin API docs for the full field list.
    """

    name: str = "Anakin monitor create tool"
    description: str = (
        "Create a scheduled Anakin website monitor that checks a URL on an "
        "interval and records changes, optionally alerting a webhook/email"
    )
    args_schema: type[BaseModel] = AnakinMonitorCreateToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
    config: dict[str, Any] = Field(default_factory=dict)
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

    def _post(self, path: str, body: dict[str, Any]) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        resp = requests.post(
            f"{self.base_url}{path}", headers=headers, json=body, timeout=REQUEST_TIMEOUT_S
        )
        if not resp.ok:
            raise RuntimeError(_error_message("POST", path, resp))
        return resp.json() if resp.content else {}

    def _run(self, url: str, interval_minutes: int) -> Any:
        body: dict[str, Any] = {"url": url, "intervalMinutes": interval_minutes}
        body.update(self.config)
        result = self._post("/monitors", body)
        return _redact_secrets(result)
