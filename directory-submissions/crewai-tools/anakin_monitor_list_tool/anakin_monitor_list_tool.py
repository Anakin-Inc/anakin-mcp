from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import requests
from crewai.tools import BaseTool, EnvVar
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://api.anakin.io/v1"
REQUEST_TIMEOUT_S = 30

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


class AnakinMonitorListToolSchema(BaseModel):
    id: str | None = Field(
        default=None,
        description="Monitor ID — fetch just this monitor instead of the full list",
    )


class AnakinMonitorListTool(BaseTool):
    """Tool for listing your Anakin website monitors, or fetching one
    monitor's full configuration and status (next/last check time, active
    state, per-check credit cost, alert settings) by passing id. Use this to
    find a monitor's id before AnakinMonitorChangesTool or
    AnakinMonitorControlTool. To run this tool, you need an Anakin API key —
    get one free at https://anakin.io/dashboard (300 credits, no card
    required).

    Args:
        api_key (str): Your Anakin API key.
    """

    name: str = "Anakin monitor list tool"
    description: str = (
        "List Anakin website monitors, or fetch one monitor's full "
        "configuration and status by id"
    )
    args_schema: type[BaseModel] = AnakinMonitorListToolSchema
    api_key: str | None = None
    base_url: str = DEFAULT_BASE_URL
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

    def _get(self, path: str) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        resp = requests.get(f"{self.base_url}{path}", headers=headers, timeout=REQUEST_TIMEOUT_S)
        if not resp.ok:
            raise RuntimeError(_error_message("GET", path, resp))
        return resp.json() if resp.content else {}

    def _run(self, id: str | None = None) -> Any:
        path = f"/monitors/{quote(id)}" if id else "/monitors"
        return _redact_secrets(self._get(path))
