from __future__ import annotations

import os
from typing import Any, Literal
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


class AnakinMonitorControlToolSchema(BaseModel):
    id: str = Field(description="The monitor ID (from AnakinMonitorListTool)")
    action: Literal["pause", "resume", "run_now", "delete"] = Field(
        description="What to do with the monitor"
    )


class AnakinMonitorControlTool(BaseTool):
    """Tool for controlling an existing Anakin website monitor: "pause"
    stops scheduled checks, "resume" restarts them (may hit the plan's
    active-monitor cap), "run_now" triggers an immediate out-of-schedule
    check (billed like a normal check), and "delete" permanently removes the
    monitor and its history. Use AnakinMonitorListTool to find the id. Every
    action mutates the monitor (delete is irreversible). To run this tool,
    you need an Anakin API key — get one free at https://anakin.io/dashboard
    (300 credits, no card required).

    Args:
        api_key (str): Your Anakin API key.
    """

    name: str = "Anakin monitor control tool"
    description: str = (
        "Pause, resume, run immediately, or delete an existing Anakin "
        "website monitor by id"
    )
    args_schema: type[BaseModel] = AnakinMonitorControlToolSchema
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

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key, "Content-Type": "application/json"}

    def _call(self, method: str, path: str) -> Any:
        resp = requests.request(
            method, f"{self.base_url}{path}", headers=self._headers(), timeout=REQUEST_TIMEOUT_S
        )
        if not resp.ok:
            raise RuntimeError(_error_message(method, path, resp))
        return resp.json() if resp.content else {}

    def _run(self, id: str, action: str) -> Any:
        base = f"/monitors/{quote(id)}"
        if action == "pause":
            result = self._call("POST", f"{base}/pause")
        elif action == "resume":
            result = self._call("POST", f"{base}/resume")
        elif action == "run_now":
            result = self._call("POST", f"{base}/run")
        elif action == "delete":
            result = self._call("DELETE", base)
        else:
            raise ValueError(
                f'Unknown monitor action "{action}" — use pause, resume, run_now, or delete.'
            )
        return _redact_secrets(result)
